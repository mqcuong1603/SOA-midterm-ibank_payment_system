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

/* =========================
   Application Modal System
   Replaces native alert()/confirm()
   ========================= */
(function initAppModal() {
  if (document.getElementById("appMessageModal")) return;
  const modalHtml = `
  <div class="modal fade" id="appMessageModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="appModalTitle">Message</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body text-center">
          <div id="appModalIcon" class="app-modal-icon info d-none"><i class="bi bi-info-circle"></i></div>
          <p id="appModalMessage" class="mb-0"></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="appModalCancelBtn" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="appModalOkBtn">OK</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
})();

function appModalBase({
  title = "Message",
  message = "",
  type = "info",
  showCancel = false,
  confirmText = "OK",
  cancelText = "Cancel",
  autoCloseMs = 0,
}) {
  const modalEl = document.getElementById("appMessageModal");
  const titleEl = document.getElementById("appModalTitle");
  const messageEl = document.getElementById("appModalMessage");
  const iconWrap = document.getElementById("appModalIcon");
  const okBtn = document.getElementById("appModalOkBtn");
  const cancelBtn = document.getElementById("appModalCancelBtn");

  titleEl.textContent = title;
  messageEl.textContent = message;
  iconWrap.className = `app-modal-icon ${type}`;
  iconWrap.innerHTML =
    {
      info: '<i class="bi bi-info-circle"></i>',
      success: '<i class="bi bi-check-circle"></i>',
      warning: '<i class="bi bi-exclamation-triangle"></i>',
      danger: '<i class="bi bi-x-circle"></i>',
    }[type] || '<i class="bi bi-info-circle"></i>';
  iconWrap.classList.remove("d-none");

  cancelBtn.style.display = showCancel ? "inline-block" : "none";
  okBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;

  return new Promise((resolve) => {
    const bsModal = new bootstrap.Modal(modalEl);
    const cleanup = () => {
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      modalEl.removeEventListener("hidden.bs.modal", onHidden);
    };
    const onOk = () => {
      resolve(true);
      bsModal.hide();
    };
    const onCancel = () => {
      resolve(false);
    };
    const onHidden = () => cleanup();
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    modalEl.addEventListener("hidden.bs.modal", onHidden);
    bsModal.show();
    if (autoCloseMs > 0)
      setTimeout(() => {
        if (modalEl.classList.contains("show")) {
          resolve(true);
          bsModal.hide();
        }
      }, autoCloseMs);
  });
}

function appAlert(message, options = {}) {
  return appModalBase({ message, ...options, showCancel: false });
}

function appConfirm(message, options = {}) {
  return appModalBase({
    message,
    ...options,
    showCancel: true,
    confirmText: options.confirmText || "Yes",
    cancelText: options.cancelText || "No",
  });
}

// Replace native alert/confirm wrappers (optional)
window.alert = (msg) => appAlert(msg);
window.confirm = (msg) => {
  // Return a boolean synchronously via deprecation warning? We'll return false immediately & use async variant where refactored.
  console.warn(
    "Synchronous confirm() overridden. Use appConfirm(). Returning false. Message:",
    msg
  );
  return false;
};

// Export for other scripts if modules not used
window.appAlert = appAlert;
window.appConfirm = appConfirm;

/* =========================
   Email Inbox Helper
   ========================= */
function getInboxUrl(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) return null;
  const domain = email.split("@").pop().toLowerCase();
  const map = {
    "gmail.com": "https://mail.google.com/mail/u/0/#inbox",
    "googlemail.com": "https://mail.google.com/mail/u/0/#inbox",
    "outlook.com": "https://outlook.live.com/mail/0/",
    "hotmail.com": "https://outlook.live.com/mail/0/",
    "live.com": "https://outlook.live.com/mail/0/",
    "msn.com": "https://outlook.live.com/mail/0/",
    "yahoo.com": "https://mail.yahoo.com/d/folders/1",
    "yahoo.com.vn": "https://mail.yahoo.com/d/folders/1",
    "icloud.com": "https://www.icloud.com/mail",
    "proton.me": "https://mail.proton.me/u/0/inbox",
    "protonmail.com": "https://mail.proton.me/u/0/inbox",
    "zoho.com": "https://mail.zoho.com/zm/#mail/folder/inbox",
    "yandex.com": "https://mail.yandex.com/",
    "yandex.ru": "https://mail.yandex.ru/",
  };
  return map[domain] || null;
}

function openInbox(email) {
  const url = getInboxUrl(email);
  if (url) {
    window.open(url, "_blank", "noopener");
  } else {
    // Fallback: try generic webmail subdomain or search
    const domain = (email || "").split("@").pop();
    const guess = `https://mail.${domain}`;
    // Open guess first; user can adjust. Also open a search tab if guess likely invalid.
    window.open(guess, "_blank", "noopener");
    setTimeout(() => {
      window.open(
        `https://www.google.com/search?q=${encodeURIComponent(
          domain + " webmail login"
        )}`,
        "_blank",
        "noopener"
      );
    }, 400);
  }
}

// Expose globally
window.openInbox = openInbox;
window.getInboxUrl = getInboxUrl;
