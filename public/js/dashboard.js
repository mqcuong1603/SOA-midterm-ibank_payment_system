// Dashboard JavaScript
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadDashboard();
});

async function loadDashboard() {
  try {
    // Load user info
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      document.getElementById("navUsername").textContent = user.fullName;
      document.getElementById("balance").textContent = formatCurrency(
        user.balance
      );
    }

    // Load dashboard statistics
    await loadStatistics();

    // Load recent transactions
    await loadRecentTransactions();
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

async function loadStatistics() {
  try {
    // Load transaction history to calculate statistics
    const response = await apiCall("/transactions/history?limit=100");
    const data = await response.json();

    if (response.ok && data.transactions) {
      const transactions = data.transactions;

      // Calculate statistics
      const completed = transactions.filter(
        (t) => t.status === "completed"
      ).length;
      const pending = transactions.filter((t) => t.status === "pending").length;

      // Calculate this month's transactions
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonth = transactions.filter((t) => {
        const date = new Date(t.createdAt);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      }).length;

      // Update UI
      document.getElementById("completed").textContent = completed;
      document.getElementById("pending").textContent = pending;
      document.getElementById("thisMonth").textContent = thisMonth;
    }
  } catch (error) {
    console.error("Error loading statistics:", error);
  }
}

async function loadRecentTransactions() {
  try {
    const response = await apiCall("/transactions/history?limit=5");
    const data = await response.json();

    if (response.ok && data.transactions) {
      const tbody = document.getElementById("recentTransactions");

      if (data.transactions.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="text-center">No recent transactions</td></tr>';
        return;
      }

      tbody.innerHTML = data.transactions
        .map(
          (transaction) => `
                <tr>
                    <td><small>${transaction.transactionCode}</small></td>
                    <td>${transaction.studentId}</td>
                    <td>${formatCurrency(transaction.amount)}</td>
                    <td>${getStatusBadge(transaction.status)}</td>
                    <td>${formatDate(transaction.createdAt)}</td>
                </tr>
            `
        )
        .join("");
    }
  } catch (error) {
    console.error("Error loading recent transactions:", error);
    document.getElementById("recentTransactions").innerHTML =
      '<tr><td colspan="5" class="text-center text-danger">Error loading transactions</td></tr>';
  }
}

function getStatusBadge(status) {
  const badges = {
    completed: '<span class="badge bg-success">Completed</span>',
    pending: '<span class="badge bg-warning">Pending</span>',
    failed: '<span class="badge bg-danger">Failed</span>',
    otp_sent: '<span class="badge bg-info">OTP Sent</span>',
    otp_verified: '<span class="badge bg-primary">Verified</span>',
  };
  return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}
