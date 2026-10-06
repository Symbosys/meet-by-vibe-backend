import { z } from "zod";

const emptyToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);
const coerceNumber = (val: unknown) => {
  if (val === "" || val === undefined || val === null) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};
const coerceBoolean = (val: unknown) => {
  if (typeof val === "string") return val.toLowerCase() === "true";
  if (typeof val === "boolean") return val;
  return undefined;
};
const coerceArray = (val: unknown) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split("\n").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

export const createEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  slug: z.preprocess(emptyToUndefined, z.string().optional()),
  description: z.string().min(5, "Description must be at least 5 characters"),
  imageUrl: z.string().min(1, "Event banner image is required"),
  galleryImages: z.preprocess(coerceArray, z.array(z.string()).default([])),
  
  eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid event date format (YYYY-MM-DD or ISO)",
  }),
  endDate: z.preprocess(
    emptyToUndefined,
    z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid end date format",
    })
  ),
  startTime: z.string().min(1, "Start time is required (e.g. 07:30 PM)"),
  endTime: z.preprocess(emptyToUndefined, z.string().optional()),
  
  venue: z.string().min(2, "Venue is required"),
  address: z.preprocess(emptyToUndefined, z.string().optional()),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.preprocess(emptyToUndefined, z.string().optional()),
  latitude: z.preprocess(coerceNumber, z.number().optional()),
  longitude: z.preprocess(coerceNumber, z.number().optional()),
  
  pricePerPass: z.preprocess((val) => (val === "" || val === undefined || val === null ? 0 : Number(val)), z.number().min(0).default(0)),
  totalCapacity: z.preprocess(coerceNumber, z.number().int().positive().optional()),
  
  isFeatured: z.preprocess((val) => (val === undefined ? false : coerceBoolean(val) ?? false), z.boolean().default(false)),
  isActive: z.preprocess((val) => (val === undefined ? true : coerceBoolean(val) ?? true), z.boolean().default(true)),
  status: z.enum(["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).default("UPCOMING"),
  
  organizerId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  organizerName: z.preprocess(emptyToUndefined, z.string().optional()),
  organizerContact: z.preprocess(emptyToUndefined, z.string().optional()),
  
  dressCode: z.preprocess(emptyToUndefined, z.string().optional().default("Traditional Garba Attire")),
  rules: z.preprocess(coerceArray, z.array(z.string()).default([])),
});

export const updateEventSchema = createEventSchema.partial();

export const queryEventsSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  isFeatured: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
  status: z.enum(["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "CANCELLED", "ALL"]).optional(),
  search: z.string().optional(),
  userId: z.string().uuid().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 20)),
});

export const rsvpEventSchema = z.object({
  userId: z.string().uuid("Valid user ID is required"),
  status: z.enum(["GOING", "INTERESTED", "CANCELLED"]).default("GOING"),
  lookingForPartner: z.boolean().default(false),
  passCount: z.number().int().min(1).default(1),
  notes: z.string().optional(),
});

export const toggleFavoriteSchema = z.object({
  userId: z.string().uuid("Valid user ID is required"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type QueryEventsInput = z.infer<typeof queryEventsSchema>;
export type RsvpEventInput = z.infer<typeof rsvpEventSchema>;
export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;
