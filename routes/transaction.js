import { Router } from "express";
import { execute } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Get transaction history
router.get("/history", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  let { limit = 10, offset = 0 } = req.query;

  // Check if userId exists
  if (!userId) {
    return res.status(401).json({ error: "User authentication required" });
  }

  // Validate and sanitize limit and offset
  limit = parseInt(limit) || 10;
  offset = parseInt(offset) || 0;

  // Ensure positive values and reasonable limits
  limit = Math.min(Math.max(1, limit), 100); // Between 1 and 100
  offset = Math.max(0, offset); // Non-negative

  console.log("Debug - userId:", userId, "limit:", limit, "offset:", offset);

  try {
    // Use string concatenation for LIMIT and OFFSET to avoid parameter binding issues
    const [transactions] = await execute(
      `SELECT t.transaction_code, t.amount, t.status, t.created_at, t.completed_at,
                    s.student_id, s.full_name as student_name
             FROM transactions t
             JOIN students s ON t.student_id = s.student_id
             WHERE t.payer_id = ?
             ORDER BY t.created_at DESC
             LIMIT ${limit} OFFSET ${offset}`,
      [userId]
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
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    console.error("Transaction history error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
