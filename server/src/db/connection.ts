import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(uri: string): Promise<void> {
  if (isConnected) return;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("[DB] MongoDB connected");

    mongoose.connection.on("error", (err) => {
      console.error("[DB] Connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      console.warn("[DB] Disconnected");
    });
  } catch (err) {
    console.error("[DB] Failed to connect:", err);
    throw new Error(`MongoDB connection failed: ${(err as Error).message}`);
  }
}

export function getDB(): mongoose.Connection {
  return mongoose.connection;
}
