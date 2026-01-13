const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

document.addEventListener('DOMContentLoaded', initLogin);

function initLogin() {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = loginForm.email.value;
        const password = loginForm.password.value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            // Check if 2FA is required (status 202 or requires2FA flag)
            if (data.requires2FA === true && data.twoFaEnabled === true) {
                sessionStorage.setItem('pending2FAUserId', data.userId); // store userId
                window.location.href = '2fa.html';
                return;
            }
            // If response is not OK and it's not a 2FA requirement, show error
            if (!response.ok) {
                showError(data.message || 'Login failed');
                return;
            }

            // No 2FA required and login successful, proceed
            if (data.accessToken) {
                handleSuccessfulLogin(data);
            } else {
                showError('Login failed. Please try again.');
            }

        } catch (error) {
            console.error('Login error:', error);
            showError('An unexpected error occurred during login');
        }
    });
}

// Show 2FA verification form
function show2FAVerification(userId, email, password) {
    const loginContainer = document.querySelector('.login-container');

    loginContainer.innerHTML = `
        <div class="login-box">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2>Two-Factor Authentication</h2>
                <p style="color: #666; margin-top: 10px;">
                    Enter the 6-digit code from your authenticator app
                </p>
            </div>
            
            <form id="twoFactorForm">
                <div class="form-group">
                    <input type="text" 
                           id="twoFactorCode" 
                           placeholder="000000" 
                           maxlength="6" 
                           pattern="[0-9]{6}"
                           required
                           autocomplete="off"
                           style="text-align: center; 
                                  font-size: 2rem; 
                                  letter-spacing: 0.5rem; 
                                  font-weight: bold;
                                  padding: 15px;
                                  border: 2px solid #ddd;
                                  border-radius: 8px;
                                  width: 100%;">
                </div>
                
                <button type="submit" class="btn-primary" style="width: 100%; margin-bottom: 10px;">
                    Verify Code
                </button>
                <button type="button" class="btn-secondary" style="width: 100%;" onclick="location.reload()">
                    Back to Login
                </button>
            </form>
            
            <div id="verificationError" class="error-message" style="display: none; margin-top: 15px; padding: 10px; background-color: #fee; border: 1px solid #fcc; border-radius: 5px; color: #c33; text-align: center;"></div>
        </div>
    `;

    const twoFactorForm = document.getElementById('twoFactorForm');
    const codeInput = document.getElementById('twoFactorCode');

    // Auto-focus on code input
    codeInput.focus();

    // Only allow numbers
    codeInput.addEventListener('input', function (e) {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Handle form submission
    twoFactorForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const code = codeInput.value;

        if (code.length !== 6) {
            showVerificationError('Please enter a 6-digit code');
            return;
        }

        // Disable button during verification
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        await verify2FACode(email, password, code);

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify Code';
    });
}

// Verify 2FA code during login
async function verify2FACode(email, password, code) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login/2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password,
                code: code
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showVerificationError(data.message || 'Invalid code. Please try again.');
            document.getElementById('twoFactorCode').value = '';
            document.getElementById('twoFactorCode').focus();
            return;
        }

        // 2FA verified successfully
        if (data.accessToken) {
            handleSuccessfulLogin(data);
        } else {
            showVerificationError('Verification succeeded but login failed. Please try again.');
        }

    } catch (error) {
        console.error('2FA verification error:', error);
        showVerificationError('An error occurred. Please try again.');
        document.getElementById('twoFactorCode').value = '';
        document.getElementById('twoFactorCode').focus();
    }
}

// Handle successful login (with or without 2FA)
function handleSuccessfulLogin(data) {
    // Validate we have all required data
    if (!data.accessToken || !data.userId || !data.role) {
        showError('Invalid login response. Please try again.');
        return;
    }

    // Store user info in localStorage
    const user = {
        accessToken: data.accessToken,
        userId: data.userId,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        twoFactorEnabled: data.twoFaEnabled || false
    };
    localStorage.setItem('user', JSON.stringify(user));

    // Redirect based on role
    if (data.role === 'ADMIN' || data.role === 'MANAGER') {
        window.location.href = 'dashboard.html';
    } else if (data.role === 'STAFF') {
        window.location.href = 'staff-dashboard.html';
    } else {
        showError('Unknown user role. Contact administrator.');
    }
}

// Show error message on login page
function showError(message) {
    let errorDiv = document.getElementById('loginError');

    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'loginError';
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'margin-top: 15px; padding: 10px; background-color: #fee; border: 1px solid #fcc; border-radius: 5px; color: #c33; text-align: center;';

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.appendChild(errorDiv);
        }
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Show error message on 2FA verification page
function showVerificationError(message) {
    const errorDiv = document.getElementById('verificationError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

const googleLoginBtn = document.getElementById('googleLogin');

googleLoginBtn.addEventListener('click', async () => {
    try {
        // Initialize Google Auth
        const auth2 = gapi.auth2.getAuthInstance();
        if (!auth2) {
            gapi.load('auth2', () => {
                gapi.auth2.init({ client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com' })
                    .then(() => googleSignIn());
            });
        } else {
            googleSignIn();
        }
    } catch (err) {
        console.error('Google login failed:', err);
        showError('Google login failed. Try again.');
    }
});

async function googleSignIn() {
    const auth2 = gapi.auth2.getAuthInstance();
    const googleUser = await auth2.signIn();
    const idToken = googleUser.getAuthResponse().id_token; // This is the token to send to backend

    // Send token to backend
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: idToken })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.message || 'Google login failed');
            return;
        }

        handleSuccessfulLogin(data); // Reuse existing function

    } catch (error) {
        console.error('Google login error:', error);
        showError('An unexpected error occurred during Google login');
    }
}