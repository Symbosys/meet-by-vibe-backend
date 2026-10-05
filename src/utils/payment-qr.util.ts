import QRCode from "qrcode";

export interface GenerateUpiQrOptions {
  vpa: string; // Merchant / Performer UPI ID (e.g. "garbamitra@upi")
  payeeName: string; // e.g. "GarbaMitra"
  amount: number | string; // e.g. 500.00
  transactionRef: string; // e.g. "GBK-TXN-1727938491023"
  transactionNote?: string; // e.g. "Booking for Performer"
  currency?: string; // "INR"
}

export interface UpiQrResult {
  upiPayload: string;
  qrCodeDataUrl: string; // Base64 data URL
}

/**
 * Builds standard NPCI UPI payment deep link URL:
 * upi://pay?pa={vpa}&pn={payeeName}&am={amount}&cu={currency}&tr={transactionRef}&tn={transactionNote}
 */
export function buildUpiPayload(options: GenerateUpiQrOptions): string {
  const params = new URLSearchParams();
  params.set("pa", options.vpa);
  params.set("pn", options.payeeName);
  params.set("am", Number(options.amount).toFixed(2));
  params.set("cu", options.currency || "INR");
  params.set("tr", options.transactionRef);
  if (options.transactionNote) {
    params.set("tn", options.transactionNote);
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates a Base64 QR Code image data URL from UPI payload string
 */
export async function generateUpiQrCode(options: GenerateUpiQrOptions): Promise<UpiQrResult> {
  const upiPayload = buildUpiPayload(options);
  
  const qrCodeDataUrl = await QRCode.toDataURL(upiPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return {
    upiPayload,
    qrCodeDataUrl,
  };
}

/**
 * Generates a human-friendly unique booking reference code (e.g. "GBK-202610-A9F2B")
 */
export function generateBookingCode(): string {
  const dateStr = new Date().toISOString().slice(0, 7).replace("-", ""); // "202610"
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `GBK-${dateStr}-${randomSuffix}`;
}
