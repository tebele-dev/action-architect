import { io } from "socket.io-client";
import dotenv from "dotenv";
import { getEnvConfigUnsafe } from "../lib/env.server";
dotenv.config();
const { SOCKET_SERVER_URL } = getEnvConfigUnsafe();
const SERVER_URL = SOCKET_SERVER_URL || "http://localhost:3000";
const socket = io(SERVER_URL, { autoConnect: true });
export async function ioClientNotify(room: string, event: string, payload: any) {
  try {
    socket.emit("notify", { room, event, payload });
  } catch (err) {
    console.error("notify error", err);
  }
}
