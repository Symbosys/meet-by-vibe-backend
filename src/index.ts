import http from "http";
import app from "./app.js";
import { ENV } from "./config/env.js";

const PORT = Number(process.env.PORT || ENV.PORT || 4000);

if (!ENV.DATABASE_URL) {
  console.warn("⚠️ Warning: DATABASE_URL is not set. Database connections will fail.");
}
if (!ENV.JWT_SECRET || ENV.JWT_SECRET.length < 32) {
  console.warn("⚠️ Warning: JWT_SECRET is missing or less than 32 characters.");
}

const httpServer = http.createServer(app);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} in ${ENV.MODE || "development"} mode`);
});
