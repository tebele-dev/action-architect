import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}
export function jwtAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ success: false, error: "Missing token" });
  const parts = auth.split(" ");
  if (parts.length !== 2)
    return res.status(401).json({ success: false, error: "Invalid token format" });
  const token = parts[1];
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub || payload.id, email: payload.email } as any;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
}
