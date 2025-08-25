// History page JavaScript
let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 10;

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadHistory();
});

// Remove loadUserInfo from here since navbar.js handles it

async function loadHistory() {
  console.log("Loading transaction history..."); // Debug log
  try {
    const offset = (currentPage - 1) * itemsPerPage;

    const params = {
      limit: itemsPerPage,
      offset: offset,
    };

    console.log("API params:", params); // Debug log
    const response = await API.transactions.getHistory(params);
    console.log("API response status:", response.status); // Debug log

    const data = await response.json();
    console.log("API response data:", data); // Debug log

    if (response.ok) {
      displayTransactions(data.transactions);
      setupPagination(data.total);
    } else {
      console.error("API error:", data); // Debug log
      showError("Failed to load transaction history");
    }
  } catch (error) {
    console.error("Error loading history:", error);
    showError("Error loading transaction history");
  }
}

function displayTransactions(transactions) {
  const tbody = document.getElementById("historyTableBody");

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">No transactions found</td></tr>';
    return;
  }

  tbody.innerHTML = transactions
    .map(
      (transaction) => `
        <tr>
            <td><small>${transaction.transactionCode}</small></td>
            <td>${transaction.studentId}</td>
            <td>${transaction.studentName || "-"}</td>
            <td>${formatCurrency(transaction.amount)}</td>
            <td>${getStatusBadge(transaction.status)}</td>
            <td>${formatDateTime(transaction.createdAt)}</td>
        </tr>
    `
    )
    .join("");
}

function setupPagination(total) {
  totalPages = Math.ceil(total / itemsPerPage);
  const pagination = document.getElementById("pagination");

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let paginationHTML = "";

  // Previous button
  paginationHTML += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${
              currentPage - 1
            })">Previous</a>
        </li>
    `;

  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
  }

  // Next button
  paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${
              currentPage + 1
            })">Next</a>
        </li>
    `;

  pagination.innerHTML = paginationHTML;
}

function changePage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  loadHistory();
}

async function exportHistory() {
  try {
    // Fetch all transactions for export
    const response = await API.transactions.getHistory({ limit: 1000 });
    const data = await response.json();

    if (response.ok && data.transactions) {
      const exportData = data.transactions.map((t) => ({
        "Transaction Code": t.transactionCode,
        "Student ID": t.studentId,
        "Student Name": t.studentName || "-",
        Amount: t.amount,
        Status: t.status,
        Date: formatDateTime(t.createdAt),
      }));

      exportToCSV(
        exportData,
        `transaction_history_${new Date().toISOString().split("T")[0]}.csv`
      );
      showToast("History exported successfully", "success");
    }
  } catch (error) {
    console.error("Error exporting history:", error);
    showToast("Failed to export history", "danger");
  }
}

function showError(message) {
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${message}</td></tr>`;
}

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
