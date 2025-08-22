// routes/user.js
import { Router } from "express";
import { execute } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const [users] = await execute(
      "SELECT full_name, phone, email, balance FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      fullName: users[0].full_name,
      phone: users[0].phone,
      email: users[0].email,
      balance: parseFloat(users[0].balance),
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
