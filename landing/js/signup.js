(function () {
  'use strict';

  const API_BASE_URL = CONFIG.API_BASE_URL;
  const PLAN_KEY = 'sellsync_signup_plan';

  const plan = (function () {
    const m = /[?&]plan=([^&]+)/.exec(window.location.search);
    const p = m ? m[1].toLowerCase() : null;
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

  const formMessage = document.getElementById('formMessage');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const form1 = document.getElementById('signupFormStep1');
  const form2 = document.getElementById('signupFormStep2');
  const form3 = document.getElementById('signupFormStep3');
  const btnStep1 = document.getElementById('btnStep1');
  const btnStep2 = document.getElementById('btnStep2');
  const btnStep3 = document.getElementById('btnStep3');
  const btnSkip = document.getElementById('btnSkip');

  const fullName = document.getElementById('fullName');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  const businessName = document.getElementById('businessName');
  const businessType = document.getElementById('businessType');
  const businessTypeError = document.getElementById('businessTypeError');

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
    const errEl = document.getElementById(input.id + 'Error');
    if (errEl) errEl.textContent = message;
  }

  function clearError(input) {
    if (!input) return;
    input.classList.remove('error');
    const errEl = document.getElementById(input.id + 'Error');
    if (errEl) errEl.textContent = '';
  }

  function clearAllErrors(ids) {
    (ids || []).forEach(function (id) {
      const el = document.getElementById(id);
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
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;
    btn.addEventListener('click', function () {
      const isPass = input.type === 'password';
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
//
  /* ----- Step 1: Account creation ----- */
  function validateStep1() {
    let ok = true;
    clearAllErrors(['fullName', 'email', 'password', 'confirmPassword']);
    hideFormMsg();

    const nameVal = fullName.value.trim();
    const emailVal = email.value.trim();
    const passVal = password.value;
    const confirmVal = confirmPassword.value;

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
    let ok = true;
    clearError(businessName);
    clearError(businessType);
    if (businessTypeError) businessTypeError.textContent = '';
    hideFormMsg();

    const nameVal = businessName.value.trim();
    const typeVal = businessType.value;

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

  /* ----- Step 3: Optional - Submit to backend ----- */
  function finishSignup(phone) {
    const nameVal = fullName.value.trim();
    const emailVal = email.value.trim();
    const passVal = password.value;

    setLoading(btnStep3, true);
    hideFormMsg();

    fetch(API_BASE_URL + '/api/auth/signUp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nameVal,
        email: emailVal,
        password: passVal,
        phone: phone || ''
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setLoading(btnStep3, false);
        if (data.message && data.message.indexOf('email') !== -1) {
          showFormMsg('success', 'Account created! Check your email to verify your account.');
          setTimeout(function () {
            try { sessionStorage.setItem(PLAN_KEY, plan); } catch (e) {}
            window.location.href = '/thanks';
          }, 3000);
        } else if (data.message) {
          showFormMsg('error', data.message);
        } else {
          showFormMsg('error', 'Something went wrong. Please try again.');
        }
      })
      .catch(function (err) {
        setLoading(btnStep3, false);
        console.error('Signup error:', err);
        showFormMsg('error', 'Could not connect to server. URL: ' + API_BASE_URL);
      });
  }

  if (btnSkip) {
    btnSkip.addEventListener('click', function () {
      finishSignup('');
    });
  }

  if (form3) {
    form3.addEventListener('submit', function (e) {
      e.preventDefault();
      const phoneVal = document.getElementById('phone').value.trim();
      finishSignup(phoneVal);
    });
  }
})();
