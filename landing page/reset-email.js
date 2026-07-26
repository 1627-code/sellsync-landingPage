(function () {
  'use strict';

  const form = document.getElementById('resetForm');
  const emailInput = document.getElementById('resetEmail');
  const submitBtn = document.getElementById('submitBtn');
  const formMessage = document.getElementById('formMessage');
  const emailError = document.getElementById('emailError');
  const successModal = document.getElementById('success-modal');
  const closeModalBtn = successModal ? successModal.querySelector('.close-modal') : null;
  const backToLoginBtn = document.getElementById('backToLoginBtn');

  /* ----- Modal functions ----- */
  function showSuccessModal() {
    if (successModal) {
      successModal.classList.add('open');
    }
  }

  function closeSuccessModal() {
    if (successModal) {
      successModal.classList.remove('open');
    }
  }

  /* ----- Validation helpers ----- */
  function showFieldError(input, message) {
    input.classList.add('error');
    if (emailError) emailError.textContent = message;
  }

  function clearFieldError(input) {
    input.classList.remove('error');
    if (emailError) emailError.textContent = '';
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

  function validateForm() {
    let valid = true;
    const email = emailInput.value.trim();

    clearFieldError(emailInput);

    if (!email) {
      showFieldError(emailInput, 'Please enter your email address.');
      if (valid) emailInput.focus();
      valid = false;
    } else if (!validateEmail(email)) {
      showFieldError(emailInput, 'Please enter a valid email address.');
      if (valid) emailInput.focus();
      valid = false;
    }

    return valid;
  }

  /* ----- Clear errors on input ----- */
  if (emailInput) {
    emailInput.addEventListener('input', function () {
      clearFieldError(emailInput);
      hideFormMessage();
    });
    emailInput.addEventListener('focus', function () {
      clearFieldError(emailInput);
    });
  }

  /* ----- Modal event listeners ----- */
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeSuccessModal);
  }

  if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', function () {
      window.location.href = 'login.html';
    });
  }

  if (successModal) {
    successModal.addEventListener('click', function (e) {
      if (e.target === successModal) {
        closeSuccessModal();
      }
    });
  }

  /* ----- Form submit - simulates sending reset token ----- */
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideFormMessage();

      if (!validateForm()) return;

      const email = emailInput.value.trim();

      submitBtn.disabled = true;
      submitBtn.classList.add('loading');

      /* Simulate sending reset email - backend will handle actual logic */
      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');

        // Show success message (backend will verify if email exists)
        showFormMessage('success', 'A reset link has been sent to your email. Please check your inbox to continue.');
        
        // Show modal/popup with additional info
        showSuccessModal();
      }, 1200);
    });
  }
})();
