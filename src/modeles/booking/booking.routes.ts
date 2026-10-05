import { Router } from "express";
import { bookingController } from "./booking.controller.js";
import { upload } from "../../middlewares/upload.middleware.js";

const router = Router();

// Initiate booking, lock slot, return dynamic UPI QR code
router.post("/", bookingController.initiateBooking.bind(bookingController));

// Submit UTR or payment proof screenshot
router.post(
  "/:id/payment-proof",
  upload.single("screenshot"),
  bookingController.submitPaymentProof.bind(bookingController)
);

// Get performer booked intervals / free slots for a date
router.get(
  "/performers/:performerId/slots",
  bookingController.getPerformerSlots.bind(bookingController)
);

// Get single booking details
router.get("/:id", bookingController.getBooking.bind(bookingController));

// Update booking status (Confirm, Cancel, Complete)
router.patch("/:id/status", bookingController.updateStatus.bind(bookingController));

// List bookings with status/date/search pagination filters
router.get("/", bookingController.listBookings.bind(bookingController));

export default router;
