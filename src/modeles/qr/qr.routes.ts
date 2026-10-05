import { Router } from "express";
import { qrController } from "./qr.controller.js";
import { upload } from "../../middlewares/upload.middleware.js";

const router = Router();

// GET active/primary payment QR code (Public / Booking flow)
router.get("/active", qrController.getActiveQRCode.bind(qrController));

// Admin routes for QR code management
router.get("/admin/all", qrController.getAllQRCodes.bind(qrController));
router.get("/admin/:id", qrController.getQRCodeById.bind(qrController));
router.post("/admin", upload.single("image"), qrController.createQRCode.bind(qrController));
router.patch("/admin/:id", upload.single("image"), qrController.updateQRCode.bind(qrController));
router.patch("/admin/:id/primary", qrController.setPrimaryQRCode.bind(qrController));
router.delete("/admin/:id", qrController.deleteQRCode.bind(qrController));

export default router;
