import bcrypt from "bcrypt";
import { prisma } from "../prisma.js";
import { getEnvConfigUnsafe } from "../lib/env.server.js";
const { GUEST_USER_EMAIL, GUEST_USER_NAME, GUEST_USER_PASSWORD } = getEnvConfigUnsafe();
const GUEST_EMAIL = GUEST_USER_EMAIL || "guest@action-architect.local";
const GUEST_NAME = GUEST_USER_NAME || "Guest User";
const GUEST_PASSWORD = GUEST_USER_PASSWORD || "guest-password";
export async function getGuestUser() {
  const passwordHash = bcrypt.hashSync(GUEST_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: GUEST_EMAIL },
    update: { name: GUEST_NAME },
    create: { email: GUEST_EMAIL, passwordHash, name: GUEST_NAME },
  });
}
