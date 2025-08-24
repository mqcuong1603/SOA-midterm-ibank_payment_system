// Utility functions shared across all pages

// Format currency to Vietnamese Dong
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

// Format date and time
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get status badge HTML
function getStatusBadge(status) {
  const badges = {
    completed: '<span class="badge bg-success">Completed</span>',
    pending: '<span class="badge bg-warning">Pending</span>',
    failed: '<span class="badge bg-danger">Failed</span>',
    otp_sent: '<span class="badge bg-info">OTP Sent</span>',
    otp_verified: '<span class="badge bg-primary">Verified</span>',
    cancelled: '<span class="badge bg-secondary">Cancelled</span>',
  };
  return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

// Show alert message
function showAlert(elementId, message, type = "danger") {
  const alertElement = document.getElementById(elementId);
  if (alertElement) {
    alertElement.className = `alert alert-${type}`;
    alertElement.textContent = message;
    alertElement.classList.remove("d-none");

    // Auto hide after 5 seconds
    setTimeout(() => {
      alertElement.classList.add("d-none");
    }, 5000);
  }
}

// Show toast notification
function showToast(message, type = "success") {
  const toastHtml = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className =
      "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(toastContainer);
  }

  // Add toast to container
  const toastElement = document.createElement("div");
  toastElement.innerHTML = toastHtml;
  toastContainer.appendChild(toastElement);

  // Initialize and show toast
  const toast = new bootstrap.Toast(toastElement.firstElementChild);
  toast.show();

  // Remove after hidden
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

// Validate email format
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate phone number (Vietnamese format)
function validatePhone(phone) {
  const re = /^(0|\+84)[0-9]{9,10}$/;
  return re.test(phone);
}

// Validate student ID (TDTU format)
function validateStudentId(studentId) {
  const re = /^[0-9]{8}$/;
  return re.test(studentId);
}

// Debounce function for search inputs
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export functions for CSV/Excel
function exportToCSV(data, filename) {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function convertToCSV(data) {
  if (!data || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(",");

  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        return typeof value === "string" && value.includes(",")
          ? `"${value}"`
          : value;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
}

// Session timeout warning
let sessionTimeout;
let warningTimeout;

function resetSessionTimeout() {
  clearTimeout(sessionTimeout);
  clearTimeout(warningTimeout);

  // Show warning after 25 minutes
  warningTimeout = setTimeout(() => {
    if (
      confirm("Your session will expire in 5 minutes. Do you want to continue?")
    ) {
      resetSessionTimeout();
    }
  }, 25 * 60 * 1000);

  // Logout after 30 minutes
  sessionTimeout = setTimeout(() => {
    alert("Your session has expired. Please login again.");
    logout();
  }, 30 * 60 * 1000);
}

// Initialize session timeout on page load
if (sessionStorage.getItem("token")) {
  resetSessionTimeout();

  // Reset timeout on user activity
  ["mousedown", "keypress", "scroll", "touchstart"].forEach((event) => {
    document.addEventListener(event, resetSessionTimeout, true);
  });
}

// Common logout function
function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
