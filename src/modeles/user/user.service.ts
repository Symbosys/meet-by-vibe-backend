import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../utils/password.util.js";
import { normalizeEmail, normalizePhone } from "../../utils/normalization.util.js";
import { uploadImages } from "../../utils/upload.util.js";
import { ErrorResponse } from "../../utils/response.util.js";
import { statusCode } from "../../types/types.js";
import type { z } from "zod";
import type { 
  createUserSchema, 
  updateUserSchema, 
  queryUsersSchema 
} from "./user.validation.js";

export class UserService {
  /**
   * CREATE: Create a new User / Performer model
   */
  async create(
    data: z.infer<typeof createUserSchema>,
    avatarFile?: Express.Multer.File,
    photoFiles?: Express.Multer.File[]
  ) {
    const email = normalizeEmail(data.email);
    const phone = normalizePhone(data.phone);

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      throw new ErrorResponse("User with this email or phone already exists", statusCode.Conflict);
    }

    const passwordHash = await hashPassword(data.password || "Garba@123");

    // Handle avatar upload if file provided
    let avatarUrl = data.avatarUrl || null;
    if (avatarFile) {
      const [uploaded] = await uploadImages([avatarFile], "garba/avatars");
      avatarUrl = uploaded?.url || null;
    }

    // Create user in DB
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        phone,
        passwordHash,
        avatarUrl,
        gender: data.gender,
        role: data.role,
        height: data.height ? data.height : null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        languages: data.languages || ["Gujarati", "Hindi"],
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        latitude: data.latitude ? data.latitude : null,
        longitude: data.longitude ? data.longitude : null,
        bio: data.bio || null,
        skillLevel: data.skillLevel || "INTERMEDIATE",
        danceStyles: data.danceStyles || ["Traditional Garba", "Dodhiya"],
        experienceYears: data.experienceYears ?? 0,
        instagramHandle: data.instagramHandle || null,
        hourlyRate: data.hourlyRate ? data.hourlyRate : null,
        upiId: data.upiId || null,
        isAvailable: data.isAvailable ?? true,
        isActive: data.isActive ?? true,
        isVerified: data.isVerified ?? false,
      },
    });

    // Handle multiple gallery photos if provided (at least 5 supported)
    if (photoFiles && photoFiles.length > 0) {
      const uploadedPhotos = await uploadImages(photoFiles, "garba/gallery");
      await prisma.userPhoto.createMany({
        data: uploadedPhotos.map((p, idx) => ({
          userId: user.id,
          imageUrl: p.url,
          publicId: p.publicId,
          caption: `Photo ${idx + 1}`,
          order: idx,
        })),
      });
    }

    return this.getById(user.id);
  }

  /**
   * GET ALL: List & search users/models with multi-filters and pagination
   */
  async getAll(query: z.infer<typeof queryUsersSchema>) {
    const { search, role, city, state, gender, skillLevel, minRate, maxRate, isAvailable, isActive, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) where.role = role;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (state) where.state = { contains: state, mode: "insensitive" };
    if (gender) where.gender = gender;
    if (skillLevel) where.skillLevel = skillLevel;
    if (isAvailable !== undefined) where.isAvailable = isAvailable === "true";
    if (isActive !== undefined) where.isActive = isActive === "true";

    if (minRate !== undefined || maxRate !== undefined) {
      where.hourlyRate = {};
      if (minRate !== undefined) where.hourlyRate.gte = minRate;
      if (maxRate !== undefined) where.hourlyRate.lte = maxRate;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { city: { contains: search, mode: "insensitive" } },
        { bio: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          photos: {
            orderBy: { order: "asc" },
          },
        },
      }),
    ]);

    // Omit password hashes
    const safeUsers = users.map(({ passwordHash: _, ...u }) => u);

    return {
      users: safeUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET BY ID: Fetch single user/model details with photos
   */
  async getById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        photos: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!user) {
      throw new ErrorResponse("User model not found", statusCode.Not_Found);
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * UPDATE: Update user/model details and optional avatar
   */
  async update(
    userId: string,
    data: z.infer<typeof updateUserSchema>,
    avatarFile?: Express.Multer.File
  ) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new ErrorResponse("User model not found", statusCode.Not_Found);
    }

    let avatarUrl = data.avatarUrl !== undefined ? data.avatarUrl : existing.avatarUrl;
    if (avatarFile) {
      const [uploaded] = await uploadImages([avatarFile], "garba/avatars");
      avatarUrl = uploaded?.url || avatarUrl;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name ?? undefined,
        email: data.email ? normalizeEmail(data.email) : undefined,
        phone: data.phone ? normalizePhone(data.phone) : undefined,
        avatarUrl: avatarUrl ?? undefined,
        gender: data.gender ?? undefined,
        role: data.role ?? undefined,
        height: data.height !== undefined ? data.height : undefined,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        languages: data.languages ?? undefined,
        address: data.address !== undefined ? data.address : undefined,
        city: data.city !== undefined ? data.city : undefined,
        state: data.state !== undefined ? data.state : undefined,
        pincode: data.pincode !== undefined ? data.pincode : undefined,
        latitude: data.latitude !== undefined ? data.latitude : undefined,
        longitude: data.longitude !== undefined ? data.longitude : undefined,
        bio: data.bio !== undefined ? data.bio : undefined,
        skillLevel: data.skillLevel ?? undefined,
        danceStyles: data.danceStyles ?? undefined,
        experienceYears: data.experienceYears ?? undefined,
        instagramHandle: data.instagramHandle !== undefined ? data.instagramHandle : undefined,
        hourlyRate: data.hourlyRate !== undefined ? data.hourlyRate : undefined,
        upiId: data.upiId !== undefined ? data.upiId : undefined,
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        isVerified: data.isVerified !== undefined ? data.isVerified : undefined,
      },
      include: {
        photos: {
          orderBy: { order: "asc" },
        },
      },
    });

    const { passwordHash: _, ...safeUser } = updated;
    return safeUser;
  }

  /**
   * DELETE: Delete user/model from database
   */
  async delete(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ErrorResponse("User model not found", statusCode.Not_Found);
    }

    await prisma.user.delete({ where: { id: userId } });
    return { success: true, message: "User model deleted successfully" };
  }

  /**
   * Upload multiple gallery photos (at least 5 photos supported)
   */
  async uploadGalleryPhotos(userId: string, files: Express.Multer.File[]) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ErrorResponse("User model not found", statusCode.Not_Found);
    }

    const existingPhotosCount = await prisma.userPhoto.count({ where: { userId } });
    const uploaded = await uploadImages(files, `garba/users/${userId}/gallery`);

    await prisma.userPhoto.createMany({
      data: uploaded.map((p, idx) => ({
        userId,
        imageUrl: p.url,
        publicId: p.publicId,
        caption: `Gallery Photo ${existingPhotosCount + idx + 1}`,
        order: existingPhotosCount + idx,
      })),
    });

    return prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });
  }

  /**
   * Delete a single gallery photo
   */
  async deleteGalleryPhoto(userId: string, photoId: string) {
    const photo = await prisma.userPhoto.findFirst({
      where: { id: photoId, userId },
    });
    if (!photo) {
      throw new ErrorResponse("Photo not found", statusCode.Not_Found);
    }

    await prisma.userPhoto.delete({ where: { id: photoId } });
    return { success: true, message: "Photo deleted successfully" };
  }

  /**
   * Toggle Active / Availability / Verified status
   */
  async toggleStatus(userId: string, field: "isActive" | "isAvailable" | "isVerified") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ErrorResponse("User model not found", statusCode.Not_Found);

    const currentValue = user[field];
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { [field]: !currentValue },
      select: { id: true, name: true, [field]: true },
    });

    return updated;
  }
}

export const userService = new UserService();
