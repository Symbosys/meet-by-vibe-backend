import { prisma } from "../../lib/prisma.js";
import { ErrorResponse } from "../../utils/response.util.js";
import { statusCode } from "../../types/types.js";
import type { CreateQRCodeInput, UpdateQRCodeInput } from "../../modeles/qr/qr.validation.js";

export class QRService {
  /**
   * Get the active & primary QR code for customer booking payments
   */
  async getActiveQRCode() {
    // 1. Try to find the primary active QR
    let qr = await prisma.qRCode.findFirst({
      where: { isActive: true, isPrimary: true },
      orderBy: { updatedAt: "desc" }
    });

    // 2. If no primary is explicitly marked, get the latest active QR
    if (!qr) {
      qr = await prisma.qRCode.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" }
      });
    }

    return qr;
  }

  /**
   * Get all QR codes (Admin view)
   */
  async getAllQRCodes() {
    return prisma.qRCode.findMany({
      orderBy: [
        { isPrimary: "desc" },
        { createdAt: "desc" }
      ]
    });
  }

  /**
   * Get a single QR code by ID
   */
  async getQRCodeById(id: string) {
    const qr = await prisma.qRCode.findUnique({
      where: { id }
    });

    if (!qr) {
      throw new ErrorResponse("QR Code not found", statusCode.Not_Found);
    }

    return qr;
  }

  /**
   * Create and upload a new QR code
   */
  async createQRCode(data: CreateQRCodeInput) {
    // If setting as primary, demote other primary QRs
    if (data.isPrimary) {
      await prisma.qRCode.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false }
      });
    }

    return prisma.qRCode.create({
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        upiId: data.upiId,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        isActive: data.isActive ?? true,
        isPrimary: data.isPrimary ?? false,
        description: data.description
      }
    });
  }

  /**
   * Update QR code details
   */
  async updateQRCode(id: string, data: UpdateQRCodeInput) {
    const existing = await prisma.qRCode.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new ErrorResponse("QR Code not found", statusCode.Not_Found);
    }

    // If making this primary, unset other primaries
    if (data.isPrimary) {
      await prisma.qRCode.updateMany({
        where: { id: { not: id }, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    return prisma.qRCode.update({
      where: { id },
      data
    });
  }

  /**
   * Set a specific QR code as primary/active
   */
  async setPrimaryQRCode(id: string) {
    const existing = await prisma.qRCode.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new ErrorResponse("QR Code not found", statusCode.Not_Found);
    }

    // Demote all others
    await prisma.qRCode.updateMany({
      where: { isPrimary: true },
      data: { isPrimary: false }
    });

    // Make this active and primary
    return prisma.qRCode.update({
      where: { id },
      data: {
        isActive: true,
        isPrimary: true
      }
    });
  }

  /**
   * Delete a QR code
   */
  async deleteQRCode(id: string) {
    const existing = await prisma.qRCode.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new ErrorResponse("QR Code not found", statusCode.Not_Found);
    }

    return prisma.qRCode.delete({
      where: { id }
    });
  }
}

export const qrService = new QRService();
