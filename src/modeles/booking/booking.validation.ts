import { z } from "zod";
import { GenderEnum } from "../user/user.validation.js";

export const BookingStatusEnum = z.enum([
  "PENDING",
  "PAYMENT_VERIFIED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "REJECTED",
]);

export const PaymentMethodEnum = z.enum([
  "UPI_QR_DYNAMIC",
  "UPI_QR_STATIC",
  "GATEWAY_RAZORPAY",
]);

export const initiateBookingSchema = z.object({
  // Performer ID
  performerId: z.string().uuid("Invalid performer ID"),

  // Booker / Client Contact Details
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(3, "Address is required"),
  gender: GenderEnum.default("OTHER"),
  avatarUrl: z.string().optional().nullable(),

  // Slot Timing
  bookingDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid booking date format (expected YYYY-MM-DD)",
  }),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start time timestamp",
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end time timestamp",
  }),

  // Location & notes
  eventAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  
  // Payment Preference
  paymentMethod: PaymentMethodEnum.default("UPI_QR_DYNAMIC").optional(),
});

export const submitPaymentProofSchema = z.object({
  utrNumber: z.string().min(6, "UTR Number must be at least 6 alphanumeric digits"),
  paymentScreenshotUrl: z.string().optional(),
});

export const updateBookingStatusSchema = z.object({
  status: BookingStatusEnum,
  notes: z.string().optional(),
});

export const queryBookingsSchema = z.object({
  status: BookingStatusEnum.optional(),
  performerId: z.string().uuid().optional(),
  search: z.string().optional(),
  date: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});
