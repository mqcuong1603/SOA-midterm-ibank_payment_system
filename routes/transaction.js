import { Router } from "express";
import { execute } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Get transaction history
router.get("/history", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const [transactions] = await execute(
      `SELECT t.transaction_code, t.amount, t.status, t.created_at, t.completed_at,
                    s.student_id, s.full_name as student_name
             FROM transactions t
             JOIN students s ON t.student_id = s.student_id
             WHERE t.payer_id = ?
             ORDER BY t.created_at DESC
             LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await execute(
      "SELECT COUNT(*) as total FROM transactions WHERE payer_id = ?",
      [userId]
    );

    res.json({
      transactions: transactions.map((t) => ({
        transactionCode: t.transaction_code,
        studentId: t.student_id,
        studentName: t.student_name,
        amount: parseFloat(t.amount),
        status: t.status,
        createdAt: t.created_at,
        completedAt: t.completed_at,
      })),
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Transaction history error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
