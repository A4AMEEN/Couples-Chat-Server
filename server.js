import express from "express";

const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Simple test route
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "Server is working!" });
});

// Handle unsupported routes


// Server listening on a port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
