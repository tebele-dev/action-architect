import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getEnvConfig } from "../lib/env.server.js";

dotenv.config();
const { JWT_SECRET } = getEnvConfig();

export function signAccessToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as any;
}
