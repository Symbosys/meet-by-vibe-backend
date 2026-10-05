import { Router } from "express";
import { qrController } from "./qr.controller.js";
import { upload } from "../../middlewares/upload.middleware.js";

const router = Router();

// GET active/primary payment QR code (Public / Booking flow)
router.get("/active", qrController.getActiveQRCode.bind(qrController));

// Admin & general routes for QR code retrieval
router.get("/admin/all", qrController.getAllQRCodes.bind(qrController));
router.get("/all", qrController.getAllQRCodes.bind(qrController));
router.get("/", qrController.getAllQRCodes.bind(qrController));

// Single QR details
router.get("/admin/:id", qrController.getQRCodeById.bind(qrController));
router.get("/:id", qrController.getQRCodeById.bind(qrController));

// Create / Upload QR Code (Supports multipart file and base64/URL JSON payload)
router.post("/admin", upload.single("image"), qrController.createQRCode.bind(qrController));
router.post("/upload", upload.single("image"), qrController.createQRCode.bind(qrController));
router.post("/", upload.single("image"), qrController.createQRCode.bind(qrController));

// Update QR Code
router.patch("/admin/:id", upload.single("image"), qrController.updateQRCode.bind(qrController));
router.patch("/:id", upload.single("image"), qrController.updateQRCode.bind(qrController));

// Set Primary QR Code
router.patch("/admin/:id/primary", qrController.setPrimaryQRCode.bind(qrController));
router.patch("/:id/primary", qrController.setPrimaryQRCode.bind(qrController));

// Delete QR Code
router.delete("/admin/:id", qrController.deleteQRCode.bind(qrController));
router.delete("/:id", qrController.deleteQRCode.bind(qrController));

export default router;
