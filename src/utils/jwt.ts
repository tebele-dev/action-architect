import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getEnvConfig } from "../lib/env.server";
dotenv.config();
const { JWT_SECRET } = getEnvConfig();
const SECRET = JWT_SECRET;
export function signAccessToken(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: "15m" });
}
export function signRefreshToken(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}
export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as any;
}
