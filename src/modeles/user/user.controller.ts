import type { NextFunction, Request, Response } from "express";
import { statusCode } from "../../types/types.js";
import { SuccessResponse } from "../../utils/response.util.js";
import { userService } from "./user.service.js";
import {
    createUserSchema,
    queryUsersSchema,
    updateUserSchema
} from "./user.validation.js";

function extractFiles(req: Request): {
  avatarFile: Express.Multer.File | undefined;
  photoFiles: Express.Multer.File[] | undefined;
} {
  let avatarFile: Express.Multer.File | undefined = undefined;
  let photoFiles: Express.Multer.File[] | undefined = undefined;

  if (Array.isArray(req.files)) {
    avatarFile = req.files.find((f) => f.fieldname === "avatar");
    const photos = req.files.filter(
      (f) =>
        f.fieldname === "photos" ||
        f.fieldname === "photo" ||
        f.fieldname === "images" ||
        f.fieldname === "gallery" ||
        f.fieldname === "files" ||
        f.fieldname.startsWith("photo")
    );
    if (photos.length > 0) photoFiles = photos;

    const firstFile = req.files[0];
    if (!avatarFile && (!photoFiles || photoFiles.length === 0) && firstFile) {
      if (firstFile.fieldname === "avatar") {
        avatarFile = firstFile;
      } else {
        photoFiles = req.files;
      }
    }
  } else if (req.files && typeof req.files === "object") {
    const filesDict = req.files as { [fieldname: string]: Express.Multer.File[] };
    avatarFile = filesDict.avatar?.[0];
    photoFiles = filesDict.photos || filesDict.photo || filesDict.images || filesDict.files;
  } else if (req.file) {
    if (req.file.fieldname === "avatar") {
      avatarFile = req.file;
    } else {
      photoFiles = [req.file];
    }
  }

  return { avatarFile, photoFiles };
}

export class UserController {
  /**
   * CREATE: POST /api/v1/users
   * Create a new User / Performer model with avatar and optional gallery photos
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createUserSchema.parse(req.body);
      const { avatarFile, photoFiles } = extractFiles(req);
      const user = await userService.create(validated, avatarFile, photoFiles);
      return SuccessResponse(res, "User model created successfully", user, statusCode.Created);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET ALL: GET /api/v1/users
   * Get all users/performers with search, filters (role, skill, city, rate), and pagination
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = queryUsersSchema.parse(req.query);
      const result = await userService.getAll(validated);
      return SuccessResponse(res, "Users fetched successfully", result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET BY ID: GET /api/v1/users/:id
   * Get full user model details by ID with photo gallery
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getById(req.params.id as string);
      return SuccessResponse(res, "User details fetched successfully", user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * UPDATE: PATCH /api/v1/users/:id
   * Update user details (bio, rate, availability, height, dance styles, avatar, gallery photos)
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateUserSchema.parse(req.body);
      const { avatarFile, photoFiles } = extractFiles(req);
      const updated = await userService.update(req.params.id as string, validated, avatarFile, photoFiles);
      return SuccessResponse(res, "User model updated successfully", updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE: DELETE /api/v1/users/:id
   * Delete user model from database
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.delete(req.params.id as string);
      return SuccessResponse(res, "User model deleted successfully", result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * UPLOAD PHOTOS: POST /api/v1/users/:id/photos
   * Upload multiple gallery photos for user (at least 5 photos supported)
   */
  async uploadPhotos(req: Request, res: Response, next: NextFunction) {
    try {
      let files: Express.Multer.File[] = [];
      if (Array.isArray(req.files)) {
        files = req.files;
      } else if (req.files && typeof req.files === "object") {
        files = Object.values(req.files).flat();
      } else if (req.file) {
        files = [req.file];
      }

      if (!files || files.length === 0) {
        return SuccessResponse(res, "No files uploaded", [], statusCode.Bad_Request);
      }
      const photos = await userService.uploadGalleryPhotos(req.params.id as string, files);
      return SuccessResponse(res, "Gallery photos uploaded successfully", photos, statusCode.Created);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE PHOTO: DELETE /api/v1/users/:id/photos/:photoId
   * Delete a single photo from gallery
   */
  async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.deleteGalleryPhoto(
        req.params.id as string, 
        req.params.photoId as string
      );
      return SuccessResponse(res, "Photo deleted successfully", result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * TOGGLE STATUS: PATCH /api/v1/users/:id/toggle-status
   * Toggle isActive, isAvailable, or isVerified
   */
  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const field = (req.body.field as "isActive" | "isAvailable" | "isVerified") || "isAvailable";
      const result = await userService.toggleStatus(req.params.id as string, field);
      return SuccessResponse(res, `${field} toggled successfully`, result);
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
