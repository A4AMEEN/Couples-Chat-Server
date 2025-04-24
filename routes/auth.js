import express from "express"
import jwt from "jsonwebtoken"
import Peoples from "../models/user.js"

const router = express.Router()

// Login route
router.post("/login", async (req, res) => {
  try {
    const { name, userId } = req.body
    console.log(req.body)
    if (!name || !userId) {
      return res.status(400).json({ message: "Name and userId are required" })
    }

    // Find user by userId or create a new one
    let users = await Peoples.find()
    let user = await Peoples.findOne({ userId })
    console.log(users)

    // If user doesn't exist, create a new one
    if (!user) {
      user = new Peoples({
        name,
        userId,
        isOnline: true,
      })

      await user.save()
    } else {
      // Update name and online status
      user.name = name
      user.isOnline = true
      await user.save()
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

    // Return user and token
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        isOnline: user.isOnline,
      },
      token,
    })
  } catch (err) {
    console.error("Login error", err)
    res.status(500).json({ message: "Server error" })
  }
})

export default router