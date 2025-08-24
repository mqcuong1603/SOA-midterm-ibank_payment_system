// Navbar functionality
function initializeNavbar() {
  // Set active nav item based on current page
  const currentPage = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "");
  const navItem = document.getElementById("nav-" + currentPage);
  if (navItem) {
    navItem.classList.add("active");
  }

  // Load user info
  loadUserInfo();
}

// Global function to load user info (can be called from other scripts)
function loadUserInfo() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  console.log("Navbar loading user data:", user); // Debug log

  const navUsernameEl = document.getElementById("navUsername");
  const navEmailEl = document.getElementById("navUserEmail");

  console.log("Navbar elements found:", {
    navUsernameEl: !!navUsernameEl,
    navEmailEl: !!navEmailEl,
  }); // Debug log

  if (user.username) {
    // Display full name if available, otherwise username
    const displayName = user.fullName || user.username;

    if (navUsernameEl) {
      navUsernameEl.textContent = displayName;
      console.log("Set username to:", displayName); // Debug log
    }
    if (navEmailEl) {
      navEmailEl.textContent = user.email || "No email";
      console.log("Set email to:", user.email || "No email"); // Debug log
    }
  } else {
    // If no user data, redirect to login
    console.log("No user data found, redirecting to login");
    window.location.href = "index.html";
  }
}

function showProfile() {
  // Clear any existing profile data first
  document.getElementById("profileFullName").textContent = "Loading...";
  document.getElementById("profileUsername").textContent = "Loading...";
  document.getElementById("profileEmail").textContent = "Loading...";
  document.getElementById("profilePhone").textContent = "Loading...";
  document.getElementById("profileBalance").textContent = "Loading...";

  // Show modal immediately
  const modal = new bootstrap.Modal(document.getElementById("profileModal"));
  modal.show();

  // Load fresh profile data
  loadProfileData();
}

async function loadProfileData() {
  try {
    const token = sessionStorage.getItem("token");

    if (!token) {
      console.error("No token found");
      return;
    }

    // Show loading state
    document.getElementById("profileFullName").textContent = "Loading...";
    document.getElementById("profileUsername").textContent = "Loading...";
    document.getElementById("profileEmail").textContent = "Loading...";
    document.getElementById("profilePhone").textContent = "Loading...";
    document.getElementById("profileBalance").textContent = "Loading...";

    // Fetch fresh data from API
    const response = await fetch("/api/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const profileData = await response.json();
      console.log("Profile data loaded:", profileData); // Debug log

      // Update sessionStorage with fresh data
      const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
      const updatedUser = {
        ...currentUser,
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        balance: profileData.balance,
      };
      sessionStorage.setItem("user", JSON.stringify(updatedUser));

      // Update profile modal
      document.getElementById("profileFullName").textContent =
        profileData.fullName || "N/A";
      document.getElementById("profileUsername").textContent =
        currentUser.username || "N/A";
      document.getElementById("profileEmail").textContent =
        profileData.email || "N/A";
      document.getElementById("profilePhone").textContent =
        profileData.phone || "N/A";
      document.getElementById("profileBalance").textContent =
        (profileData.balance || 0).toLocaleString() + " đ";

      // Also update navbar if needed
      loadUserInfo();
    } else {
      console.error("Failed to fetch profile:", response.status);
      // Fall back to sessionStorage data
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      document.getElementById("profileFullName").textContent =
        user.fullName || "N/A";
      document.getElementById("profileUsername").textContent =
        user.username || "N/A";
      document.getElementById("profileEmail").textContent = user.email || "N/A";
      document.getElementById("profilePhone").textContent = user.phone || "N/A";
      document.getElementById("profileBalance").textContent =
        (user.balance || 0).toLocaleString() + " đ";
    }
  } catch (error) {
    console.error("Error fetching profile data:", error);
    // Fall back to sessionStorage data
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    document.getElementById("profileFullName").textContent =
      user.fullName || "N/A";
    document.getElementById("profileUsername").textContent =
      user.username || "N/A";
    document.getElementById("profileEmail").textContent = user.email || "N/A";
    document.getElementById("profilePhone").textContent = user.phone || "N/A";
    document.getElementById("profileBalance").textContent =
      (user.balance || 0).toLocaleString() + " đ";
  }
}

function logout() {
  // Clear all session data for this tab
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.clear(); // Ensure everything is cleared

  // Redirect to login page
  window.location.href = "index.html";
}
