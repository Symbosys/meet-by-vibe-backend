import type { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service.js";
import { SuccessResponse } from "../../utils/response.util.js";
import { statusCode } from "../../types/types.js";

export class AuthController {
  /**
   * POST /api/v1/auth/admin/verify-pin
   * Verify the 6-digit admin security PIN
   */
  async verifyAdminPin(req: Request, res: Response, next: NextFunction) {
    try {
      const { pin } = req.body;
      const result = await authService.verifyAdminPin(pin);
      return SuccessResponse(res, result.message, result, statusCode.OK);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
