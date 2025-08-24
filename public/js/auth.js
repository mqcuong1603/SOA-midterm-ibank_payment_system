const API_URL = "http://localhost:3000/api";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Login successful, storing user data:", data.user); // Debug log

      // Clear any existing session data first
      sessionStorage.clear();

      // Store new user data in sessionStorage (tab-specific)
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      console.log(
        "Stored user data:",
        JSON.parse(sessionStorage.getItem("user"))
      ); // Debug log

      window.location.href = "payment.html";
    } else {
      showAlert("loginAlert", data.error || "Login failed", "danger");
    }
  } catch (error) {
    showAlert("loginAlert", "Connection error", "danger");
  }
});

document
  .getElementById("togglePassword")
  .addEventListener("click", function () {
    const passwordInput = document.getElementById("password");
    const icon = this.querySelector("i");

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      icon.classList.replace("bi-eye", "bi-eye-slash");
    } else {
      passwordInput.type = "password";
      icon.classList.replace("bi-eye-slash", "bi-eye");
    }
  });

function showAlert(id, message, type) {
  const alert = document.getElementById(id);
  alert.className = `alert alert-${type} mt-3`;
  alert.textContent = message;
}
