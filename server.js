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

// Routes
import authRoutes from "./routes/auth.js"
import messageRoutes from "./routes/messages.js"
import userRoutes from "./routes/users.js"
import notificationRoutes from "./routes/notifications.js"

// Models
import User from "./models/user.js"
import Message from "./models/message.js"
import Subscription from "./models/subscription.js"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:4200"],
    credentials: true,
  },
})

// Set up VAPID keys for web push
webpush.setVapidDetails("mailto:your-email@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)

// Middleware
app.use(cors())
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist/client")))
}

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/users", userRoutes)
app.use("/api/notifications", notificationRoutes)

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token

  if (!token) {
    return next(new Error("Authentication error"))
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.userId
    next()
  } catch (err) {
    next(new Error("Authentication error"))
  }
})

// Socket.io connection handler
io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.userId}`)

  try {
    // Update user status to online
    await User.findByIdAndUpdate(socket.userId, { isOnline: true })

    // Get the current user
    const currentUser = await User.findById(socket.userId)
    const users = await User.find({ _id: { $ne: socket.userId } })

    if (users.length > 0) {
      const partner = users[0]

      // Notify partner that user is online
      socket.broadcast.emit("partner-status", true)

      // Join a room for private messaging
      socket.join(`user_${socket.userId}`)

      // Handle typing events
      socket.on("typing", (isTyping) => {
        socket.broadcast.emit("typing", isTyping)
      })

      // Handle message read events
      socket.on("message-read", async (messageId) => {
        try {
          // Update message in database
          await Message.findByIdAndUpdate(messageId, { read: true })

          // Broadcast to other users that message was read
          socket.broadcast.emit("message-read", messageId)
        } catch (err) {
          console.error("Error marking message as read", err)
        }
      })

      // Handle alert events
      socket.on("alert", async () => {
        try {
          // Send push notification to partner
          const subscriptions = await Subscription.find({ userId: partner._id })

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(
                sub.subscription,
                JSON.stringify({
                  title: "WhatsApp Alert",
                  body: `${currentUser.name} is trying to reach you!`,
                  icon: "/assets/images/whatsapp-logo.png",
                }),
              )
            } catch (err) {
              console.error("Error sending push notification", err)
            }
          }

          // Also emit an alert event to the partner
          socket.broadcast.emit("alert")
        } catch (err) {
          console.error("Error sending alert", err)
        }
      })

      // Handle message events
      socket.on("message", async (messageData) => {
        try {
          // If the message is already saved (has an _id), don't save it again
          if (!messageData._id) {
            const message = new Message({
              sender: socket.userId,
              senderName: currentUser.name,
              content: messageData.content,
              type: messageData.type,
              timestamp: new Date(),
              read: false,
            })

            await message.save()
            messageData = message
          }

          // Broadcast message to all connected clients
          socket.broadcast.emit("message", messageData)

          // Send push notification if partner is offline
          if (!partner.isOnline) {
            const subscriptions = await Subscription.find({ userId: partner._id })

            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification(
                  sub.subscription,
                  JSON.stringify({
                    title: `New message from ${currentUser.name}`,
                    body: messageData.type === "text" ? messageData.content.substring(0, 50) : "Voice message",
                    icon: "/assets/images/whatsapp-logo.png",
                  }),
                )
              } catch (err) {
                console.error("Error sending push notification", err)
              }
            }
          }
        } catch (err) {
          console.error("Error handling message", err)
        }
      })
    }

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.userId}`)

      try {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false })
        socket.broadcast.emit("partner-status", false)
      } catch (err) {
        console.error("Error updating user status", err)
      }
    })
  } catch (err) {
    console.error("Error in socket connection", err)
  }
})

// Serve Angular app in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/client/index.html"))
  })
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB")

    // Start server
    const PORT = process.env.PORT || 3000
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error("MongoDB connection error", err)
  })
