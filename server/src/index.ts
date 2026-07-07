import "dotenv/config";
import { createServer } from "node:http";
import express from "express";
import { connectDB } from "./db/connection.js";
import { createSocketServer } from "./socket/bootstrap.js";

const PORT = Number(process.env.PORT ?? 3001);
const MONGODB_URI = process.env.MONGODB_URI ?? "";

async function main(): Promise<void> {
  const app = express();

  if (MONGODB_URI) {
    try {
      await connectDB(MONGODB_URI);
    } catch (err) {
      console.warn(
        "[Server] MongoDB connection failed, running WITHOUT persistence",
      );
      console.warn("[Server] Error:", (err as Error).message);
      console.warn("[Server] Game state will be lost on restart");
    }
  } else {
    console.warn("[Server] MONGODB_URI not set, running WITHOUT persistence");
  }

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "f4fun-server", db: !!MONGODB_URI });
  });

  const httpServer = createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
    console.log(`[Server] Socket.io ready for connections`);
  });
}

main().catch((err) => {
  console.error("[Server] Fatal:", err);
  process.exit(1);
});
