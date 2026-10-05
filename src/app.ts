import cors from "cors";
import express from "express";
import morgan from "morgan";
import { ENV } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { statusCode } from "./types/types.js";
import { ErrorResponse } from "./utils/response.util.js";
import userRoutes from "./modeles/user/user.routes.js";
import bookingRoutes from "./modeles/booking/booking.routes.js";
import qrRoutes from "./modeles/qr/qr.routes.js";

const app = express();
const allowedOrigins = ENV.FRONTEND_ORIGIN?.split(",").map((value) => value.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(cors({ 
  origin: allowedOrigins?.length ? (allowedOrigins.includes("*") ? true : allowedOrigins) : true,
  credentials: true 
}));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.get("/", (_req, res) => res.status(200).json({ message: "Welcome to GarbaMitra API", success: true, mode: ENV.MODE }));

// API V1 Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/qr", qrRoutes);

app.use((_req, _res, next) => next(new ErrorResponse("Route not found", statusCode.Not_Found)));
app.use(errorMiddleware);

export default app;
