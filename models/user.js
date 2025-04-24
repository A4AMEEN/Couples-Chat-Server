import mongoose from "mongoose"

const peopleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.model("Peoples", peopleSchema);
