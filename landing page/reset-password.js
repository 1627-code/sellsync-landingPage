(function () {
  'use strict';

  const form = document.getElementById('newPasswordForm');
  const passwordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const togglePassword = document.getElementById('togglePassword');
  const capsWarning = document.getElementById('capsWarning');
  const submitBtn = document.getElementById('submitBtn');
  const formMessage = document.getElementById('formMessage');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');

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
  function showFieldError(input, errorElement, message) {
    input.classList.add('error');
    if (errorElement) errorElement.textContent = message;
  }

  function clearFieldError(input, errorElement) {
    input.classList.remove('error');
    if (errorElement) errorElement.textContent = '';
  }

  function showFormMessage(type, text) {
    formMessage.textContent = text;
    formMessage.className = 'form-message visible ' + type;
  }

  function hideFormMessage() {
    formMessage.className = 'form-message';
    formMessage.textContent = '';
  }

  function validateForm() {
    let valid = true;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    clearFieldError(passwordInput, passwordError);
    clearFieldError(confirmPasswordInput, confirmPasswordError);

    if (!password) {
      showFieldError(passwordInput, passwordError, 'Please enter a new password.');
      if (valid) passwordInput.focus();
      valid = false;
    } else if (password.length < 8) {
      showFieldError(passwordInput, passwordError, 'Password must be at least 8 characters.');
      if (valid) passwordInput.focus();
      valid = false;
    }

    if (!confirmPassword) {
      showFieldError(confirmPasswordInput, confirmPasswordError, 'Please confirm your password.');
      if (valid) confirmPasswordInput.focus();
      valid = false;
    } else if (password !== confirmPassword) {
      showFieldError(confirmPasswordInput, confirmPasswordError, 'Passwords do not match.');
      if (valid) confirmPasswordInput.focus();
      valid = false;
    }

    return valid;
  }

  /* ----- Clear errors on input ----- */
  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      clearFieldError(passwordInput, passwordError);
      hideFormMessage();
    });
    passwordInput.addEventListener('focus', function () {
      clearFieldError(passwordInput, passwordError);
    });
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', function () {
      clearFieldError(confirmPasswordInput, confirmPasswordError);
      hideFormMessage();
    });
    confirmPasswordInput.addEventListener('focus', function () {
      clearFieldError(confirmPasswordInput, confirmPasswordError);
    });
  }

  /* ----- Form submit - simulates password update ----- */
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideFormMessage();

      if (!validateForm()) return;

      submitBtn.disabled = true;
      submitBtn.classList.add('loading');

      /* Simulate password update - backend will handle actual logic */
      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');

        showFormMessage('success', 'Password updated successfully! Redirecting to sign in...');
        
        setTimeout(function () {
          window.location.href = 'login.html?reset=1';
        }, 2000);
      }, 1200);
    });
  }
})();