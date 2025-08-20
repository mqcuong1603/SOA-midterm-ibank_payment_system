import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getConnection } from "../config/database";
import redisClient from "../config/redis";
import { authenticateToken } from "../middleware/auth";
import { generateOTP } from "../utils/otpGenerator";
import { sendOTPEmail, sendConfirmationEmail } from "../utils/emailService";
import { body, validationResult } from "express-validator";

const router = Router();

// Initiate payment
router.post(
  "/initiate",
  authenticateToken,
  [
    body("studentId").notEmpty().withMessage("Student ID is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, amount } = req.body;
    const userId = req.user.id;
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      // Check if student exists and not paid
      const [students] = await connection.execute(
        "SELECT * FROM students WHERE student_id = ? FOR UPDATE",
        [studentId]
      );

      if (students.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Student not found" });
      }

      if (students[0].is_paid) {
        await connection.rollback();
        return res.status(400).json({ error: "Tuition already paid" });
      }

      // Check user balance
      const [users] = await connection.execute(
        "SELECT balance FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );

      if (parseFloat(users[0].balance) < amount) {
        await connection.rollback();
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Create transaction
      const transactionCode =
        "TXN" + Date.now() + uuidv4().substring(0, 8).toUpperCase();

      const [result] = await connection.execute(
        "INSERT INTO transactions (transaction_code, payer_id, student_id, amount, status) VALUES (?, ?, ?, ?, ?)",
        [transactionCode, userId, studentId, amount, "pending"]
      );

      await connection.commit();

      res.json({
        transactionId: result.insertId,
        transactionCode,
        status: "pending",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Payment initiation error:", error);
      res.status(500).json({ error: "Server error" });
    } finally {
      connection.release();
    }
  }
);

// Send OTP
router.post(
  "/send-otp",
  authenticateToken,
  [
    body("transactionId")
      .isNumeric()
      .withMessage("Valid transaction ID required"),
  ],
  async (req, res) => {
    const { transactionId } = req.body;
    const userId = req.user.id;

    try {
      // Verify transaction belongs to user
      const [transactions] = await pool.execute(
        "SELECT * FROM transactions WHERE id = ? AND payer_id = ? AND status = ?",
        [transactionId, userId, "pending"]
      );

      if (transactions.length === 0) {
        return res
          .status(404)
          .json({ error: "Transaction not found or invalid" });
      }

      // Generate OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database
      await pool.execute(
        "INSERT INTO otp_codes (transaction_id, otp_code, email, expires_at) VALUES (?, ?, ?, ?)",
        [transactionId, otp, req.user.email, expiresAt]
      );

      // Store in Redis for quick access
      await redisClient.setEx(`otp:${transactionId}`, 300, otp);

      // Update transaction status
      await pool.execute("UPDATE transactions SET status = ? WHERE id = ?", [
        "otp_sent",
        transactionId,
      ]);

      // Send OTP email
      const emailSent = await sendOTPEmail(
        req.user.email,
        otp,
        transactions[0].transaction_code
      );

      if (emailSent) {
        res.json({
          message: "OTP sent successfully",
          otpSent: true,
          expiresIn: 300, // seconds
        });
      } else {
        res.status(500).json({ error: "Failed to send OTP email" });
      }
    } catch (error) {
      console.error("OTP send error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Verify OTP
router.post(
  "/verify-otp",
  authenticateToken,
  [
    body("transactionId").isNumeric(),
    body("otpCode").isLength({ min: 6, max: 6 }),
  ],
  async (req, res) => {
    const { transactionId, otpCode } = req.body;
    const userId = req.user.id;

    try {
      // Get OTP from database
      const [otpRecords] = await pool.execute(
        `SELECT o.* FROM otp_codes o 
             JOIN transactions t ON o.transaction_id = t.id 
             WHERE o.transaction_id = ? AND t.payer_id = ? 
             AND o.is_used = FALSE AND o.expires_at > NOW()
             ORDER BY o.created_at DESC LIMIT 1`,
        [transactionId, userId]
      );

      if (otpRecords.length === 0) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      const otpRecord = otpRecords[0];

      // Increment attempts
      await pool.execute(
        "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?",
        [otpRecord.id]
      );

      if (otpRecord.attempts >= 3) {
        await pool.execute("UPDATE transactions SET status = ? WHERE id = ?", [
          "failed",
          transactionId,
        ]);
        return res.status(400).json({ error: "Too many failed attempts" });
      }

      if (otpRecord.otp_code !== otpCode) {
        return res.status(400).json({ error: "Invalid OTP code" });
      }

      // Mark OTP as used
      await pool.execute("UPDATE otp_codes SET is_used = TRUE WHERE id = ?", [
        otpRecord.id,
      ]);

      // Update transaction status
      await pool.execute("UPDATE transactions SET status = ? WHERE id = ?", [
        "otp_verified",
        transactionId,
      ]);

      res.json({
        verified: true,
        transactionStatus: "otp_verified",
        message: "OTP verified successfully",
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Confirm payment
router.post(
  "/confirm",
  authenticateToken,
  [body("transactionId").isNumeric()],
  async (req, res) => {
    const { transactionId } = req.body;
    const userId = req.user.id;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Lock transaction for processing
      const [transactions] = await connection.execute(
        "SELECT * FROM transactions WHERE id = ? AND payer_id = ? AND status = ? FOR UPDATE",
        [transactionId, userId, "otp_verified"]
      );

      if (transactions.length === 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "Invalid transaction or not verified" });
      }

      const transaction = transactions[0];

      // Try to acquire locks
      try {
        await connection.execute(
          "INSERT INTO transaction_locks (resource_type, resource_id, transaction_id, expires_at) VALUES (?, ?, ?, ?)",
          [
            "user_account",
            userId.toString(),
            transactionId,
            new Date(Date.now() + 5 * 60 * 1000),
          ]
        );

        await connection.execute(
          "INSERT INTO transaction_locks (resource_type, resource_id, transaction_id, expires_at) VALUES (?, ?, ?, ?)",
          [
            "student_tuition",
            transaction.student_id,
            transactionId,
            new Date(Date.now() + 5 * 60 * 1000),
          ]
        );
      } catch (lockError) {
        await connection.rollback();
        return res.status(409).json({
          error: "Another transaction is in progress. Please try again.",
        });
      }

      // Get current balance
      const [users] = await connection.execute(
        "SELECT balance FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );

      const currentBalance = parseFloat(users[0].balance);
      const amount = parseFloat(transaction.amount);

      if (currentBalance < amount) {
        await connection.rollback();
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Process payment
      const newBalance = currentBalance - amount;

      // Update user balance
      await connection.execute("UPDATE users SET balance = ? WHERE id = ?", [
        newBalance,
        userId,
      ]);

      // Mark tuition as paid
      await connection.execute(
        "UPDATE students SET is_paid = TRUE WHERE student_id = ?",
        [transaction.student_id]
      );

      // Update transaction status
      await connection.execute(
        "UPDATE transactions SET status = ?, completed_at = NOW() WHERE id = ?",
        ["completed", transactionId]
      );

      // Record in transaction history
      await connection.execute(
        `INSERT INTO transaction_history 
             (user_id, transaction_id, transaction_type, amount, balance_before, balance_after, description, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          transactionId,
          "payment",
          amount,
          currentBalance,
          newBalance,
          `Tuition payment for student ${transaction.student_id}`,
          "success",
        ]
      );

      // Release locks
      await connection.execute(
        "DELETE FROM transaction_locks WHERE transaction_id = ?",
        [transactionId]
      );

      await connection.commit();

      // Send confirmation email
      const transactionDetails = {
        transactionCode: transaction.transaction_code,
        studentId: transaction.student_id,
        amount: amount,
        newBalance: newBalance,
      };

      await sendConfirmationEmail(req.user.email, transactionDetails);

      res.json({
        success: true,
        message: "Payment completed successfully",
        newBalance: newBalance,
        receipt: {
          transactionCode: transaction.transaction_code,
          studentId: transaction.student_id,
          amount: amount,
          completedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Payment confirmation error:", error);
      res.status(500).json({ error: "Server error" });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
