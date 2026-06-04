import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { getEnvConfigUnsafe } from "./lib/env.server";
import authRoutes from "./routes/-auth";
import plansRoutes from "./routes/-plans";
import stepsRoutes from "./routes/-steps";
import timeRoutes from "./routes/-timeEntries";
import chatRoutes from "./routes/-chat";
dotenv.config();
export const app = express();
const { CORS_ORIGIN } = getEnvConfigUnsafe();
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN || "http://localhost:5173" }));
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => String(req.headers.authorization ?? req.ip),
});
app.use(limiter);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/steps", stepsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", timeRoutes);
app.use((err: any, _req: any, _res: any, _next: any) => {
  console.error(err?.message || err);
  _res.status(500).json({ success: false, error: "Internal server error" });
});
export default app;
