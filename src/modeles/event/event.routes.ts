import { Router } from "express";
import { eventController } from "./event.controller.js";
import { upload } from "../../middlewares/upload.middleware.js";

const router = Router();

// Public / Filtered Event Retrieval
router.get("/", eventController.getEvents.bind(eventController));
router.get("/:id", eventController.getEventById.bind(eventController));

// Event Management (Admin / Organizer)
const eventUploadMiddleware = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
]);

router.post("/", eventUploadMiddleware, eventController.createEvent.bind(eventController));
router.put("/:id", eventUploadMiddleware, eventController.updateEvent.bind(eventController));
router.patch("/:id", eventUploadMiddleware, eventController.updateEvent.bind(eventController));
router.delete("/:id", eventController.deleteEvent.bind(eventController));

// User Event Actions (RSVP / Looking for Partner & Favorites)
router.post("/:id/rsvp", eventController.toggleRsvp.bind(eventController));
router.post("/:id/favorite", eventController.toggleFavorite.bind(eventController));

export default router;
