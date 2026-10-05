import type { Request, Response, NextFunction } from "express";
import { qrService } from "../../modeles/qr/qr.service.js";
import { SuccessResponse } from "../../utils/response.util.js";
import { statusCode } from "../../types/types.js";
import { createQRCodeSchema, updateQRCodeSchema } from "../../modeles/qr/qr.validation.js";

export class QRController {
  /**
   * GET /api/v1/qr/active
   * Retrieves the current primary / active payment QR code for bookings
   */
  async getActiveQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const qr = await qrService.getActiveQRCode();
      return SuccessResponse(res, "Active payment QR retrieved successfully", qr);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/qr/admin/all
   * Retrieves all QR codes for the admin dashboard
   */
  async getAllQRCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const qrs = await qrService.getAllQRCodes();
      return SuccessResponse(res, "All QR codes retrieved successfully", qrs);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/qr/admin/:id
   * Retrieves a single QR code by ID
   */
  async getQRCodeById(req: Request, res: Response, next: NextFunction) {
    try {
      const qr = await qrService.getQRCodeById(req.params.id as string);
      return SuccessResponse(res, "QR code retrieved successfully", qr);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/qr/admin
   * Uploads and creates a new QR code
   */
  async createQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      let imageUrl = req.body.imageUrl;
      if (req.file) {
        const { uploadImages } = await import("../../utils/upload.util.js");
        const [uploaded] = await uploadImages([req.file], "garba/qr_codes");
        if (uploaded?.url) {
          imageUrl = uploaded.url;
        }
      }
      const payload = { ...req.body, imageUrl };
      const validated = createQRCodeSchema.parse(payload);
      const newQR = await qrService.createQRCode(validated);
      return SuccessResponse(res, "QR code created successfully", newQR, statusCode.Created);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/qr/admin/:id
   * Updates an existing QR code
   */
  async updateQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      let imageUrl = req.body.imageUrl;
      if (req.file) {
        const { uploadImages } = await import("../../utils/upload.util.js");
        const [uploaded] = await uploadImages([req.file], "garba/qr_codes");
        if (uploaded?.url) {
          imageUrl = uploaded.url;
        }
      }
      const payload = { ...req.body, ...(imageUrl ? { imageUrl } : {}) };
      const validated = updateQRCodeSchema.parse(payload);
      const updated = await qrService.updateQRCode(req.params.id as string, validated);
      return SuccessResponse(res, "QR code updated successfully", updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/qr/admin/:id/primary
   * Sets this QR code as the active/primary payment QR
   */
  async setPrimaryQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await qrService.setPrimaryQRCode(req.params.id as string);
      return SuccessResponse(res, "QR code set as primary successfully", updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/qr/admin/:id
   * Deletes a QR code
   */
  async deleteQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await qrService.deleteQRCode(req.params.id as string);
      return SuccessResponse(res, "QR code deleted successfully", deleted);
    } catch (err) {
      next(err);
    }
  }
}

export const qrController = new QRController();
