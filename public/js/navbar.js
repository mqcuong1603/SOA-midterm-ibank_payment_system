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
  const user = JSON.parse(localStorage.getItem("user") || "{}");
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
  // Load fresh profile data and show modal
  loadProfileData();
  const modal = new bootstrap.Modal(document.getElementById("profileModal"));
  modal.show();
}

async function loadProfileData() {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Set basic info from localStorage first
    document.getElementById("profileFullName").textContent =
      user.fullName || "N/A";
    document.getElementById("profileUsername").textContent =
      user.username || "N/A";
    document.getElementById("profileEmail").textContent = user.email || "N/A";
    document.getElementById("profilePhone").textContent = user.phone || "N/A";
    document.getElementById("profileBalance").textContent =
      (user.balance || 0).toLocaleString() + " đ";

    // Fetch fresh data from API
    const response = await fetch("/api/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const profileData = await response.json();
      document.getElementById("profileFullName").textContent =
        profileData.fullName || "N/A";
      document.getElementById("profileEmail").textContent =
        profileData.email || "N/A";
      document.getElementById("profilePhone").textContent =
        profileData.phone || "N/A";
      document.getElementById("profileBalance").textContent =
        (profileData.balance || 0).toLocaleString() + " đ";
    }
  } catch (error) {
    console.error("Error fetching profile data:", error);
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}
