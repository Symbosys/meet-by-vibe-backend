import { z } from "zod";

export const RoleEnum = z.enum(["CUSTOMER", "PERFORMER", "ORGANIZER", "ADMIN"]);
export const GenderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
export const SkillLevelEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO", "CHOREOGRAPHER"]);

const arrayPreprocessor = (val: unknown) => {
  if (!val) return undefined;
  if (Array.isArray(val)) {
    return val.map((item) => (typeof item === "object" && item !== null && "imageUrl" in item ? (item as any).imageUrl : String(item))).filter(Boolean);
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === "object" && item !== null && "imageUrl" in item ? (item as any).imageUrl : String(item))).filter(Boolean);
      }
    } catch {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [val];
  }
  return val;
};

const booleanPreprocessor = (val: unknown) => {
  if (val === "true" || val === true || val === 1 || val === "1") return true;
  if (val === "false" || val === false || val === 0 || val === "0") return false;
  return val;
};

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters").default("Garba@123").optional(),
  avatarUrl: z.string().optional().nullable(),
  gender: GenderEnum.default("OTHER"),
  role: RoleEnum.default("PERFORMER"),
  
  // Physical & Personal Details
  height: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().min(50).max(250).optional().nullable()),
  dateOfBirth: z.string().optional().nullable(),
  languages: z.preprocess(arrayPreprocessor, z.array(z.string()).default(["Gujarati", "Hindi"]).optional()),
  
  // Location
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  latitude: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().optional().nullable()),
  longitude: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().optional().nullable()),
  
  // Performer attributes
  bio: z.string().max(1000).optional().nullable(),
  skillLevel: SkillLevelEnum.default("INTERMEDIATE").optional(),
  danceStyles: z.preprocess(arrayPreprocessor, z.array(z.string()).default(["Traditional Garba", "Dodhiya"]).optional()),
  experienceYears: z.preprocess((v) => (v === "" || v === undefined ? 0 : v), z.coerce.number().min(0).max(50).default(0).optional()),
  instagramHandle: z.string().optional().nullable(),
  
  // Booking & Rates
  hourlyRate: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().min(0).optional().nullable()),
  upiId: z.string().optional().nullable(),
  isAvailable: z.preprocess(booleanPreprocessor, z.boolean().default(true).optional()),
  isActive: z.preprocess(booleanPreprocessor, z.boolean().default(true).optional()),
  isVerified: z.preprocess(booleanPreprocessor, z.boolean().default(false).optional()),
  photoUrls: z.preprocess(arrayPreprocessor, z.array(z.string()).optional()),
  photos: z.preprocess(arrayPreprocessor, z.array(z.string()).optional()),
});


export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const queryUsersSchema = z.object({
  search: z.string().optional(),
  role: RoleEnum.optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gender: GenderEnum.optional(),
  skillLevel: SkillLevelEnum.optional(),
  minRate: z.coerce.number().optional(),
  maxRate: z.coerce.number().optional(),
  isAvailable: z.enum(["true", "false"]).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});
