import type { Request, Response, NextFunction } from "express";
import { userService } from "./user.service.js";
import { SuccessResponse } from "../../utils/response.util.js";
import { statusCode } from "../../types/types.js";
import { 
  createUserSchema, 
  updateUserSchema, 
  queryUsersSchema 
} from "./user.validation.js";

export class UserController {
  /**
   * CREATE: POST /api/v1/users
   * Create a new User / Performer model with avatar and optional gallery photos
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createUserSchema.parse(req.body);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const avatarFile = files?.avatar?.[0] || (req.file?.fieldname === "avatar" ? req.file : undefined);
      const photoFiles = files?.photos;

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
   * Update user details (bio, rate, availability, height, dance styles, avatar)
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateUserSchema.parse(req.body);
      const avatarFile = req.file;
      const updated = await userService.update(req.params.id as string, validated, avatarFile);
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
      const files = req.files as Express.Multer.File[];
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
