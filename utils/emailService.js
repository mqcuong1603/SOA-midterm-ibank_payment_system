import { createTransport } from "nodemailer";

const transporter = createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOTPEmail = async (email, otp, transactionCode) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "OTP for Tuition Payment - iBanking",
    html: `
            <h2>iBanking Tuition Payment</h2>
            <p>Your OTP code for transaction ${transactionCode} is:</p>
            <h1 style="color: #4CAF50; font-size: 32px;">${otp}</h1>
            <p>This code will expire in 5 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
};

const sendConfirmationEmail = async (email, transactionDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Payment Confirmation - iBanking",
    html: `
            <h2>Payment Successful!</h2>
            <p>Your tuition payment has been processed successfully.</p>
            <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
                <p><strong>Transaction Code:</strong> ${
                  transactionDetails.transactionCode
                }</p>
                <p><strong>Student ID:</strong> ${
                  transactionDetails.studentId
                }</p>
                <p><strong>Amount:</strong> ${transactionDetails.amount.toLocaleString()} VND</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>New Balance:</strong> ${transactionDetails.newBalance.toLocaleString()} VND</p>
            </div>
            <p>Thank you for using iBanking!</p>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Confirmation email error:", error);
    return false;
  }
};

export default { sendOTPEmail, sendConfirmationEmail };
