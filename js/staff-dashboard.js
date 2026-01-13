let myLeavesData = [];
let currentPage = 1;
const pageSize = 5;
let peopleOnLeaveData = []

const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;


document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || !user.accessToken) {
    window.location.href = "/index.html";
    return;
  }

  // ✅ Check if user is STAFF
  if (user.role !== 'STAFF') {
    window.location.href = "/dashboard.html";
    return;
  }

  document.getElementById("welcome").textContent = `Welcome, ${user.firstName} ${user.lastName} `;
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "/index.html";
  });

  // Sidebar navigation
  const navItems = document.querySelectorAll(".sidebar nav ul li");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      loadSection(item.dataset.section);
    });
  });

  // Load default section
  loadSection("applyLeave");
});

function loadSection(section) {
  const user = JSON.parse(localStorage.getItem("user"));
  const container = document.getElementById("dashboardContent");
  container.innerHTML = "";

  if (section === "applyLeave") {
    container.innerHTML = `
      <div class="card">
        <h2>Apply for Leave</h2>
        <form id="leaveForm" enctype="multipart/form-data">
          <div class="form-group">
            <label>Leave Type</label>
            <select name="leaveType" required>
              <option value="">Select Leave Type</option>
              <option value="ANNUAL">Annual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="MATERNITY">Maternity Leave</option>
            </select>
          </div>

          <div class="form-group">
            <label>Start Date</label>
            <input type="date" name="startDate" required>
          </div>

          <div class="form-group">
            <label>End Date</label>
            <input type="date" name="endDate" required>
          </div>

          <div class="form-group">
            <label>Reason</label>
            <textarea name="reason" rows="4" placeholder="Reason for leave..." required></textarea>
          </div>

          <div class="form-group">
            <label>Supporting Document (Optional)</label>
            <input type="file" name="document" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
          </div>

          <button type="submit" class="btn-primary">Submit Leave Request</button>
        </form>
      </div>
    `;

    document.getElementById("leaveForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitLeaveRequest(e.target);
    });

  } else if (section === "myLeaves") {
    container.innerHTML = `
      <div class="card">
        <h2>My Leave Requests</h2>
        <div id="myLeavesList"><p>Loading your leave requests...</p></div>
      </div>
    `;
    fetchMyLeaves();

  } else if (section === "leaveBalance") {
    container.innerHTML = `
      <div class="card">
        <h2>Leave Balance</h2>
        <div id="leaveBalanceList"><p>Loading leave balance...</p></div>
      </div>
    `;
    fetchLeaveBalance();

  } else if (section === "peopleOnLeave") {
    // ✅ NEW SECTION
    container.innerHTML = `
      <div class="card">
        <h2>People Currently on Leave</h2>
        <div id="peopleOnLeaveList"><p>Loading...</p></div>
      </div>
    `;
    fetchPeopleOnLeave();
  }
  else if (section === "settings") {
    // ✅ UPDATED SECTION
    container.innerHTML = `
      <div class="card">
        <h2>Settings</h2>
        
        <div class="settings-section">
          <h3>Security</h3>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>Two-Factor Authentication (2FA)</h4>
              <p>Add an extra layer of security to your account by enabling two-factor authentication.</p>
            </div>
            <div class="setting-control">
              <label class="toggle-switch">
                <input type="checkbox" id="twoFactorToggle">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div id="twoFactorStatus" class="setting-status"></div>
          
          <!-- QR Code Display (shown when enabling 2FA) -->
          <div id="qrCodeSection" style="display: none;">
            <div class="qr-code-container">
              <h4>Scan this QR code with your authenticator app</h4>
              <div id="qrCodeDisplay"></div>
              <p class="secret-key">Or manually enter this key: <code id="secretKey"></code></p>
              
              <form id="verify2FAForm">
                <div class="form-group">
                  <label>Enter the 6-digit code from your app to verify</label>
                  <input type="text" 
                         id="verificationCode" 
                         placeholder="000000" 
                         maxlength="6" 
                         pattern="[0-9]{6}"
                         required
                         style="text-align: center; font-size: 1.5rem; letter-spacing: 0.5rem;">
                </div>
                <button type="submit" class="btn-primary" style="width: auto;">Verify & Enable</button>
                <button type="button" class="btn-secondary" onclick="cancel2FASetup()">Cancel</button>
              </form>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h3>Account Information</h3>
          
          <div class="info-item">
            <span class="info-label">Name:</span>
            <span class="info-value">${user.firstName} ${user.lastName}</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">Email:</span>
            <span class="info-value" id="userEmail">Loading...</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">Role:</span>
            <span class="info-value">${user.role}</span>
          </div>
        </div>
      </div>
    `;

    loadUserSettings();
  }
}

// Submit leave request
async function submitLeaveRequest(form) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const formData = new FormData();

    // Create the leave request data object
    const leaveData = {
      leaveType: form.leaveType.value,
      startDate: form.startDate.value,
      endDate: form.endDate.value,
      reason: form.reason.value
    };

    // Append JSON data as a string
    formData.append('data', JSON.stringify(leaveData));

    // Append document if selected
    if (form.document.files[0]) {
      formData.append('document', form.document.files[0]);
    }

    const response = await fetch(`${API_BASE_URL}/leave`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": user.userId
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.json();
      showNotification(err.message || "Failed to submit leave request", "error");
      return;
    }

    const result = await response.json();
    showNotification("Leave request submitted successfully!", "success");
    form.reset();

    // Refresh leave list if on that section
    loadSection("myLeaves");

  } catch (error) {
    console.error(error);
    showNotification("An error occurred while submitting leave request", "error");
  }
}

// Fetch my leave requests
async function fetchMyLeaves() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await fetch(`${API_BASE_URL}/leave/my-requests`, {
      headers: {
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": user.userId
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch leave requests");
    }

    myLeavesData = await response.json();
    currentPage = 1;
    renderMyLeavesPage();
  } catch (error) {
    console.error(error);
    document.getElementById("myLeavesList").textContent = "Failed to load leave requests";
  }
}

// Render my leaves with pagination
function renderMyLeavesPage() {
  const container = document.getElementById("myLeavesList");

  if (myLeavesData.length === 0) {
    container.innerHTML = "<p>You haven't submitted any leave requests yet.</p>";
    return;
  }

  // Pagination logic
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = myLeavesData.slice(start, end);

  container.innerHTML = pageData.map(req => `
    <div class="leave-card ${req.status.toLowerCase()}">
      <div class="leave-header">
        <h3>${req.leaveType}</h3>
        <span class="status-badge status-${req.status.toLowerCase()}">${req.status}</span>
      </div>
      <div class="leave-details">
        <p><strong>Duration:</strong> ${req.startDate} to ${req.endDate} (${req.numberOfDays} days)</p>
        <p><strong>Reason:</strong> ${req.reason}</p>
        ${req.managerComments ? `<p><strong>Manager Comments:</strong> ${req.managerComments}</p>` : ''}
        ${req.documentUrl ? `
          <p><strong>Document:</strong> <a href="${req.documentUrl}" target="_blank">View Document</a></p>
        ` : ''}
        <p><strong>Submitted:</strong> ${new Date(req.createdAt).toLocaleDateString()}</p>
      </div>
      ${req.status === 'PENDING' ? `
        <button onclick="cancelLeave(${req.id})" class="btn-cancel">Cancel Request</button>
      ` : ''}
    </div>
  `).join("");

  // Pagination
  const totalPages = Math.ceil(myLeavesData.length / pageSize);
  let paginationHTML = '<div class="pagination">';

  paginationHTML += `<button class="${currentPage === 1 ? 'disabled' : ''}" onclick="goToMyLeavesPage(${currentPage - 1})">Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    paginationHTML += `<button class="${i === currentPage ? 'active-page' : ''}" onclick="goToMyLeavesPage(${i})">${i}</button>`;
  }

  paginationHTML += `<button class="${currentPage === totalPages ? 'disabled' : ''}" onclick="goToMyLeavesPage(${currentPage + 1})">Next</button>`;
  paginationHTML += '</div>';

  container.innerHTML += paginationHTML;
}

function goToMyLeavesPage(page) {
  const totalPages = Math.ceil(myLeavesData.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderMyLeavesPage();
}

// Cancel leave request
async function cancelLeave(leaveId) {
  if (!confirm("Are you sure you want to cancel this leave request?")) {
    return;
  }

  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await fetch(`${API_BASE_URL}/leave/${leaveId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": user.userId
      }
    });

    if (!response.ok) {
      const err = await response.json();
      showNotification(err.message || "Failed to cancel leave request", "error");
      return;
    }

    showNotification("Leave request cancelled successfully", "success");
    fetchMyLeaves();

  } catch (error) {
    console.error(error);
    showNotification("An error occurred while cancelling leave request", "error");
  }
}

// Fetch leave balance
// Fetch leave balance
async function fetchLeaveBalance() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await fetch(`${API_BASE_URL}/leave/my-balances`, {
      headers: {
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": user.userId
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch leave balance");
    }

    const balances = await response.json();
    const container = document.getElementById("leaveBalanceList");

    if (balances.length === 0) {
      container.innerHTML = "<p>No leave balance information available</p>";
      return;
    }

    container.innerHTML = balances.map(balance => `
      <div class="balance-card">
        <h3>${balance.leaveTypeName}</h3>
        <div class="balance-details">
          <div class="balance-item">
            <span class="label">Total Days:</span>
            <span class="value">${balance.totalDays || 0}</span>
          </div>
          <div class="balance-item">
            <span class="label">Used Days:</span>
            <span class="value used">${balance.usedDays || 0}</span>
          </div>
          <div class="balance-item">
            <span class="label">Available Days:</span>
            <span class="value available">${balance.availableDays || 0}</span>
          </div>
          ${balance.accruedDays !== null && balance.accruedDays !== undefined ? `
            <div class="balance-item">
              <span class="label">Accrued Days:</span>
              <span class="value">${balance.accruedDays}</span>
            </div>
          ` : ''}
          ${balance.carryoverDays !== null && balance.carryoverDays !== undefined && balance.carryoverDays > 0 ? `
            <div class="balance-item">
              <span class="label">Carryover Days:</span>
              <span class="value">${balance.carryoverDays}</span>
            </div>
          ` : ''}
          ${balance.carryoverExpiryDate ? `
            <div class="balance-item">
              <span class="label">Carryover Expires:</span>
              <span class="value" style="font-size: 0.9rem;">${balance.carryoverExpiryDate}</span>
            </div>
          ` : ''}
          ${balance.accrualInfo ? `
            <div class="balance-item" style="grid-column: 1 / -1;">
              <span class="label">Accrual Rate:</span>
              <span class="value" style="font-size: 0.9rem;">${balance.accrualInfo}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `).join("");

  } catch (error) {
    console.error(error);
    document.getElementById("leaveBalanceList").innerHTML =
      '<p style="color: #ef4444;">Failed to load leave balance. Please try again later.</p>';
  }
}

function showNotification(message, type = "success", duration = 3000) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification show ${type}`;

  setTimeout(() => {
    notification.className = "notification";
  }, duration);
}

// ✅ NEW FUNCTION: Fetch people currently on leave
async function fetchPeopleOnLeave() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await fetch(`${API_BASE_URL}/leave/calendar/on-leave-today`, {
      headers: {
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": user.userId
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch people on leave");
    }

    peopleOnLeaveData = await response.json();
    currentPage = 1;
    renderPeopleOnLeavePage();
  } catch (error) {
    console.error(error);
    document.getElementById("peopleOnLeaveList").textContent = "Failed to load data";
  }
}

// ✅ NEW FUNCTION: Render people on leave with pagination
function renderPeopleOnLeavePage() {
  const container = document.getElementById("peopleOnLeaveList");

  if (peopleOnLeaveData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No one is currently on leave.</p>
      </div>
    `;
    return;
  }

  // Pagination logic
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = peopleOnLeaveData.slice(start, end);

  // Get today's date for comparison
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = pageData.map(person => {
    const isOnLeaveToday = person.startDate <= today && person.endDate >= today;
    const daysRemaining = Math.ceil((new Date(person.endDate) - new Date(today)) / (1000 * 60 * 60 * 24));

    return `
      <div class="person-on-leave-card ${isOnLeaveToday ? 'active' : 'upcoming'}">
        <div class="person-header">
          <div class="person-info">
            <h3>${person.employeeName}</h3>
            <span class="leave-type-badge">${person.leaveType}</span>
          </div>
          <span class="status-indicator ${isOnLeaveToday ? 'on-leave' : 'upcoming'}">
            ${isOnLeaveToday ? '🔴 On Leave' : '📅 Upcoming'}
          </span>
        </div>
        <div class="person-details">
          <p><strong>From:</strong> ${person.startDate}</p>
          <p><strong>To:</strong> ${person.endDate}</p>
          <p><strong>Duration:</strong> ${person.numberOfDays} days</p>
          ${isOnLeaveToday ? `<p><strong>Days Remaining:</strong> ${daysRemaining} day(s)</p>` : ''}
          ${person.reason ? `<p><strong>Reason:</strong> ${person.reason}</p>` : ''}
        </div>
      </div>
    `;
  }).join("");

  // Pagination
  const totalPages = Math.ceil(peopleOnLeaveData.length / pageSize);
  let paginationHTML = '<div class="pagination">';

  paginationHTML += `<button class="${currentPage === 1 ? 'disabled' : ''}" onclick="goToPeopleOnLeavePage(${currentPage - 1})">Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    paginationHTML += `<button class="${i === currentPage ? 'active-page' : ''}" onclick="goToPeopleOnLeavePage(${i})">${i}</button>`;
  }

  paginationHTML += `<button class="${currentPage === totalPages ? 'disabled' : ''}" onclick="goToPeopleOnLeavePage(${currentPage + 1})">Next</button>`;
  paginationHTML += '</div>';

  container.innerHTML += paginationHTML;
}

// ✅ NEW FUNCTION: Pagination for people on leave
function goToPeopleOnLeavePage(page) {
  const totalPages = Math.ceil(peopleOnLeaveData.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPeopleOnLeavePage();
}

async function loadUserSettings() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    // Fetch user details including 2FA status
    const response = await fetch(`${API_BASE_URL}/auth/user/${user.userId}`, {
      headers: {
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": user.userId
      }
    });

    if (response.ok) {
      const userData = await response.json();

      // Update email
      document.getElementById("userEmail").textContent = userData.email || "N/A";

      // Set 2FA toggle state
      const twoFactorToggle = document.getElementById("twoFactorToggle");
      twoFactorToggle.checked = userData.twoFaEnabled || false;

      // Update status text
      updateTwoFactorStatus(userData.twoFaEnabled);

      // Add toggle event listener
      twoFactorToggle.addEventListener("change", handleTwoFactorToggle);
    }

  } catch (error) {
    console.error("Error loading settings:", error);
    showNotification("Failed to load settings", "error");
  }
}

// Handle 2FA toggle
async function handleTwoFactorToggle(event) {
  const isEnabled = event.target.checked;
  const user = JSON.parse(localStorage.getItem("user"));

  if (isEnabled) {
    // Enable 2FA - show QR code setup
    await setup2FA(user.userId);
  } else {
    // Disable 2FA - confirm and disable
    if (confirm("Are you sure you want to disable two-factor authentication? This will make your account less secure.")) {
      await disable2FA(user.userId, event.target);
    } else {
      // User cancelled, revert toggle
      event.target.checked = true;
    }
  }
}
// Update 2FA status text
function updateTwoFactorStatus(isEnabled) {
  const statusDiv = document.getElementById("twoFactorStatus");
  if (isEnabled) {
    statusDiv.innerHTML = `
      <div class="status-message success">
        <span>✓</span> Two-factor authentication is currently <strong>enabled</strong>
      </div>
    `;
  } else {
    statusDiv.innerHTML = `
      <div class="status-message warning">
        <span>⚠</span> Two-factor authentication is currently <strong>disabled</strong>
      </div>
    `;
  }
}


// Handle password change
async function handlePasswordChange(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    showNotification("New passwords do not match", "error");
    return;
  }

  // Validate password length
  if (newPassword.length < 6) {
    showNotification("New password must be at least 6 characters long", "error");
    return;
  }

  try {
    const user = JSON.parse(localStorage.getItem("user"));

    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": user.userId
      },
      body: JSON.stringify({
        currentPassword: currentPassword,
        newPassword: newPassword
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to change password");
    }

    showNotification("Password changed successfully", "success");
    event.target.reset();

  } catch (error) {
    console.error("Error changing password:", error);
    showNotification(error.message || "Failed to change password. Please try again.", "error");
  }
}

// Setup 2FA - Get QR code

async function setup2FA(userId) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    const response = await fetch(`${API_BASE_URL}/auth/2fa/setup/${userId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": userId
      }
    });

    if (!response.ok) {
      throw new Error("Failed to setup 2FA");
    }

    const data = await response.json();

    // Show QR code section
    const qrSection = document.getElementById("qrCodeSection");
    qrSection.style.display = "block";

    document.getElementById("qrCodeDisplay").innerHTML = `
      <img src="${data.qrCodeUrl}" alt="QR Code" style="max-width: 300px; border-radius: 8px;">
    `;
    document.getElementById("secretKey").textContent = data.secret;

    // Clear any previous form listeners
    const verifyForm = document.getElementById("verify2FAForm");
    const newForm = verifyForm.cloneNode(true);
    verifyForm.parentNode.replaceChild(newForm, verifyForm);

    // Handle verification form
    document.getElementById("verify2FAForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = document.getElementById("verificationCode").value;
      await verifyAndEnable2FA(userId, code);
    });

    // Auto-focus on verification code input
    document.getElementById("verificationCode").focus();

  } catch (error) {
    console.error("Error setting up 2FA:", error);
    showNotification("Failed to setup 2FA. Please try again.", "error");
    document.getElementById("twoFactorToggle").checked = false;
  }
}
// Verify and enable 2FA

async function verifyAndEnable2FA(userId, code) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      showNotification("Please enter a valid 6-digit code", "error");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/auth/2fa/verify/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": userId
      },
      body: JSON.stringify({ code: code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Invalid verification code");
    }

    const result = await response.json();

    // Update local storage
    user.twoFactorEnabled = true;
    localStorage.setItem('user', JSON.stringify(user));

    // Hide QR code section
    document.getElementById("qrCodeSection").style.display = "none";
    document.getElementById("verificationCode").value = "";

    // Update status
    updateTwoFactorStatus(true);

    showNotification("Two-factor authentication has been enabled successfully!", "success");

  } catch (error) {
    console.error("Error verifying 2FA:", error);
    showNotification(error.message || "Invalid code. Please try again.", "error");
    document.getElementById("verificationCode").value = "";
    document.getElementById("verificationCode").focus();
  }
}

// Disable 2FA
async function disable2FA(userId, toggleElement) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    const response = await fetch(`${API_BASE_URL}/auth/2fa/disable/${userId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${user.accessToken}`,
        "X-User-Id": userId
      }
    });

    if (!response.ok) {
      throw new Error("Failed to disable 2FA");
    }

    const result = await response.json();

    // Update local storage
    user.twoFactorEnabled = false;
    localStorage.setItem('user', JSON.stringify(user));

    // Update status
    updateTwoFactorStatus(false);

    showNotification("Two-factor authentication has been disabled", "success");

  } catch (error) {
    console.error("Error disabling 2FA:", error);
    // Revert toggle on error
    toggleElement.checked = true;
    showNotification("Failed to disable 2FA. Please try again.", "error");
  }
}

// Cancel 2FA setup
function cancel2FASetup() {
  document.getElementById("qrCodeSection").style.display = "none";
  document.getElementById("twoFactorToggle").checked = false;
  document.getElementById("verificationCode").value = "";
}

// Cancel 2FA setup
function cancel2FASetup() {
  document.getElementById("qrCodeSection").style.display = "none";
  document.getElementById("twoFactorToggle").checked = false;
}