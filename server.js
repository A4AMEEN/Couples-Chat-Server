import express from "express"
import http from "http"
import { Server } from "socket.io"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"
import webpush from "web-push"
import path from "path"
import { fileURLToPath } from "url"

// dotenv config
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = http.createServer(app)

// Socket.io and CORS setup
const allowedOrigins = [
  "https://couples-chat-app.vercel.app",
  "https://belleamee.vercel.app",
  "https://mest.google.com"
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  },
});

// Middleware setup
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Test route to confirm server is running
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "API is working! 🎉" });
});

// Commenting out the routes to test if basic setup works
/*
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
*/

// Socket.io connection handler
io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.userId}`)

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.userId}`)
  })
})

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist/client")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/client/index.html"));
  });
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
  });
