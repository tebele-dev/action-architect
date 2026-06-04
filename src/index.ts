import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { app } from "./app";
import { getEnvConfig } from "./lib/env.server";
dotenv.config();
const { PORT, CORS_ORIGIN } = getEnvConfig();
const server = createServer(app);
export const io = new Server(server, {
  path: "/ws/chat",
  cors: {
    origin: CORS_ORIGIN,
  },
});
io.on("connection", (socket) => {
  socket.on("join", (room) => {
    socket.join(room);
  });
  socket.on("chat:message", async (payload) => {
    try {
      const { sessionId, stepId, message, userId } = payload as any;
      const { prisma } = await import("./prisma.js");
      let session = null;
      if (sessionId) {
        session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
      }
      if (!session) {
        session = await prisma.chatSession.create({ data: { userId: userId, stepId: stepId } });
      }
      await prisma.chatMessage.create({
        data: { sessionId: session.id, role: "user", content: message },
      });
      socket.emit("typing", { type: "typing", content: "" });
      const step = stepId ? await prisma.step.findUnique({ where: { id: stepId } }) : null;
      const stepAction = step?.action || "";
      const stepWhy = step?.why || "";
      const { chatForStep } = await import("./services/openai.js");
      const response = await chatForStep(stepAction, stepWhy, message);
      await prisma.chatMessage.create({
        data: { sessionId: session.id, role: "assistant", content: response },
      });
      socket.emit("chat:response", { type: "response", content: response });
    } catch (err: any) {
      socket.emit("chat:error", { error: err?.message || "Chat error" });
    }
  });
  socket.on("notify", ({ room, event, payload }) => {
    io.to(room).emit(event, payload);
  });
});
server.listen(PORT);
(app as any).io = io;
