import { Router } from "express";
import { execute } from "../config/database";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Get student information by ID
router.get("/:studentId", authenticateToken, async (req, res) => {
  const { studentId } = req.params;

  try {
    const [students] = await execute(
      "SELECT * FROM students WHERE student_id = ?",
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = students[0];
    res.json({
      studentId: student.student_id,
      studentName: student.full_name,
      tuitionAmount: parseFloat(student.tuition_amount),
      isPaid: student.is_paid,
      academicYear: student.academic_year,
      semester: student.semester,
      dueDate: student.due_date,
    });
  } catch (error) {
    console.error("Student fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
