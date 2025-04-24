import express from "express"
import Subscription from "../models/subscription.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

// Subscribe to push notifications
router.post("/subscribe", authenticateToken, async (req, res) => {
  try {
    const subscription = req.body

    if (!subscription) {
      return res.status(400).json({ message: "Subscription is required" })
    }

    // Check if subscription already exists
    const existingSub = await Subscription.findOne({
      userId: req.userId,
      "subscription.endpoint": subscription.endpoint,
    })

    if (existingSub) {
      return res.status(200).json({ message: "Already subscribed" })
    }

    // Create new subscription
    const newSubscription = new Subscription({
      userId: req.userId,
      subscription,
    })

    await newSubscription.save()

    res.status(201).json({ message: "Subscription added successfully" })
  } catch (err) {
    console.error("Error subscribing to notifications", err)
    res.status(500).json({ message: "Server error" })
  }
})

// Unsubscribe from push notifications
router.delete("/unsubscribe", authenticateToken, async (req, res) => {
  try {
    await Subscription.deleteMany({ userId: req.userId })

    res.json({ message: "Unsubscribed successfully" })
  } catch (err) {
    console.error("Error unsubscribing from notifications", err)
    res.status(500).json({ message: "Server error" })
  }
})

export default router
