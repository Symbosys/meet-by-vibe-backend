import { Router } from "express";
import { authController } from "./auth.controller.js";

const router = Router();


// POST /api/v1/auth/admin/verify-pin
router.post("/admin/verify-pin", authController.verifyAdminPin);

export default router;
