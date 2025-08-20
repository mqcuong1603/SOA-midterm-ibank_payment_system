import express, { json, urlencoded } from "express";
import cors from "cors";
import { config } from "dotenv";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import studentRoutes from "./routes/student";
import paymentRoutes from "./routes/payment";
import transactionRoutes from "./routes/transaction";

config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/transactions", transactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
