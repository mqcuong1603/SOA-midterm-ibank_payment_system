import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { execute } from "../config/database.js";
import { body, validationResult } from "express-validator";

const { compare } = bcrypt;
const { sign } = jwt;

const router = Router();

// Login endpoint
router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const [users] = await execute(
        "SELECT * FROM users WHERE username = ? AND is_active = TRUE",
        [username]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = users[0];
      const isValidPassword = await compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          balance: parseFloat(user.balance),
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
