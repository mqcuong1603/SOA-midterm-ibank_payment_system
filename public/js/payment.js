let currentTransaction = null;
let otpTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  setupOTPInputs();

  // Check if this is a resume operation
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("resume") === "true") {
    const transactionId = urlParams.get("transactionId");
    const studentId = urlParams.get("studentId");

    if (transactionId && studentId) {
      resumePayment(transactionId, studentId);
    }
  } else {
    // Check if user has an active transaction
    checkForActiveTransaction();
  }
});

async function checkForActiveTransaction() {
  try {
    const response = await apiCall("/payment/check-active");
    const data = await response.json();

    if (data.hasActiveTransaction) {
      // Show alert about active transaction
      const alertDiv = document.getElementById("paymentAlert");
      alertDiv.className = "alert alert-warning mt-3";
      alertDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle"></i>
        <strong>Active Transaction Found!</strong> 
        You have an incomplete payment for student ${data.transaction.studentId}. 
        <button class="btn btn-sm btn-outline-primary ms-2" onclick="continueActiveTransaction('${data.transaction.id}', '${data.transaction.studentId}')">Continue Payment</button>
        <button class="btn btn-sm btn-outline-danger ms-1" onclick="cancelActiveTransaction()">Cancel Transaction</button>
      `;
      alertDiv.classList.remove("d-none");

      // Disable the form
      document.getElementById("studentId").disabled = true;
      document.getElementById("proceedBtn").disabled = true;
    }
  } catch (error) {
    console.error("Error checking for active transaction:", error);
  }
}

async function resumePayment(transactionId, studentId) {
  try {
    // Set the current transaction
    currentTransaction = {
      transactionId: parseInt(transactionId),
      studentId: studentId,
    };

    // Get student information
    const studentResponse = await apiCall(`/student/${studentId}`);
    const studentData = await studentResponse.json();

    if (studentResponse.ok) {
      // Fill in student information
      document.getElementById("studentId").value = studentId;
      document.getElementById("studentName").value = studentData.studentName;
      document.getElementById("tuitionAmount").value = formatCurrency(
        studentData.tuitionAmount
      );
      document.getElementById("academicYear").value = studentData.academicYear;
      document.getElementById(
        "semester"
      ).value = `Semester ${studentData.semester}`;

      // Show OTP step directly
      showStep(2);

      // Check if there's an existing OTP and get remaining time
      checkExistingOTP(transactionId);

      // Show resume alert
      const alertDiv = document.getElementById("paymentAlert");
      alertDiv.className = "alert alert-info mt-3";
      alertDiv.innerHTML = `
        <i class="bi bi-info-circle"></i>
        <strong>Resuming Payment</strong> for student ${studentId}. 
        Check your email for the OTP or request a new one.
      `;
      alertDiv.classList.remove("d-none");
    } else {
      throw new Error("Failed to load student information");
    }
  } catch (error) {
    console.error("Error resuming payment:", error);
    alert("Error resuming payment. Please start a new payment.");
    window.location.href = "/payment.html";
  }
}

async function searchStudent() {
  const studentId = document.getElementById("studentId").value;

  if (!studentId) {
    alert("Please enter a student ID");
    return;
  }

  const response = await apiCall(`/student/${studentId}`);
  const data = await response.json();

  if (response.ok) {
    document.getElementById("studentName").value = data.studentName;
    document.getElementById("tuitionAmount").value = formatCurrency(
      data.tuitionAmount
    );
    document.getElementById("academicYear").value = data.academicYear;
    document.getElementById("semester").value = `Semester ${data.semester}`;

    document.getElementById("termsCheck").addEventListener("change", (e) => {
      document.getElementById("proceedBtn").disabled = !e.target.checked;
    });
  } else {
    alert(data.error || "Student not found");
  }
}

async function proceedToOTP() {
  const studentId = document.getElementById("studentId").value;

  // Show loading state
  showButtonLoading("proceedBtn", "proceedBtnText", "proceedBtnLoading");

  try {
    const response = await apiCall("/payment/initiate", "POST", { studentId });
    const data = await response.json();

    if (response.ok) {
      currentTransaction = data;

      // Send OTP
      const otpResponse = await apiCall("/payment/send-otp", "POST", {
        transactionId: data.transactionId,
      });

      if (otpResponse.ok) {
        showStep(2);
        startOTPTimer();
      } else {
        const otpData = await otpResponse.json();
        alert(otpData.error || "Failed to send OTP");
      }
    } else {
      alert(data.error || "Payment initiation failed");
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    alert("An error occurred. Please try again.");
  } finally {
    // Hide loading state
    hideButtonLoading("proceedBtn", "proceedBtnText", "proceedBtnLoading");
  }
}

function showStep(step) {
  document
    .querySelectorAll(".payment-step")
    .forEach((s) => s.classList.add("d-none"));
  document.getElementById(`step${step}`).classList.remove("d-none");

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;
  const progressBar = document.getElementById("progressBar");
  progressBar.style.width = `${progress}%`;
  progressBar.textContent = `Step ${step} of 3`;
}

function setupOTPInputs() {
  const inputs = document.querySelectorAll(".otp-input");

  inputs.forEach((input, index) => {
    // Handle input events for auto-focus and numeric-only input
    input.addEventListener("input", (e) => {
      // Only allow numeric input
      e.target.value = e.target.value.replace(/\D/g, "");

      // Auto-focus to next input if current has value
      if (e.target.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    // Handle backspace for auto-focus to previous input
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    // Handle paste event to distribute OTP across all inputs
    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text");
      const cleanedData = pastedData.replace(/\D/g, ""); // Remove non-digits

      if (cleanedData.length === 6) {
        inputs.forEach((input, i) => {
          input.value = cleanedData[i] || "";
        });
        // Focus on the last input after pasting
        inputs[5].focus();
      } else if (cleanedData.length > 0) {
        // If not exactly 6 digits, paste what we can starting from current input
        for (
          let i = 0;
          i < cleanedData.length && index + i < inputs.length;
          i++
        ) {
          inputs[index + i].value = cleanedData[i];
        }
        // Focus on the next empty input or the last one
        const nextIndex = Math.min(
          index + cleanedData.length,
          inputs.length - 1
        );
        inputs[nextIndex].focus();
      }
    });
  });
}

function startOTPTimer(initialSeconds = 300) {
  let seconds = initialSeconds;
  otpTimer = setInterval(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById("otpTimer").textContent = `${mins}:${secs
      .toString()
      .padStart(2, "0")}`;

    if (seconds === 0) {
      clearInterval(otpTimer);
      document.getElementById("otpTimer").textContent = "OTP Expired";
      document.getElementById("verifyBtn").disabled = true;
    }
    seconds--;
  }, 1000);
}

async function resendOTP() {
  if (!currentTransaction) {
    alert("No active transaction found");
    return;
  }

  try {
    const response = await apiCall("/payment/send-otp", "POST", {
      transactionId: currentTransaction.transactionId,
    });

    if (response.ok) {
      // Clear existing timer and start new one
      if (otpTimer) clearInterval(otpTimer);
      startOTPTimer();

      // Clear OTP inputs
      document.querySelectorAll(".otp-input").forEach((input) => {
        input.value = "";
      });
      document.querySelector(".otp-input").focus();

      alert("OTP resent successfully!");
    } else {
      const data = await response.json();
      alert(data.error || "Failed to resend OTP");
    }
  } catch (error) {
    console.error("Resend OTP error:", error);
    alert("An error occurred. Please try again.");
  }
}

async function verifyOTP() {
  const inputs = document.querySelectorAll(".otp-input");
  const otp = Array.from(inputs)
    .map((i) => i.value)
    .join("");

  if (otp.length !== 6) {
    alert("Please enter complete OTP");
    return;
  }

  // Show loading state
  showButtonLoading("verifyBtn", "verifyBtnText", "verifyBtnLoading");

  try {
    const response = await apiCall("/payment/verify-otp", "POST", {
      transactionId: currentTransaction.transactionId,
      otpCode: otp,
    });

    if (response.ok) {
      clearInterval(otpTimer);
      document.getElementById("confirmStudentId").textContent =
        document.getElementById("studentId").value;
      document.getElementById("confirmStudentName").textContent =
        document.getElementById("studentName").value;
      document.getElementById("confirmAmount").textContent =
        document.getElementById("tuitionAmount").value;
      showStep(3);
    } else {
      const data = await response.json();
      alert(data.error || "Invalid OTP");
    }
  } catch (error) {
    console.error("OTP verification error:", error);
    alert("An error occurred. Please try again.");
  } finally {
    // Hide loading state
    hideButtonLoading("verifyBtn", "verifyBtnText", "verifyBtnLoading");
  }
}

async function confirmPayment() {
  const response = await apiCall("/payment/confirm", "POST", {
    transactionId: currentTransaction.transactionId,
  });

  const data = await response.json();

  if (response.ok) {
    alert("Payment successful!");
    window.location.href = "history.html";
  } else {
    alert(data.error || "Payment failed");
  }
}

function cancelPayment() {
  if (confirm("Are you sure you want to cancel?")) {
    window.location.href = "payment.html";
  }
}

// Helper functions for loading states
function showButtonLoading(buttonId, textId, loadingId) {
  const button = document.getElementById(buttonId);
  const textElement = document.getElementById(textId);
  const loadingElement = document.getElementById(loadingId);

  if (button && textElement && loadingElement) {
    button.disabled = true;
    textElement.classList.add("d-none");
    loadingElement.classList.remove("d-none");
  }
}

function hideButtonLoading(buttonId, textId, loadingId) {
  const button = document.getElementById(buttonId);
  const textElement = document.getElementById(textId);
  const loadingElement = document.getElementById(loadingId);

  if (button && textElement && loadingElement) {
    button.disabled = false;
    textElement.classList.remove("d-none");
    loadingElement.classList.add("d-none");
  }
}

// Helper functions for active transaction management
async function checkExistingOTP(transactionId) {
  try {
    const response = await apiCall(`/payment/otp-status/${transactionId}`);
    const data = await response.json();

    if (data.hasOtp && !data.isExpired && data.remainingSeconds > 0) {
      // Start timer with actual remaining time
      console.log(
        `Starting OTP timer with ${data.remainingSeconds} seconds remaining`
      );
      startOTPTimer(data.remainingSeconds);

      // Update alert to show existing OTP
      const alertDiv = document.getElementById("paymentAlert");
      alertDiv.className = "alert alert-success mt-3";
      alertDiv.innerHTML = `
        <i class="bi bi-check-circle"></i>
        <strong>Active OTP Found!</strong> 
        Check your email for the OTP code. Time remaining: <span class="fw-bold">${Math.floor(
          data.remainingSeconds / 60
        )}:${(data.remainingSeconds % 60).toString().padStart(2, "0")}</span>
      `;
    } else {
      // No valid OTP, user needs to request new one
      document.getElementById("otpTimer").textContent = "No active OTP";
      const alertDiv = document.getElementById("paymentAlert");
      alertDiv.className = "alert alert-warning mt-3";
      alertDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle"></i>
        <strong>No Active OTP</strong> 
        Please request a new OTP to continue.
      `;
    }
  } catch (error) {
    console.error("Error checking OTP status:", error);
    // Fallback to requesting new OTP
    document.getElementById("otpTimer").textContent = "Request OTP";
  }
}

function continueActiveTransaction(transactionId, studentId) {
  const params = new URLSearchParams({
    resume: "true",
    transactionId: transactionId,
    studentId: studentId,
  });

  window.location.href = `/payment.html?${params.toString()}`;
}

async function cancelActiveTransaction() {
  if (
    !confirm(
      "Are you sure you want to cancel your active transaction? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    const response = await apiCall("/payment/cancel-active", "DELETE");
    const data = await response.json();

    if (data.success) {
      alert("Transaction cancelled successfully!");
      window.location.reload();
    } else {
      alert("Failed to cancel transaction: " + data.message);
    }
  } catch (error) {
    console.error("Error cancelling transaction:", error);
    alert("Error cancelling transaction");
  }
}
