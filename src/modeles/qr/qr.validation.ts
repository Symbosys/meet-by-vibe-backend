import { z } from "zod";

export const createQRCodeSchema = z.object({
  title: z.string().min(2, "Title is required and must be at least 2 characters"),
  imageUrl: z.string().min(1, "QR image is required (Base64 data or URL)"),
  upiId: z.string().optional(),
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  isActive: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
  description: z.string().optional(),
});

export const updateQRCodeSchema = z.object({
  title: z.string().min(2).optional(),
  imageUrl: z.string().optional(),
  upiId: z.string().optional(),
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  description: z.string().optional(),
});

export type CreateQRCodeInput = z.infer<typeof createQRCodeSchema>;
export type UpdateQRCodeInput = z.infer<typeof updateQRCodeSchema>;
