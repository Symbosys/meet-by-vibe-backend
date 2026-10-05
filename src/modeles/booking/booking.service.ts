import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { 
  generateUpiQrCode, 
  generateBookingCode 
} from "../../utils/payment-qr.util.js";
import { uploadImages } from "../../utils/upload.util.js";
import { ErrorResponse } from "../../utils/response.util.js";
import { statusCode } from "../../types/types.js";
import type { z } from "zod";
import type { 
  initiateBookingSchema, 
  submitPaymentProofSchema, 
  updateBookingStatusSchema,
  queryBookingsSchema 
} from "./booking.validation.js";

const DEFAULT_MERCHANT_VPA = process.env.MERCHANT_UPI_ID || "garbamitra.pay@okaxis";
const QR_EXPIRY_MINUTES = 15;

export class BookingService {
  /**
   * Check for slot collisions to prevent double-booking a performer
   */
  async checkSlotCollision(performerId: string, bookingDate: Date, start: Date, end: Date) {
    const now = new Date();

    // Collision condition: Booking is either CONFIRMED/PAYMENT_VERIFIED OR active PENDING (within 15 mins)
    const conflicting = await prisma.booking.findFirst({
      where: {
        performerId,
        bookingDate,
        OR: [
          { status: { in: ["CONFIRMED", "PAYMENT_VERIFIED", "IN_PROGRESS"] } },
          {
            status: "PENDING",
            expiresAt: { gt: now },
          },
        ],
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } },
        ],
      },
      select: { id: true, bookingCode: true, startTime: true, endTime: true, status: true },
    });

    return conflicting;
  }

  /**
   * Initiate booking, calculate total amount, lock slot, and generate dynamic UPI QR code
   */
  async initiateBooking(data: z.infer<typeof initiateBookingSchema>) {
    // 1. Verify Performer
    const performer = await prisma.user.findUnique({ where: { id: data.performerId } });
    if (!performer) {
      throw new ErrorResponse("Performer not found", statusCode.Not_Found);
    }
    if (!performer.isAvailable) {
      throw new ErrorResponse("Performer is currently unavailable for bookings", statusCode.Conflict);
    }

    // Resolve or Auto-Create Customer account for seamless bookings
    let customer = data.customerId ? await prisma.user.findUnique({ where: { id: data.customerId } }) : null;
    if (!customer) {
      customer = await prisma.user.findFirst({
        where: {
          OR: [{ email: data.email }, { phone: data.phone }],
        },
      });
    }

    if (!customer) {
      const { hashPassword } = await import("../../utils/password.util.js");
      const defaultHash = await hashPassword("Customer@123");
      customer = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          avatarUrl: data.avatarUrl || null,
          passwordHash: defaultHash,
          gender: data.gender,
          role: "CUSTOMER",
          address: data.address,
          city: data.city || "Ahmedabad",
          state: "Gujarat",
        },
      });
    } else if (data.avatarUrl) {
      customer = await prisma.user.update({
        where: { id: customer.id },
        data: {
          avatarUrl: data.avatarUrl,
          name: data.name,
          gender: data.gender,
          address: data.address,
        },
      });
    }

    // 2. Parse & validate dates
    const bDate = new Date(data.bookingDate);
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (start >= end) {
      throw new ErrorResponse("Slot start time must be before end time", statusCode.Bad_Request);
    }

    const durationMillis = end.getTime() - start.getTime();
    const durationHours = parseFloat((durationMillis / (1000 * 60 * 60)).toFixed(2));

    if (durationHours < 0.5) {
      throw new ErrorResponse("Minimum booking duration is 30 minutes (0.5 hr)", statusCode.Bad_Request);
    }

    // 3. Check for double booking
    const conflict = await this.checkSlotCollision(data.performerId, bDate, start, end);
    if (conflict) {
      throw new ErrorResponse(
        `This time slot overlaps with an existing booking (${conflict.bookingCode}). Please choose another time.`,
        statusCode.Conflict
      );
    }

    // 4. Calculate Financials
    const hourlyRate = performer.hourlyRate ? Number(performer.hourlyRate) : 1000;
    const totalAmount = parseFloat((durationHours * hourlyRate).toFixed(2));
    const advanceAmount = totalAmount; // 100% advance or customizable

    const bookingCode = generateBookingCode();
    const transactionRef = `TXN-${bookingCode}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000);

    // 5. Generate Dynamic UPI QR Code (using active platform QR config if available)
    let payeeVpa = DEFAULT_MERCHANT_VPA;
    let payeeName = "GarbaMitra Platform";

    let activeQrImageUrl: string | null = null;
    let activePaymentMethod: "UPI_QR_STATIC" | "UPI_QR_DYNAMIC" | null = null;

    try {
      const activeQR = (await prisma.qRCode.findFirst({
        where: { isActive: true, isPrimary: true },
      })) || (await prisma.qRCode.findFirst({
        where: { isActive: true },
      }));

      if (activeQR) {
        if (activeQR.upiId) payeeVpa = activeQR.upiId;
        if (activeQR.accountHolderName) payeeName = activeQR.accountHolderName;
        if (activeQR.imageUrl) {
          activeQrImageUrl = activeQR.imageUrl;
          activePaymentMethod = "UPI_QR_STATIC";
        }
      }
    } catch {
      // fallback to DEFAULT_MERCHANT_VPA
    }

    const { upiPayload, qrCodeDataUrl } = await generateUpiQrCode({
      vpa: payeeVpa,
      payeeName,
      amount: totalAmount,
      transactionRef,
      transactionNote: `Booking for ${performer.name} - ${bookingCode}`,
      currency: "INR",
    });

    const finalQrCodeUrl = activeQrImageUrl || qrCodeDataUrl;

    // 6. Create Booking and Payment atomically in a transaction
    const [booking, payment] = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          gender: data.gender,
          customerId: customer.id,
          performerId: data.performerId,
          bookingDate: bDate,
          startTime: start,
          endTime: end,
          durationHours,
          eventAddress: data.eventAddress || null,
          city: data.city || performer.city || null,
          notes: data.notes || null,
          hourlyRate,
          totalAmount,
          advanceAmount,
          status: "PENDING",
          expiresAt,
        },
      });

      const newPayment = await tx.payment.create({
        data: {
          bookingId: newBooking.id,
          amount: totalAmount,
          currency: "INR",
          paymentMethod: data.paymentMethod || activePaymentMethod || "UPI_QR_DYNAMIC",
          paymentStatus: "PENDING",
          qrCodeUrl: finalQrCodeUrl,
          upiPayload,
          transactionRef,
          expiresAt,
        },
      });

      return [newBooking, newPayment];
    });

    return {
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        name: booking.name,
        bookingDate: data.bookingDate,
        durationHours: booking.durationHours,
        totalAmount: booking.totalAmount,
        status: booking.status,
        expiresAt: booking.expiresAt,
      },
      performer: {
        id: performer.id,
        name: performer.name,
        hourlyRate: performer.hourlyRate,
        upiId: performer.upiId,
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        transactionRef: payment.transactionRef,
        upiPayload: payment.upiPayload,
        qrCodeUrl: payment.qrCodeUrl, // Base64 QR code to display in frontend
        expiresAt: payment.expiresAt,
      },
    };
  }

  /**
   * Submit UTR / Payment proof after scanning QR
   */
  async submitPaymentProof(
    bookingId: string, 
    data: z.infer<typeof submitPaymentProofSchema>,
    proofFile?: Express.Multer.File
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true },
    });

    if (!booking) {
      throw new ErrorResponse("Booking not found", statusCode.Not_Found);
    }

    let screenshotUrl = data.paymentScreenshotUrl || null;
    if (proofFile) {
      const [uploaded] = await uploadImages([proofFile], "garba/payment_proofs");
      screenshotUrl = uploaded?.url || null;
    }

    const latestPayment = booking.payments[booking.payments.length - 1];

    if (latestPayment) {
      await prisma.payment.update({
        where: { id: latestPayment.id },
        data: {
          utrNumber: data.utrNumber,
          paymentScreenshotUrl: screenshotUrl || latestPayment.paymentScreenshotUrl,
          paymentStatus: "SUBMITTED",
        },
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "PAYMENT_VERIFIED" },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
        performer: { select: { id: true, name: true, phone: true, upiId: true, avatarUrl: true } },
        payments: true,
      },
    });

    return updatedBooking;
  }

  /**
   * Update booking status (e.g. Admin/Performer confirms or cancels)
   */
  async updateBookingStatus(bookingId: string, data: z.infer<typeof updateBookingStatusSchema>) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true, performer: true },
    });

    if (!booking) {
      throw new ErrorResponse("Booking not found", statusCode.Not_Found);
    }

    const newStatus = data.status;

    const [updatedBooking] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: newStatus,
          notes: data.notes ? `${booking.notes || ""}\n[Update]: ${data.notes}` : booking.notes,
        },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          performer: { select: { id: true, name: true, phone: true, upiId: true, avatarUrl: true } },
          payments: true,
        },
      }),
      // If confirmed, mark payment SUCCESS
      ...(newStatus === "CONFIRMED" && booking.payments[0]
        ? [
            prisma.payment.update({
              where: { id: booking.payments[0].id },
              data: {
                paymentStatus: "SUCCESS",
                paidAt: new Date(),
              },
            }),
            // Increment performer total bookings done
            prisma.user.update({
              where: { id: booking.performerId },
              data: { totalBookingsDone: { increment: 1 } },
            }),
          ]
        : []),
    ]);

    return updatedBooking;
  }

  /**
   * Get single booking by ID with full details
   */
  async getBookingDetails(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
        },
        performer: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true, hourlyRate: true, upiId: true, city: true },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      throw new ErrorResponse("Booking not found", statusCode.Not_Found);
    }

    return booking;
  }

  /**
   * Query & list all bookings with filters & pagination
   */
  async listBookings(query: z.infer<typeof queryBookingsSchema>) {
    const { status, performerId, customerId, search, date, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (performerId) where.performerId = performerId;
    if (customerId) where.customerId = customerId;
    if (date) where.bookingDate = new Date(date);

    if (search) {
      where.OR = [
        { bookingCode: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
          performer: { select: { id: true, name: true, phone: true, upiId: true, hourlyRate: true, avatarUrl: true } },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get booked & available slots for a performer on a specific date
   */
  async getPerformerSlots(performerId: string, dateStr: string) {
    const bDate = new Date(dateStr);
    const now = new Date();

    const bookings = await prisma.booking.findMany({
      where: {
        performerId,
        bookingDate: bDate,
        OR: [
          { status: { in: ["CONFIRMED", "PAYMENT_VERIFIED", "IN_PROGRESS"] } },
          { status: "PENDING", expiresAt: { gt: now } },
        ],
      },
      select: {
        id: true,
        bookingCode: true,
        startTime: true,
        endTime: true,
        durationHours: true,
        status: true,
      },
      orderBy: { startTime: "asc" },
    });

    return {
      date: dateStr,
      performerId,
      bookedIntervals: bookings.map((b) => ({
        bookingCode: b.bookingCode,
        startTime: b.startTime,
        endTime: b.endTime,
        durationHours: b.durationHours,
        status: b.status,
      })),
    };
  }
}

export const bookingService = new BookingService();
