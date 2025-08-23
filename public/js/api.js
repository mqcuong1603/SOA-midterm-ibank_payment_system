// API communication module
const API_URL = "http://localhost:3000/api";

// Main API call function with authentication
async function apiCall(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("token");

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  // Add authorization header if token exists
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  // Add body if provided
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);

    // Handle unauthorized access
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = "index.html";
      return;
    }

    return response;
  } catch (error) {
    console.error("API call error:", error);
    throw error;
  }
}

// Check if user is authenticated
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// Get current user from localStorage
function getCurrentUser() {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

// Update user in localStorage
function updateStoredUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

// API endpoints wrapper functions
const API = {
  // Authentication
  auth: {
    login: (username, password) =>
      apiCall("/auth/login", "POST", { username, password }),

    logout: () => {
      localStorage.clear();
      window.location.href = "index.html";
    },
  },

  // User
  user: {
    getProfile: () => apiCall("/user/profile"),
    updateProfile: (data) => apiCall("/user/profile", "PUT", data),
  },

  // Student
  student: {
    getInfo: (studentId) => apiCall(`/student/${studentId}`),
  },

  // Payment
  payment: {
    initiate: (studentId, amount) =>
      apiCall("/payment/initiate", "POST", { studentId, amount }),

    sendOTP: (transactionId) =>
      apiCall("/payment/send-otp", "POST", { transactionId }),

    verifyOTP: (transactionId, otpCode) =>
      apiCall("/payment/verify-otp", "POST", { transactionId, otpCode }),

    confirm: (transactionId) =>
      apiCall("/payment/confirm", "POST", { transactionId }),
  },

  // Transactions
  transactions: {
    getHistory: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(
        `/transactions/history${queryString ? "?" + queryString : ""}`
      );
    },

    getDetails: (transactionCode) =>
      apiCall(`/transactions/${transactionCode}`),
  },
};
