import { Router } from "express";
import { upload } from "../../middlewares/upload.middleware.js";
import { userController } from "./user.controller.js";

const router = Router();

// CREATE Model / User with avatar and optional multiple photos (at least 5 photos)
router.post(
  "/",
  upload.any(),
  userController.create.bind(userController)
);

// GET ALL Models / Users with filters and pagination
router.get("/", userController.getAll.bind(userController));

// GET Model by ID
router.get("/:id", userController.getById.bind(userController));

// UPDATE Model by ID with optional avatar and gallery photos
router.patch(
  "/:id",
  upload.any(),
  userController.update.bind(userController)
);

// DELETE Model by ID
router.delete("/:id", userController.delete.bind(userController));

// UPLOAD gallery photos for Model (multi-photo upload)
router.post(
  "/:id/photos",
  upload.any(),
  userController.uploadPhotos.bind(userController)
);

// DELETE a specific gallery photo
router.delete("/:id/photos/:photoId", userController.deletePhoto.bind(userController));

// TOGGLE Model status (isAvailable / isActive / isVerified)
router.patch("/:id/toggle-status", userController.toggleStatus.bind(userController));

export default router;

