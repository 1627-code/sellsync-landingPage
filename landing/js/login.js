(function () {
  'use strict';

  const API_BASE_URL = CONFIG.API_BASE_URL;

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

  /* ----- CapsLock warning ----- */
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

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', !!on);
  }

  /* ----- Google Sign-In ----- */
  const googleWrap = document.getElementById('googleAuth');
  const googleMessage = document.getElementById('googleMessage');

  function showGoogleMessage(type, text) {
    if (!googleMessage) return;
    googleMessage.textContent = text;
    googleMessage.className = 'form-message visible ' + type;
  }

  function setGoogleLoading(on) {
    if (!googleWrap) return;
    googleWrap.classList.toggle('loading', !!on);
  }

  async function sendGoogleCredential(credential) {
    showGoogleMessage('', '');
    setGoogleLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data || data.success !== true) {
        throw new Error((data && data.message) ? data.message : 'Google sign-in failed.');
      }

      if (data.token) {
        localStorage.setItem('sellsync_token', data.token);
      }
      if (data.data) {
        localStorage.setItem('sellsync_user', JSON.stringify(data.data));
      }

      showGoogleMessage('success', 'Signed in. Redirecting...');
      setTimeout(() => {
          window.location.href = '/coming-soon';
        }, 600);
    } catch (err) {
      showGoogleMessage('error', err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  }

  function initGoogle() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
    window.google.accounts.id.initialize({
      client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      callback: function (response) {
        if (!response || !response.credential) {
          showGoogleMessage('error', 'No credential returned from Google.');
          return;
        }
        sendGoogleCredential(response.credential);
      }
    });

    window.google.accounts.id.renderButton(
      document.getElementById('gsiButton'),
      { theme: 'outline', size: 'large', shape: 'pill', width: 360, text: 'signin_with' }
    );
  }

  if (document.getElementById('gsiButton')) {
    const t0 = Date.now();
    const timer = setInterval(function () {
      initGoogle();
      if (document.getElementById('gsiButton') && document.getElementById('gsiButton').children.length) {
        clearInterval(timer);
      }
      if (Date.now() - t0 > 7000) {
        clearInterval(timer);
      }
    }, 200);
  }

  /* ----- Email validation ----- */
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

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

  /* ----- Form submit ----- */
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideFormMessage();

      if (!validateForm()) return;

        setLoading(true);

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Invalid email or password.');
        }

        showFormMessage('success', 'Signed in. Redirecting...');
        setTimeout(() => {
          window.location.href = '/coming-soon';
        }, 800);

      } catch (err) {
        showFormMessage('error', err.message || 'Sign-in failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    });
  }
})();
