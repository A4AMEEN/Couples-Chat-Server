import express from "express"
import User from "../models/user.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

// Get partner user
router.get("/partner", authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select("-code")

    if (users.length === 0) {
      return res.status(404).json({ message: "No partner found" })
    }

    res.json(users[0])
  } catch (err) {
    console.error("Error getting partner", err)
    res.status(500).json({ message: "Server error" })
  }
})

// Update online status
router.post("/status", authenticateToken, async (req, res) => {
  try {
    const { isOnline } = req.body

    const user = await User.findByIdAndUpdate(req.userId, { isOnline }, { new: true }).select("-code")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (err) {
    console.error("Error updating status", err)
    res.status(500).json({ message: "Server error" })
  }
})

export default router
