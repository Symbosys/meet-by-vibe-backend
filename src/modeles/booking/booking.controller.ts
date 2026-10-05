import type { Request, Response, NextFunction } from "express";
import { bookingService } from "./booking.service.js";
import { SuccessResponse } from "../../utils/response.util.js";
import { statusCode } from "../../types/types.js";
import { 
  initiateBookingSchema, 
  submitPaymentProofSchema, 
  updateBookingStatusSchema, 
  queryBookingsSchema 
} from "./booking.validation.js";

export class BookingController {
  /**
   * POST /api/v1/bookings
   * Initiates booking, checks slot conflict, and returns dynamic UPI QR code.
   */
  async initiateBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = initiateBookingSchema.parse(req.body);
      const result = await bookingService.initiateBooking(validated);
      return SuccessResponse(
        res,
        "Booking initiated successfully. Please scan QR to complete payment within 15 minutes.",
        result,
        statusCode.Created
      );
    } catch (err) {
      next(err);
    }
  }

  
  /**
   * POST /api/v1/bookings/:id/payment-proof
   * Submits 12-digit bank UTR / payment screenshot proof.
   */
  async submitPaymentProof(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = submitPaymentProofSchema.parse(req.body);
      const proofFile = req.file;
      const result = await bookingService.submitPaymentProof(
        req.params.id as string, 
        validated, 
        proofFile
      );
      return SuccessResponse(res, "Payment proof submitted successfully for verification", result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/bookings/:id
   * Get single booking with performer, customer, and QR payment details.
   */
  async getBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bookingService.getBookingDetails(req.params.id as string);
      return SuccessResponse(res, "Booking details fetched successfully", result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/bookings/:id/status
   * Confirm, Complete, or Cancel booking.
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateBookingStatusSchema.parse(req.body);
      const result = await bookingService.updateBookingStatus(req.params.id as string, validated);
      return SuccessResponse(res, "Booking status updated successfully", result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/bookings
   * Query all bookings with status, date, customer, performer filters.
   */
  async listBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = queryBookingsSchema.parse(req.query);
      const result = await bookingService.listBookings(validated);
      return SuccessResponse(res, "Bookings fetched successfully", result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/bookings/performers/:performerId/slots
   * Returns free and booked slots for a given performer and date.
   */
  async getPerformerSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const dateStr = typeof req.query.date === "string" ? req.query.date : (new Date().toISOString().split("T")[0] as string);
      const result = await bookingService.getPerformerSlots(
        req.params.performerId as string, 
        dateStr
      );
      return SuccessResponse(res, "Performer schedule fetched successfully", result);
    } catch (err) {
      next(err);
    }
  }
}

export const bookingController = new BookingController();
