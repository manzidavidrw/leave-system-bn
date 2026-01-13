const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

function showNotification(message, type = 'error') {
  // Remove existing notification if any
  const existing = document.getElementById('notificationDiv');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'notificationDiv';
  div.textContent = message;
  div.style.position = 'fixed';
  div.style.top = '20px';
  div.style.right = '20px';
  div.style.padding = '15px 25px';
  div.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
  div.style.color = 'white';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  div.style.zIndex = 1000;
  div.style.fontWeight = 'bold';
  div.style.minWidth = '200px';
  div.style.textAlign = 'center';

  document.body.appendChild(div);

  setTimeout(() => {
    div.style.transition = 'opacity 0.5s';
    div.style.opacity = 0;
    setTimeout(() => div.remove(), 500);
  }, 4000);
}


document.addEventListener('DOMContentLoaded', () => {
  const userId = sessionStorage.getItem('pending2FAUserId');

  if (!userId) {
    window.location.href = 'index.html';
    return;
  }

  const form = document.getElementById('twoFactorForm');
  const codeInput = document.getElementById('twoFactorCode');

  codeInput.focus();

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.replace(/[^0-9]/g, '');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();

    if (code.length !== 6) {
      showNotification('Enter a valid 6-digit code', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/2fa/verify/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!response.ok) {
        showNotification(data.message || 'Invalid or expired code', 'error');
        codeInput.value = '';
        codeInput.focus();
        return;
      }

      sessionStorage.removeItem('pending2FAUserId');

      showNotification('2FA verified successfully! Logging in...', 'success');
      handleSuccessfulLogin(data);

    } catch (error) {
      console.error('2FA verification failed:', error);
      showNotification('Verification failed. Please try again.', 'error');
    }
  });

  // Reuse handleSuccessfulLogin from login.js
  function handleSuccessfulLogin(data) {
    const user = {
      accessToken: data.accessToken,
      userId: data.userId,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      twoFactorEnabled: data.twoFaEnabled || false
    };
    localStorage.setItem('user', JSON.stringify(user));

    setTimeout(() => {
      if (data.role === 'ADMIN' || data.role === 'MANAGER') {
        window.location.href = 'dashboard.html';
      } else if (data.role === 'STAFF') {
        window.location.href = 'staff-dashboard.html';
      } else {
        showNotification('Unknown user role. Contact administrator.', 'error');
      }
    }, 500);
  }
});
