import express from "express";
import { v4 as uuidv4 } from "uuid";
import pool, { getConnection } from "../config/database.js";
import redisClient from "../config/redis.js";
import { authenticateToken } from "../middleware/auth.js";
import { generateOTP } from "../utils/otpGenerator.js";
import { sendOTPEmail, sendConfirmationEmail } from "../utils/emailService.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Initiate payment
router.post(
  "/initiate",
  authenticateToken,
  [body("studentId").notEmpty().withMessage("Student ID is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId } = req.body; // Only get studentId
    const userId = req.user.id;

    // Additional validation to ensure userId exists
    if (!userId) {
      return res.status(401).json({ error: "User authentication required" });
    }

    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      // Check for existing locks on this student's tuition
      console.log(
        `🔍 Checking for existing locks on student ${studentId} and user ${userId}...`
      );
      const [existingStudentLocks] = await connection.execute(
        "SELECT * FROM transaction_locks WHERE resource_type = 'student_tuition' AND resource_id = ? AND expires_at > NOW()",
        [studentId]
      );

      if (existingStudentLocks.length > 0) {
        await connection.rollback();
        console.log(
          `❌ Payment blocked: Student ${studentId} already has active transaction lock`
        );
        return res.status(409).json({
          error:
            "Another payment is already in progress for this student. Please try again later.",
        });
      }

      // Check for existing locks on this user's account
      const [existingUserLocks] = await connection.execute(
        "SELECT * FROM transaction_locks WHERE resource_type = 'user_account' AND resource_id = ? AND expires_at > NOW()",
        [userId.toString()]
      );

      if (existingUserLocks.length > 0) {
        await connection.rollback();
        console.log(
          `❌ Payment blocked: User ${userId} already has active transaction lock`
        );
        return res.status(409).json({
          error:
            "You already have a payment in progress. Please complete or wait for it to expire.",
        });
      }

      // Get student info including tuition amount
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

      // Use the tuition amount from database
      const amount = parseFloat(students[0].tuition_amount);

      // Check user balance
      const [users] = await connection.execute(
        "SELECT balance FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );

      if (parseFloat(users[0].balance) < amount) {
        await connection.rollback();
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Create transaction with amount from database
      const transactionCode =
        "TXN" + Date.now() + uuidv4().substring(0, 8).toUpperCase();

      const [result] = await connection.execute(
        "INSERT INTO transactions (transaction_code, payer_id, student_id, amount, status) VALUES (?, ?, ?, ?, ?)",
        [transactionCode, userId, studentId, amount, "pending"]
      );

      const transactionId = result.insertId;

      // Create initial locks to prevent concurrent payments for same student
      console.log(
        `🔒 Creating initial locks for transaction ${transactionId}...`
      );
      try {
        // Lock 1: Student tuition lock (prevents multiple payments for same student)
        await connection.execute(
          "INSERT INTO transaction_locks (resource_type, resource_id, transaction_id, expires_at) VALUES (?, ?, ?, ?)",
          [
            "student_tuition",
            studentId,
            transactionId,
            new Date(Date.now() + 10 * 60 * 1000), // 10 minutes lock
          ]
        );
        console.log(`✅ Student lock created for student ${studentId}`);

        // Lock 2: User account lock (prevents same user from making multiple payments)
        await connection.execute(
          "INSERT INTO transaction_locks (resource_type, resource_id, transaction_id, expires_at) VALUES (?, ?, ?, ?)",
          [
            "user_account",
            userId.toString(),
            transactionId,
            new Date(Date.now() + 10 * 60 * 1000), // 10 minutes lock
          ]
        );
        console.log(`✅ User account lock created for user ${userId}`);
      } catch (lockError) {
        await connection.rollback();
        console.log(`❌ Failed to create locks:`, lockError.message);
        return res.status(409).json({
          error:
            "Another payment is already in progress. Please try again later.",
        });
      }

      await connection.commit();

      res.json({
        transactionId: transactionId,
        transactionCode,
        studentId,
        studentName: students[0].full_name,
        amount,
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId } = req.body;
    const userId = req.user.id;

    // Additional validation to ensure userId exists
    if (!userId) {
      return res.status(401).json({ error: "User authentication required" });
    }

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

      const transaction = transactions[0];

      // Check if locks still exist for this transaction (verify transaction is still valid)
      console.log(
        `🔍 Verifying locks exist for student ${transaction.student_id} and user ${userId} before sending OTP...`
      );
      const [studentLockCheck] = await pool.execute(
        "SELECT * FROM transaction_locks WHERE resource_type = 'student_tuition' AND resource_id = ? AND transaction_id = ? AND expires_at > NOW()",
        [transaction.student_id, transactionId]
      );

      const [userLockCheck] = await pool.execute(
        "SELECT * FROM transaction_locks WHERE resource_type = 'user_account' AND resource_id = ? AND transaction_id = ? AND expires_at > NOW()",
        [userId.toString(), transactionId]
      );

      if (studentLockCheck.length === 0 || userLockCheck.length === 0) {
        console.log(
          `❌ Locks expired or missing for student ${transaction.student_id} or user ${userId}`
        );
        return res.status(409).json({
          error: "Transaction session has expired. Please start a new payment.",
        });
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
    body("transactionId")
      .notEmpty()
      .isNumeric()
      .withMessage("Transaction ID is required and must be numeric"),
    body("otpCode")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP code must be exactly 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId, otpCode } = req.body;
    const userId = req.user.id;

    // Additional validation to ensure userId exists
    if (!userId) {
      return res.status(401).json({ error: "User authentication required" });
    }

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
  [
    body("transactionId")
      .notEmpty()
      .isNumeric()
      .withMessage("Transaction ID is required and must be numeric"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId } = req.body;
    const userId = req.user.id;

    // Additional validation to ensure userId exists
    if (!userId) {
      return res.status(401).json({ error: "User authentication required" });
    }

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

      // Verify existing locks (don't create new ones)
      console.log(
        `🔍 Verifying existing locks for transaction ${transactionId}...`
      );
      const [userLock] = await connection.execute(
        "SELECT * FROM transaction_locks WHERE resource_type = 'user_account' AND resource_id = ? AND transaction_id = ? AND expires_at > NOW()",
        [userId.toString(), transactionId]
      );

      const [studentLock] = await connection.execute(
        "SELECT * FROM transaction_locks WHERE resource_type = 'student_tuition' AND resource_id = ? AND transaction_id = ? AND expires_at > NOW()",
        [transaction.student_id, transactionId]
      );

      if (userLock.length === 0 || studentLock.length === 0) {
        await connection.rollback();
        console.log(
          `❌ Missing or expired locks for transaction ${transactionId}`
        );
        return res.status(409).json({
          error: "Transaction session has expired. Please start a new payment.",
        });
      }

      console.log(`✅ Locks verified for transaction ${transactionId}`);

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

// Check for user's active transaction
router.get("/check-active", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current lock
    const [userLocks] = await pool.execute(
      `
        SELECT tl.*, t.transaction_code, t.status, t.student_id, s.full_name as student_name
        FROM transaction_locks tl
        JOIN transactions t ON tl.transaction_id = t.id
        LEFT JOIN students s ON t.student_id = s.student_id
        WHERE tl.resource_type = 'user_account' 
          AND tl.resource_id = ? 
          AND tl.expires_at > NOW()
      `,
      [userId.toString()]
    );

    if (userLocks.length === 0) {
      return res.json({
        hasActiveTransaction: false,
        message: "No active transaction found",
      });
    }

    const lock = userLocks[0];
    res.json({
      hasActiveTransaction: true,
      transaction: {
        id: lock.transaction_id,
        code: lock.transaction_code,
        status: lock.status,
        studentId: lock.student_id,
        studentName: lock.student_name,
        lockedAt: lock.locked_at,
        expiresAt: lock.expires_at,
      },
    });
  } catch (error) {
    console.error("Error fetching user transaction:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Cancel user's current transaction
router.delete("/cancel-active", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get user's current transaction
      const [userLocks] = await connection.execute(
        `
          SELECT transaction_id FROM transaction_locks 
          WHERE resource_type = 'user_account' 
            AND resource_id = ? 
            AND expires_at > NOW()
        `,
        [userId.toString()]
      );

      if (userLocks.length === 0) {
        await connection.rollback();
        return res.json({ message: "No active transaction to cancel" });
      }

      const transactionId = userLocks[0].transaction_id;

      // Delete all locks for this transaction
      await connection.execute(
        "DELETE FROM transaction_locks WHERE transaction_id = ?",
        [transactionId]
      );

      // Update transaction status to cancelled
      await connection.execute(
        "UPDATE transactions SET status = 'cancelled' WHERE id = ?",
        [transactionId]
      );

      await connection.commit();

      console.log(
        `🗑️ Transaction ${transactionId} cancelled by user ${userId}`
      );
      res.json({
        success: true,
        message: `Transaction ${transactionId} has been cancelled`,
        transactionId: transactionId,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error cancelling transaction:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get OTP status and remaining time
router.get(
  "/otp-status/:transactionId",
  authenticateToken,
  async (req, res) => {
    try {
      const { transactionId } = req.params;
      const userId = req.user.id;

      // Get the latest OTP for this transaction
      const [otpCodes] = await pool.execute(
        "SELECT * FROM otp_codes WHERE transaction_id = ? AND email = ? ORDER BY created_at DESC LIMIT 1",
        [transactionId, req.user.email]
      );

      if (otpCodes.length === 0) {
        return res.json({
          hasOtp: false,
          message: "No OTP found for this transaction",
        });
      }

      const otp = otpCodes[0];
      const now = new Date();
      const expiresAt = new Date(otp.expires_at);
      const remainingMs = expiresAt.getTime() - now.getTime();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

      res.json({
        hasOtp: true,
        remainingSeconds: remainingSeconds,
        expiresAt: expiresAt.toISOString(),
        isExpired: remainingSeconds <= 0,
      });
    } catch (error) {
      console.error("Error getting OTP status:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
