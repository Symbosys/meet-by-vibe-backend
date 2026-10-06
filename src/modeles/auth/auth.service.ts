import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";
import { statusCode } from "../../types/types.js";
import { ErrorResponse } from "../../utils/response.util.js";

export class AuthService {
  /**
   * Verify the 6-digit admin password/PIN
   */
  async verifyAdminPin(pin: string) {
    if (!pin || typeof pin !== "string") {
      throw new ErrorResponse("Please enter a valid 6-digit PIN", statusCode.Bad_Request);
    }

    const trimmedPin = pin.trim();
    if (trimmedPin.length !== 6) {
      throw new ErrorResponse("PIN must be exactly 6 digits", statusCode.Bad_Request);
    }

    const correctPin = (process.env.ADMIN_PIN || ENV.ADMIN_PIN || "123456").trim();
    if (trimmedPin !== correctPin) {
      throw new ErrorResponse("Invalid admin password. Access denied.", statusCode.Unauthorized);
    }

    // Generate JWT auth token
    const secret = ENV.JWT_SECRET || "garba-admin-secret-key-2026";
    const token = jwt.sign({ role: "ADMIN", access: "FULL" }, secret, { expiresIn: "7d" });

    return {
      authenticated: true,
      token,
      message: "Admin access granted successfully",
    };
  }
}

export const authService = new AuthService();
