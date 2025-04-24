import express from "express"
import Message from "../models/message.js"
import User from "../models/user.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

// Get all messages
router.get("/", authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(100)

    res.json(messages)
  } catch (err) {
    console.error("Error getting messages", err)
    res.status(500).json({ message: "Server error" })
  }
})

// Send a message
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { content, type = "text" } = req.body

    if (!content) {
      return res.status(400).json({ message: "Message content is required" })
    }

    // Get the current user to include their name
    const user = req.body
    console.log("user",user)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const message = new Message({
      sender: user.sender,
      senderName: user.senderName,
      content,
      type,
      timestamp: new Date(),
      read: false,
    })

    await message.save()
    //deleteAllMessages()

    res.status(201).json(message)
  } catch (err) {
    console.error("Error sending message", err)
    res.status(500).json({ message: "Server error" })
  }
})

// async function deleteAllMessages() {
//   await Message.deleteMany({});
//   console.log('All messages deleted');
// }

// Mark message as read
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)

    if (!message) {
      return res.status(404).json({ message: "Message not found" })
    }

    message.read = true
    await message.save()

    res.json(message)
  } catch (err) {
    console.error("Error marking message as read", err)
    res.status(500).json({ message: "Server error" })
  }
})

export default router
