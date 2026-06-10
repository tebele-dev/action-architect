import express from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../prisma.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { validateBody } from "../middleware/validators.js";
import { jwtAuth, AuthRequest } from "../middleware/auth.js";
const router = express.Router();
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string() });
router.post("/register", validateBody(registerSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(400).json({ success: false, error: "Email already registered" });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash: hash, name } });
    return res.json({ success: true, data: { id: user.id, email: user.email, name: user.name } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/login", validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, error: "Invalid credentials" });
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id });
    return res.json({ success: true, data: { accessToken, refreshToken } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/me", jwtAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ success: false, error: "Not found" });
    return res.json({ success: true, data: { id: user.id, email: user.email, name: user.name } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
export default router;
