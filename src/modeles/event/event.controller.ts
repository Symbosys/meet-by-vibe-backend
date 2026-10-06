import type { Request, Response, NextFunction } from "express";
import { eventService } from "./event.service.js";
import { SuccessResponse } from "../../utils/response.util.js";
import { statusCode } from "../../types/types.js";
import {
  createEventSchema,
  updateEventSchema,
  queryEventsSchema,
  rsvpEventSchema,
  toggleFavoriteSchema,
} from "./event.validation.js";

export class EventController {
  /**
   * GET /api/v1/events
   * Query & list events with dynamic attendee counts and user status
   */
  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedQuery = queryEventsSchema.parse(req.query);
      const currentUserId = (req.query.userId as string) || (req.headers["x-user-id"] as string);
      const result = await eventService.getEvents(parsedQuery, currentUserId);
      return SuccessResponse(res, "Events retrieved successfully", result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/events/:id
   * Get single event details
   */
  async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = (req.query.userId as string) || (req.headers["x-user-id"] as string);
      const event = await eventService.getEventById(req.params.id as string, currentUserId);
      return SuccessResponse(res, "Event details retrieved successfully", event);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/events
   * Create a new event
   */
  async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const bannerFile =
        files?.image?.[0] ||
        files?.file?.[0] ||
        (req.file?.fieldname === "image" || req.file?.fieldname === "file" ? req.file : undefined);
      const galleryFiles = files?.gallery;

      let imageUrl = req.body.imageUrl;
      let galleryImages = Array.isArray(req.body.galleryImages) ? req.body.galleryImages : [];

      if (bannerFile) {
        const { uploadImages } = await import("../../utils/upload.util.js");
        const [uploaded] = await uploadImages([bannerFile], "garba/events");
        if (uploaded?.url) {
          imageUrl = uploaded.url;
        }
      }

      if (galleryFiles && galleryFiles.length > 0) {
        const { uploadImages } = await import("../../utils/upload.util.js");
        const uploadedList = await uploadImages(galleryFiles, "garba/events/gallery");
        const urls = uploadedList.map((u) => u.url);
        galleryImages = [...galleryImages, ...urls];
      }

      const payload = {
        ...req.body,
        ...(imageUrl ? { imageUrl } : {}),
        ...(galleryImages.length > 0 ? { galleryImages } : {}),
      };

      const parsedData = createEventSchema.parse(payload);
      const creatorId = (req.headers["x-user-id"] as string) || parsedData.organizerId;
      const event = await eventService.createEvent(parsedData, creatorId);
      return SuccessResponse(res, "Event created successfully", event, statusCode.Created);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH/PUT /api/v1/events/:id
   * Update an existing event
   */
  async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const bannerFile =
        files?.image?.[0] ||
        files?.file?.[0] ||
        (req.file?.fieldname === "image" || req.file?.fieldname === "file" ? req.file : undefined);
      const galleryFiles = files?.gallery;

      let imageUrl = req.body.imageUrl;
      let galleryImages = req.body.galleryImages ? (Array.isArray(req.body.galleryImages) ? req.body.galleryImages : [req.body.galleryImages]) : undefined;

      if (bannerFile) {
        const { uploadImages } = await import("../../utils/upload.util.js");
        const [uploaded] = await uploadImages([bannerFile], "garba/events");
        if (uploaded?.url) {
          imageUrl = uploaded.url;
        }
      }

      if (galleryFiles && galleryFiles.length > 0) {
        const { uploadImages } = await import("../../utils/upload.util.js");
        const uploadedList = await uploadImages(galleryFiles, "garba/events/gallery");
        const urls = uploadedList.map((u) => u.url);
        galleryImages = [...(galleryImages || []), ...urls];
      }

      const payload = {
        ...req.body,
        ...(imageUrl ? { imageUrl } : {}),
        ...(galleryImages !== undefined ? { galleryImages } : {}),
      };

      const parsedData = updateEventSchema.parse(payload);
      const updated = await eventService.updateEvent(req.params.id as string, parsedData);
      return SuccessResponse(res, "Event updated successfully", updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/events/:id
   * Delete an event
   */
  async deleteEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await eventService.deleteEvent(req.params.id as string);
      return SuccessResponse(res, result.message, null);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/events/:id/rsvp
   * Join/Leave event and toggle Looking for Partner
   */
  async toggleRsvp(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedData = rsvpEventSchema.parse(req.body);
      const result = await eventService.toggleRsvp(req.params.id as string, parsedData);
      return SuccessResponse(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/events/:id/favorite
   * Toggle event favorite/bookmark status
   */
  async toggleFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedData = toggleFavoriteSchema.parse(req.body);
      const result = await eventService.toggleFavorite(req.params.id as string, parsedData.userId);
      return SuccessResponse(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }
}

export const eventController = new EventController();
