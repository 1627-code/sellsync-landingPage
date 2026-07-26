(function () {
  'use strict';

  var form = document.getElementById('scheduleForm');
  var msg = document.getElementById('scheduleMessage');
  var btn = document.getElementById('submitBtn');
  var apiBase = (window.location.origin && window.location.origin !== 'null') ? '' : 'http://localhost:5050';

  var fields = {
    fullName: document.getElementById('fullName'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    businessName: document.getElementById('businessName'),
    businessType: document.getElementById('businessType'),
    preferDate: document.getElementById('preferDate'),
    preferTime: document.getElementById('preferTime'),
    extra: document.getElementById('extra')
  };

  var intentCheckboxes = document.querySelectorAll('input[name="intent"]');

  if (fields.preferDate) {
    var today = new Date().toISOString().slice(0, 10);
    fields.preferDate.setAttribute('min', today);
  }

  function showMsg(type, text) {
    msg.textContent = text;
    msg.className = 'form-message visible ' + type;
  }

  function hideMsg() {
    msg.className = 'form-message';
    msg.textContent = '';
  }

  function setError(el, text) {
    if (!el) return;
    el.classList.add('error');
    var err = document.getElementById(el.id + 'Error');
    if (err) err.textContent = text;
  }

  function clearError(el) {
    if (!el) return;
    el.classList.remove('error');
    var err = document.getElementById(el.id + 'Error');
    if (err) err.textContent = '';
  }

  function clearAll() {
    Object.keys(fields).forEach(function (k) {
      if (fields[k]) clearError(fields[k]);
    });
    var intentErr = document.getElementById('intentError');
    if (intentErr) intentErr.textContent = '';
    hideMsg();
  }

  function validate() {
    clearAll();
    var ok = true;

    if (!(fields.fullName && fields.fullName.value.trim())) {
      setError(fields.fullName, 'Please enter your full name.');
      if (ok) fields.fullName.focus();
      ok = false;
    }
    if (!(fields.email && fields.email.value.trim())) {
      setError(fields.email, 'Please enter your email.');
      if (ok) fields.email.focus();
      ok = false;
    }
    if (!(fields.phone && fields.phone.value.trim())) {
      setError(fields.phone, 'Please enter your phone number.');
      if (ok) fields.phone.focus();
      ok = false;
    }
    if (!(fields.businessName && fields.businessName.value.trim())) {
      setError(fields.businessName, 'Please enter your business name.');
      if (ok) fields.businessName.focus();
      ok = false;
    }
    if (!(fields.businessType && fields.businessType.value)) {
      setError(fields.businessType, 'Please choose a business type.');
      if (ok) fields.businessType.focus();
      ok = false;
    }

    var intent = [];
    intentCheckboxes.forEach(function (c) {
      if (c.checked) intent.push(c.value);
    });
    if (intent.length === 0) {
      var ie = document.getElementById('intentError');
      if (ie) ie.textContent = 'Please select at least one option.';
      ok = false;
    }

    if (!(fields.preferDate && fields.preferDate.value)) {
      setError(fields.preferDate, 'Please select a date.');
      if (ok) fields.preferDate.focus();
      ok = false;
    }
    if (!(fields.preferTime && fields.preferTime.value)) {
      setError(fields.preferTime, 'Please select a time.');
      if (ok) fields.preferTime.focus();
      ok = false;
    }

    return ok;
  }

  function setLoading(on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('loading', on);
  }

  [fields.fullName, fields.email, fields.phone, fields.businessName, fields.businessType, fields.preferDate, fields.preferTime, fields.extra].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', clearAll);
    el.addEventListener('focus', function () { clearError(el); });
  });
  intentCheckboxes.forEach(function (c) {
    c.addEventListener('change', function () {
      var ie = document.getElementById('intentError');
      if (ie) ie.textContent = '';
      hideMsg();
    });
  });

  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var intent = [];
    intentCheckboxes.forEach(function (c) {
      if (c.checked) intent.push(c.value);
    });

    var payload = {
      fullName: (fields.fullName && fields.fullName.value) ? fields.fullName.value.trim() : '',
      email: (fields.email && fields.email.value) ? fields.email.value.trim() : '',
      phone: (fields.phone && fields.phone.value) ? fields.phone.value.trim() : '',
      businessName: (fields.businessName && fields.businessName.value) ? fields.businessName.value.trim() : '',
      businessType: (fields.businessType && fields.businessType.value) ? fields.businessType.value : '',
      intent: intent,
      preferDate: (fields.preferDate && fields.preferDate.value) ? fields.preferDate.value : '',
      preferTime: (fields.preferTime && fields.preferTime.value) ? fields.preferTime.value : '',
      extra: (fields.extra && fields.extra.value) ? fields.extra.value.trim() : ''
    };

    setLoading(true);
    hideMsg();

    fetch(apiBase + '/api/schedule-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setLoading(false);
        if (data.ok) {
          showMsg('success', "Thanks! We'll reach out shortly to confirm your call.");
          form.reset();
        } else {
          showMsg('error', data.error || 'Something went wrong. Please try again.');
        }
      })
      .catch(function () {
        setLoading(false);
        showMsg('error', 'Could not send. Run the contact server (python contact_server.py) and open this page from http://localhost:5050');
      });
  });
})();
