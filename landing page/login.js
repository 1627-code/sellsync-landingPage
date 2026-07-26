(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');
  const capsWarning = document.getElementById('capsWarning');
  const submitBtn = document.getElementById('submitBtn');
  const formMessage = document.getElementById('formMessage');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');

  /* ----- Show / hide password ----- */
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      togglePassword.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      togglePassword.title = isPassword ? 'Hide password' : 'Show password';
    });
  }

  /* ----- Caps Lock warning ----- */
  function checkCapsLock(e) {
    if (!e.getModifierState) return;
    const on = e.getModifierState('CapsLock');
    capsWarning.classList.toggle('visible', on);
  }

  if (passwordInput && capsWarning) {
    passwordInput.addEventListener('keydown', checkCapsLock);
    passwordInput.addEventListener('keyup', checkCapsLock);
    passwordInput.addEventListener('focus', checkCapsLock);
    passwordInput.addEventListener('blur', function () {
      capsWarning.classList.remove('visible');
    });
  }

  /* ----- Validation helpers ----- */
  function showFieldError(input, message) {
    input.classList.add('error');
    const el = input.id === 'email' ? emailError : passwordError;
    if (el) el.textContent = message;
  }

  function clearFieldError(input) {
    input.classList.remove('error');
    const el = input.id === 'email' ? emailError : passwordError;
    if (el) el.textContent = '';
  }

  function showFormMessage(type, text) {
    formMessage.textContent = text;
    formMessage.className = 'form-message visible ' + type;
  }

  function hideFormMessage() {
    formMessage.className = 'form-message';
    formMessage.textContent = '';
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  (function () {
    try {
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('reset') === '1') {
        showFormMessage('success', 'Password updated. You can now sign in.');
      }
    } catch (e) {}
  })();

  function validateForm() {
    let valid = true;
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    clearFieldError(emailInput);
    clearFieldError(passwordInput);

    if (!email) {
      showFieldError(emailInput, 'Please enter your email.');
      if (valid) emailInput.focus();
      valid = false;
    } else if (!validateEmail(email)) {
      showFieldError(emailInput, 'Please enter a valid email address.');
      if (valid) emailInput.focus();
      valid = false;
    }

    if (!password) {
      showFieldError(passwordInput, 'Please enter your password.');
      if (valid) passwordInput.focus();
      valid = false;
    }

    return valid;
  }

  /* ----- Clear errors on input ----- */
  [emailInput, passwordInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener('input', function () {
      clearFieldError(input);
      hideFormMessage();
    });
    input.addEventListener('focus', function () {
      clearFieldError(input);
    });
  });

  /* ----- Google Sign-In functionality ----- */
  function handleGoogleCredentialResponse(response) {
    const googleAuth = document.getElementById('googleAuth');
    if (googleAuth) googleAuth.classList.add('loading');

    fetch('/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: response.credential
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showFormMessage('success', `Welcome back! Redirecting to your dashboard...`);
        setTimeout(function () {
          window.location.href = 'business.html?login_success=true&plan=' + (data.plan || 'basic');
        }, 1200);
      } else {
        showFormMessage('error', data.error || 'Google authentication failed.');
        if (googleAuth) googleAuth.classList.remove('loading');
      }
    })
    .catch(err => {
      console.error('Google auth error:', err);
      showFormMessage('error', 'Authentication service unavailable. Please try again.');
      if (googleAuth) googleAuth.classList.remove('loading');
    });
  }

  // Configure Google Sign-In
  function initializeGoogleSignIn() {
    // Check if Google Sign-In library is loaded
    if (typeof google !== 'undefined' && google.accounts) {
      // Get Google Client ID from server
      fetch('/api/config/google')
        .then(res => res.json())
        .then(config => {
          if (config.clientId) {
            google.accounts.id.initialize({
              client_id: config.clientId,
              callback: handleGoogleCredentialResponse
            });
            
            // Render the Google Sign-In button
            google.accounts.id.renderButton(
              document.querySelector('.g_id_signin'),
              {
                theme: 'outline',
                size: 'large',
                text: 'sign_in_with',
                shape: 'rectangular'
              }
            );
          }
        })
        .catch(err => {
          console.error('Failed to load Google config:', err);
        });
    }
  }

  // Initialize Google Sign-In when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGoogleSignIn);
  } else {
    initializeGoogleSignIn();
  }

  /* ----- Form submit ----- */
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideFormMessage();

      if (!validateForm()) return;

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      submitBtn.disabled = true;
      submitBtn.classList.add('loading');

      /* Simulate network request; replace with real fetch() when you have a backend */
      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');

        // Demo login logic with localStorage
        const storedUser = JSON.parse(localStorage.getItem('sellsync_user_data') || '{}');
        if (storedUser.email === email && storedUser.password === password) {
          showFormMessage('success', `Welcome back! Redirecting to your ${storedUser.plan} dashboard...`);
          setTimeout(function () {
            // In a real app, this would go to a dashboard. 
            // For this demo, we can redirect to a success page or back to business.html with a plan parameter.
            window.location.href = 'business.html?login_success=true&plan=' + storedUser.plan;
          }, 1200);
        } else {
          showFormMessage('error', 'Invalid email or password. Please try again.');
        }
      }, 1200);
    });
  }
})();