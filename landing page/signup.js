(function () {
  'use strict';

  var PLAN_KEY = 'sellsync_signup_plan';
  var plan = (function () {
    var m = /[?&]plan=([^&]+)/.exec(window.location.search);
    var p = m ? m[1].toLowerCase() : null;
    if (p && ['starter', 'growth', 'scale'].indexOf(p) !== -1) {
      try { sessionStorage.setItem(PLAN_KEY, p); } catch (e) {}
      return p;
    }
    try { return sessionStorage.getItem(PLAN_KEY); } catch (e) { return null; }
  })();

  if (!plan) {
    window.location.replace('business.html#get-started');
    return;
  }

  var formMessage = document.getElementById('formMessage');
  var step1 = document.getElementById('step1');
  var step2 = document.getElementById('step2');
  var step3 = document.getElementById('step3');
  var form1 = document.getElementById('signupFormStep1');
  var form2 = document.getElementById('signupFormStep2');
  var form3 = document.getElementById('signupFormStep3');
  var btnStep1 = document.getElementById('btnStep1');
  var btnStep2 = document.getElementById('btnStep2');
  var btnStep3 = document.getElementById('btnStep3');
  var btnSkip = document.getElementById('btnSkip');

  var fullName = document.getElementById('fullName');
  var email = document.getElementById('email');
  var password = document.getElementById('password');
  var confirmPassword = document.getElementById('confirmPassword');
  var businessName = document.getElementById('businessName');
  var businessType = document.getElementById('businessType');
  var businessTypeError = document.getElementById('businessTypeError');
  var roleError = document.getElementById('roleError');
  var roleInputs = document.querySelectorAll('input[name="role"]');

  function showStep(stepEl) {
    step1.hidden = true;
    step2.hidden = true;
    step3.hidden = true;
    if (stepEl) stepEl.hidden = false;
  }

  function showFormMsg(type, text) {
    formMessage.textContent = text;
    formMessage.className = 'form-message visible ' + type;
  }

  function hideFormMsg() {
    formMessage.className = 'form-message';
    formMessage.textContent = '';
  }

  function setError(input, message) {
    if (!input) return;
    input.classList.add('error');
    var errEl = document.getElementById(input.id + 'Error');
    if (errEl) errEl.textContent = message;
  }

  function clearError(input) {
    if (!input) return;
    input.classList.remove('error');
    var errEl = document.getElementById(input.id + 'Error');
    if (errEl) errEl.textContent = '';
  }

  function clearAllErrors(ids) {
    (ids || []).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) clearError(el);
    });
  }

  function validEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function setLoading(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('loading', on);
  }

  /* ----- Password toggles ----- */
  function setupToggle(inputId, btnId) {
    var input = document.getElementById(inputId);
    var btn = document.getElementById(btnId);
    if (!input || !btn) return;
    btn.addEventListener('click', function () {
      var isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', isPass ? 'true' : 'false');
      btn.title = isPass ? 'Hide password' : 'Show password';
    });
  }
  setupToggle('password', 'togglePassword');
  setupToggle('confirmPassword', 'toggleConfirmPassword');

  /* ----- Clear errors on input ----- */
  [fullName, email, password, confirmPassword, businessName, businessType].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      clearError(el);
      hideFormMsg();
    });
    el.addEventListener('focus', function () {
      clearError(el);
    });
  });
  roleInputs.forEach(function (r) {
    r.addEventListener('change', function () {
      if (roleError) roleError.textContent = '';
      hideFormMsg();
    });
  });

  /* ----- Step 1: Account creation ----- */
  function validateStep1() {
    var ok = true;
    clearAllErrors(['fullName', 'email', 'password', 'confirmPassword']);
    hideFormMsg();

    var nameVal = fullName.value.trim();
    var emailVal = email.value.trim();
    var passVal = password.value;
    var confirmVal = confirmPassword.value;

    if (!nameVal) {
      setError(fullName, 'Please enter your full name.');
      if (ok) fullName.focus();
      ok = false;
    }
    if (!emailVal) {
      setError(email, 'Please enter your email.');
      if (ok) email.focus();
      ok = false;
    } else if (!validEmail(emailVal)) {
      setError(email, 'Please enter a valid email address.');
      if (ok) email.focus();
      ok = false;
    }
    if (!passVal) {
      setError(password, 'Please create a password.');
      if (ok) password.focus();
      ok = false;
    } else if (passVal.length < 8) {
      setError(password, 'Password must be at least 8 characters.');
      if (ok) password.focus();
      ok = false;
    }
    if (!confirmVal) {
      setError(confirmPassword, 'Please confirm your password.');
      if (ok) confirmPassword.focus();
      ok = false;
    } else if (passVal !== confirmVal) {
      setError(confirmPassword, 'Passwords do not match.');
      if (ok) confirmPassword.focus();
      ok = false;
    }
    return ok;
  }

  if (form1) {
    form1.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateStep1()) return;

      setLoading(btnStep1, true);
      setTimeout(function () {
        setLoading(btnStep1, false);
        showStep(step2);
        hideFormMsg();
        if (businessName) businessName.focus();
      }, 600);
    });
  }

  /* ----- Step 2: Business setup ----- */
  function validateStep2() {
    var ok = true;
    clearError(businessName);
    clearError(businessType);
    if (businessTypeError) businessTypeError.textContent = '';
    if (roleError) roleError.textContent = '';
    hideFormMsg();

    var nameVal = businessName.value.trim();
    var typeVal = businessType.value;
    var roleVal = null;
    roleInputs.forEach(function (r) {
      if (r.checked) roleVal = r.value;
    });

    if (!nameVal) {
      setError(businessName, 'Please enter your business name.');
      if (ok) businessName.focus();
      ok = false;
    }
    if (!typeVal) {
      setError(businessType, 'Please choose a business type.');
      if (businessTypeError) businessTypeError.textContent = 'Please choose a business type.';
      if (ok) businessType.focus();
      ok = false;
    }
    if (!roleVal) {
      if (roleError) roleError.textContent = 'Please select your role.';
      ok = false;
    }
    return ok;
  }

  if (form2) {
    form2.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateStep2()) return;

      setLoading(btnStep2, true);
      setTimeout(function () {
        setLoading(btnStep2, false);
        showStep(step3);
        hideFormMsg();
      }, 500);
    });
  }

  /* ----- Step 3: Optional — Skip or Save ----- */
  function finishSignup() {
    // Save user data for login demo
    var userData = {
      email: email.value.trim(),
      password: password.value,
      plan: plan
    };
    try {
      localStorage.setItem('sellsync_user_data', JSON.stringify(userData));
    } catch (e) {
      console.error('Could not save user data', e);
    }

    showStep(null);
    showFormMsg('success', 'Account created! Taking you to sign in…');
    setTimeout(function () {
      try { sessionStorage.setItem(PLAN_KEY, plan); } catch (e) {}
      window.location.href = 'login.html';
    }, 1200);
  }

  if (btnSkip) {
    btnSkip.addEventListener('click', function () {
      finishSignup();
    });
  }

  if (form3) {
    form3.addEventListener('submit', function (e) {
      e.preventDefault();
      setLoading(btnStep3, true);
      setTimeout(function () {
        setLoading(btnStep3, false);
        finishSignup();
      }, 500);
    });
  }
})();
