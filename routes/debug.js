import express from "express";
import pool from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get all current locks
router.get("/locks", async (req, res) => {
  try {
    const [locks] = await pool.execute(`
      SELECT tl.*, t.transaction_code, t.status as transaction_status, 
             s.full_name as student_name, u.email as user_email
      FROM transaction_locks tl
      LEFT JOIN transactions t ON tl.transaction_id = t.id
      LEFT JOIN students s ON tl.resource_id = s.student_id AND tl.resource_type = 'student_tuition'
      LEFT JOIN users u ON tl.resource_id = u.id AND tl.resource_type = 'user_account'
      WHERE tl.expires_at > NOW()
      ORDER BY tl.locked_at DESC
    `);

    res.json({
      activeLocks: locks.length,
      locks: locks,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching locks:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get user's current active transaction
router.get("/my-transaction", authenticateToken, async (req, res) => {
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

// Cancel user's current transaction (admin/debug only)
router.delete("/cancel-my-transaction", authenticateToken, async (req, res) => {
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

export default router;
