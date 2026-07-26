(function () {
  'use strict';

  const API_BASE_URL = window.CONFIG ? CONFIG.API_BASE_URL : '';

  document.addEventListener('DOMContentLoaded', function () {
    const forms = document.querySelectorAll('.newsletter-form');
    forms.forEach(function (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const btn = form.querySelector('button');
        const email = input ? input.value.trim() : '';

        if (!email) {
          showNewsletterMsg(form, 'Please enter your email.', 'error');
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Subscribing...';

        try {
          const res = await fetch(API_BASE_URL + '/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
          });
          const data = await res.json();
          if (data.ok) {
            showNewsletterMsg(form, 'Subscribed successfully!', 'success');
            if (input) input.value = '';
          } else {
            showNewsletterMsg(form, data.error || 'Subscription failed.', 'error');
          }
        } catch (err) {
          showNewsletterMsg(form, 'Could not connect to server.', 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Subscribe';
        }
      });
    });
  });

  function showNewsletterMsg(form, text, type) {
    let msg = form.querySelector('.newsletter-msg');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'newsletter-msg';
      msg.style.cssText = 'margin-top:8px;font-size:13px;font-weight:500;';
      form.appendChild(msg);
    }
    msg.textContent = text;
    msg.style.color = type === 'success' ? '#10b981' : '#ef4444';
    setTimeout(function () { msg.textContent = ''; }, 4000);
  }
})();
