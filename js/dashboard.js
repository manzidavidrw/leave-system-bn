let leaveRequestsData = [];
let usersData = [];
let peopleOnLeaveData = [];
let currentPage = 1;
const pageSize = 5;
const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;


document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || !user.accessToken) {
    window.location.href = "/index.html";
    return;
  }

  // Check if user has admin/manager role
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    window.location.href = "/staff-dashboard.html";
    return;
  }

  document.getElementById("welcome").textContent = `Welcome, ${user.firstName} ${user.lastName}`;
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
  loadSection("reviewLeaves");
});

function loadSection(section) {
  const user = JSON.parse(localStorage.getItem("user"));
  const container = document.getElementById("dashboardContent");
  container.innerHTML = "";

  if (section === "reviewLeaves") {
    container.innerHTML = `
      <div class="card">
        <h2>Review Leaves</h2>
        <div id="leaveRequests"><p>Loading leave requests...</p></div>
      </div>
    `;
    fetchLeaveRequests();

  } else if (section === "registerUsers") {
    if (user.role !== 'ADMIN') {
      container.innerHTML = `
        <div class="card">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this section.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card">
        <h2>Register Users</h2>
        <form id="registerForm">
          <input type="email" name="email" placeholder="Email" required>
          <input type="password" name="password" placeholder="Password" required>
          <input type="text" name="firstName" placeholder="First Name" required>
          <input type="text" name="lastName" placeholder="Last Name" required>
          <select name="role" required>
            <option value="">Select Role</option>
            <option value="MANAGER">MANAGER</option>
            <option value="STAFF">STAFF</option>
          </select>
          <button type="submit">Register User</button>
        </form>
      </div>
    `;

    document.getElementById("registerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const newUser = {
        email: formData.get("email"),
        password: formData.get("password"),
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        role: formData.get("role")
      };

      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.accessToken}`
          },
          body: JSON.stringify(newUser)
        });

        if (!response.ok) {
          const err = await response.json();
          showNotification(err.message || "Failed to register user", "error");
          return;
        }

        const result = await response.json();
        showNotification(`User ${result.firstName} ${result.lastName} registered successfully!`, "success");
        e.target.reset();

      } catch (error) {
        console.error(error);
        showNotification("An error occurred during registration", "error");
      }
    });

  } else if (section === "viewUsers") {
    container.innerHTML = `
      <div class="card">
        <h2>Registered Users</h2>
        <div id="usersList"><p>Loading users...</p></div>
      </div>
    `;
    fetchUsers();

  } else if (section === "peopleOnLeave") {
    container.innerHTML = `
      <div class="card">
        <h2>People Currently on Leave</h2>
        <div id="peopleOnLeaveList"><p>Loading...</p></div>
      </div>
    `;
    fetchPeopleOnLeave();

  } else if (section === "leaveReports") {
    const currentYear = new Date().getFullYear();

    container.innerHTML = `
      <div class="card">
        <h2>Leave Reports</h2>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
          <label for="reportYear"><strong>Year:</strong></label>
          <select id="reportYear">
            ${[currentYear, currentYear - 1, currentYear - 2].map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
          <button id="downloadCsv" class="btn-primary">Download CSV</button>
          <button id="downloadExcel" class="btn-secondary">Download Excel</button>
        </div>
        <div id="leaveReports"><p>Loading leave reports...</p></div>
      </div>
    `;

    // Initial fetch
    fetchLeaveReports(currentYear);

    // Change year handler
    document.getElementById("reportYear").addEventListener("change", (e) => {
      fetchLeaveReports(e.target.value);
    });

    document.getElementById("downloadCsv").addEventListener("click", () => {
      const year = document.getElementById("reportYear").value;
      downloadLeaveReport('csv', year);
    });

    document.getElementById("downloadExcel").addEventListener("click", () => {
      const year = document.getElementById("reportYear").value;
      downloadLeaveReport('excel', year);
    });
  }


}

// Fetch all leave requests
async function fetchLeaveRequests() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await fetch(`${API_BASE_URL}/leave`, {
      headers: { "Authorization": `Bearer ${user.accessToken}` }
    });

    leaveRequestsData = await response.json();
    currentPage = 1;
    renderLeaveRequestsPage();
  } catch (error) {
    console.error(error);
    document.getElementById("leaveRequests").textContent = "Failed to load leave requests";
  }
}

function renderLeaveRequestsPage() {
  const container = document.getElementById("leaveRequests");

  if (leaveRequestsData.length === 0) {
    container.innerHTML = "<p>No leave requests found</p>";
    return;
  }

  // Pagination logic
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = leaveRequestsData.slice(start, end);

  container.innerHTML = pageData.map(req => `
    <div class="leave-request">
      <p>
        <strong>${req.employeeName}</strong> requested <strong>${req.numberOfDays}</strong> days of <strong>${req.leaveType}</strong> leave
        from <strong>${req.startDate}</strong> to <strong>${req.endDate}</strong>.
      </p>

      ${req.reason ? `<p><strong>Reason:</strong> ${req.reason}</p>` : ''}

      ${req.documentUrl ? `
        <div class="document-card">
          <img src="img/pdf-icon.png" alt="PDF">
          <div class="doc-info">
            <p>Attached Document</p>
            <a href="${req.documentUrl}" target="_blank">Open</a>
          </div>
        </div>
      ` : ''}

      <textarea id="comment-${req.id}" placeholder="Add a comment...">${req.managerComments || ''}</textarea>
      <div class="buttons">
        <button onclick="reviewLeave(${req.id}, 'APPROVED')">Approve</button>
        <button onclick="reviewLeave(${req.id}, 'REJECTED')">Reject</button>
      </div>
    </div>
  `).join("");

  // Pagination
  const totalPages = Math.ceil(leaveRequestsData.length / pageSize);
  let paginationHTML = '<div class="pagination">';

  paginationHTML += `<button class="${currentPage === 1 ? 'disabled' : ''}" onclick="goToPage(${currentPage - 1})">Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    paginationHTML += `<button class="${i === currentPage ? 'active-page' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }

  paginationHTML += `<button class="${currentPage === totalPages ? 'disabled' : ''}" onclick="goToPage(${currentPage + 1})">Next</button>`;
  paginationHTML += '</div>';

  container.innerHTML += paginationHTML;
}

function goToPage(page) {
  const totalPages = Math.ceil(leaveRequestsData.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderLeaveRequestsPage();
}

// Fetch all users
async function fetchUsers() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await fetch(`${API_BASE_URL}/auth/all-users`, {
      headers: { "Authorization": `Bearer ${user.accessToken}` }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }

    usersData = await response.json();
    currentPage = 1;
    renderUsersPage();
  } catch (error) {
    console.error(error);
    document.getElementById("usersList").textContent = "Failed to load users";
  }
}

// Render users with pagination
function renderUsersPage() {
  const container = document.getElementById("usersList");

  if (usersData.length === 0) {
    container.innerHTML = "<p>No users found</p>";
    return;
  }

  // Pagination logic
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = usersData.slice(start, end);

  container.innerHTML = `
    <table class="users-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        ${pageData.map(user => `
          <tr>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.role.toLowerCase()}">${user.role}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Pagination
  const totalPages = Math.ceil(usersData.length / pageSize);
  let paginationHTML = '<div class="pagination">';

  paginationHTML += `<button class="${currentPage === 1 ? 'disabled' : ''}" onclick="goToUsersPage(${currentPage - 1})">Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    paginationHTML += `<button class="${i === currentPage ? 'active-page' : ''}" onclick="goToUsersPage(${i})">${i}</button>`;
  }

  paginationHTML += `<button class="${currentPage === totalPages ? 'disabled' : ''}" onclick="goToUsersPage(${currentPage + 1})">Next</button>`;
  paginationHTML += '</div>';

  container.innerHTML += paginationHTML;
}

// Pagination for users
function goToUsersPage(page) {
  const totalPages = Math.ceil(usersData.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderUsersPage();
}

// Approve or reject leave
async function reviewLeave(leaveId, action) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const comment = document.getElementById(`comment-${leaveId}`).value;

    const payload = {
      action: action === "APPROVED" ? "APPROVE" : "REJECT",
      comments: comment || ""
    };

    const response = await fetch(`${API_BASE_URL}/leave/${leaveId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.accessToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      showNotification(err.message || "Failed to review leave", "error");
      return;
    }

    const result = await response.json();
    const actionText = result.status === "APPROVED" ? "approved" : "rejected";
    showNotification(`Leave request by ${result.employeeName} has been ${actionText}`, "success");

    fetchLeaveRequests();
    fetchLeaveReports();

  } catch (error) {
    console.error("Error reviewing leave:", error);
    showNotification("An error occurred while reviewing leave", "error");
  }
}

// Fetch leave reports
async function fetchLeaveReports(year) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await fetch(`${API_BASE_URL}/leave/reports/leave-report-data?year=${year}`, {
      headers: { "Authorization": `Bearer ${user.accessToken}` }
    });

    const reports = await response.json();
    const container = document.getElementById("leaveReports");

    if (!reports || reports.length === 0) {
      container.innerHTML = "<p>No leave reports available for this year</p>";
      return;
    }

    // Display a table
    container.innerHTML = `
          <table class="report-table">
            <thead>
              <tr>
                <th>Employee Name</th>
           
                <th>Leave Type</th>
                <th>Total Days</th>
                <th>Used Days</th>
                <th>Available Days</th>
                <th>Pending</th>
                <th>Approved</th>
                <th>Rejected</th>
              </tr>
            </thead>
            <tbody>
              ${reports.map(r => `
                <tr>
                  <td>${r.employeeName}</td>
                  <td>${r.leaveType}</td>
                  <td>${r.totalDays}</td>
                  <td>${r.usedDays}</td>
                  <td>${r.availableDays}</td>
                  <td>${r.pendingRequests}</td>
                  <td>${r.approvedRequests}</td>
                  <td>${r.rejectedRequests}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

  } catch (error) {
    console.error(error);
    document.getElementById("leaveReports").textContent = "leave reports";
  }
}


// Fetch people currently on leave
async function fetchPeopleOnLeave() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await fetch(`${API_BASE_URL}/leave/calendar/on-leave-today`, {
      headers: { "Authorization": `Bearer ${user.accessToken}` }
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

// Render people on leave
function renderPeopleOnLeavePage() {
  const container = document.getElementById("peopleOnLeaveList");

  if (peopleOnLeaveData.length === 0) {
    container.innerHTML = "<p>No one is currently on leave.</p>";
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = peopleOnLeaveData.slice(start, end);

  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = pageData.map(person => {
    const isOnLeaveToday = person.startDate <= today && person.endDate >= today;
    const daysRemaining = Math.ceil((new Date(person.endDate) - new Date(today)) / (1000 * 60 * 60 * 24));

    return `
      <div class="leave-request" style="border-left: 4px solid ${isOnLeaveToday ? '#ef4444' : '#3b82f6'};">
        <p>
          <strong>${person.employeeName}</strong> - <strong>${person.leaveType}</strong>
          <span style="float: right; color: ${isOnLeaveToday ? '#ef4444' : '#3b82f6'}; font-weight: 600;">
            ${isOnLeaveToday ? '🔴 On Leave' : '📅 Upcoming'}
          </span>
        </p>
        <p><strong>From:</strong> ${person.startDate} <strong>To:</strong> ${person.endDate} (${person.numberOfDays} days)</p>
        ${isOnLeaveToday ? `<p><strong>Days Remaining:</strong> ${daysRemaining} day(s)</p>` : ''}
        ${person.reason ? `<p><strong>Reason:</strong> ${person.reason}</p>` : ''}
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

// Pagination for people on leave
function goToPeopleOnLeavePage(page) {
  const totalPages = Math.ceil(peopleOnLeaveData.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPeopleOnLeavePage();
}

function showNotification(message, type = "success", duration = 3000) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification show ${type}`;

  setTimeout(() => {
    notification.className = "notification";
  }, duration);
}
async function downloadLeaveReport(format, year) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const url = `${API_BASE_URL}/leave/reports/leave-report/${format}?year=${year}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { "Authorization": `Bearer ${user.accessToken}` }
    });

    if (!response.ok) {
      const err = await response.json();
      showNotification(err.message || "Failed to download report", "error");
      return;
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    const fileName = `leave-report-${year}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    showNotification(`Leave report downloaded as ${fileName}`, "success");

  } catch (error) {
    console.error("Error downloading report:", error);
    showNotification("An error occurred while downloading the report", "error");
  }
}

