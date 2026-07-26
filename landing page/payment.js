(function () {
  'use strict';

  var PLANS = {
    starter: {
      name: 'Starter',
      desc: 'Perfect for small businesses getting started.',
      price: 2000,
      priceLabel: '₦2,000'
    },
    growth: {
      name: 'Growth',
      desc: 'Ideal for growing retail businesses.',
      price: 5000,
      priceLabel: '₦5,000'
    },
    scale: {
      name: 'Scale',
      desc: 'For established retail chains.',
      price: 10000,
      priceLabel: '₦10,000'
    }
  };

  var plan = (function () {
    var m = /[?&]plan=([^&]+)/.exec(window.location.search);
    var p = m ? m[1].toLowerCase() : null;
    if (p && PLANS[p]) return p;
    window.location.replace('business.html#get-started');
    return null;
  })();

  if (!plan) return;

  var config = PLANS[plan];
  var planNameEl = document.getElementById('planName');
  var planDescEl = document.getElementById('planDesc');
  var planPriceEl = document.getElementById('planPrice');
  var paymentSection = document.getElementById('paymentSection');
  var paymentForm = document.getElementById('paymentForm');
  var payBtn = document.getElementById('payBtn');
  var paymentMessage = document.getElementById('paymentMessage');
  var cardName = document.getElementById('cardName');
  var cardNumber = document.getElementById('cardNumber');
  var cardExpiry = document.getElementById('cardExpiry');
  var cardCvc = document.getElementById('cardCvc');

  function showMsg(type, text) {
    paymentMessage.textContent = text;
    paymentMessage.className = 'form-message visible ' + type;
  }

  function hideMsg() {
    paymentMessage.className = 'form-message';
    paymentMessage.textContent = '';
  }

  function setError(input, message) {
    if (!input) return;
    input.classList.add('error');
    var err = document.getElementById(input.id + 'Error');
    if (err) err.textContent = message;
  }

  function clearError(input) {
    if (!input) return;
    input.classList.remove('error');
    var err = document.getElementById(input.id + 'Error');
    if (err) err.textContent = '';
  }

  function setLoading(on) {
    if (!payBtn) return;
    payBtn.disabled = on;
    payBtn.classList.toggle('loading', on);
  }

  /* ----- Plan summary (fixed amount only; never exceeded) ----- */
  planNameEl.textContent = config.name;
  planDescEl.textContent = config.desc;
  planPriceEl.innerHTML = config.priceLabel + ' <span>/ month</span>';

  /* ----- Card number formatting ----- */
  if (cardNumber) {
    cardNumber.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '');
      var g = v.match(/.{1,4}/g) || [];
      this.value = g.join(' ').slice(0, 19);
      clearError(cardNumber);
      hideMsg();
    });
  }

  if (cardExpiry) {
    cardExpiry.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '');
      if (v.length >= 2)
        this.value = v.slice(0, 2) + '/' + v.slice(2, 4);
      else
        this.value = v;
      clearError(cardExpiry);
      hideMsg();
    });
  }

  [cardName, cardNumber, cardExpiry, cardCvc].forEach(function (el) {
    if (!el) return;
    el.addEventListener('focus', function () {
      clearError(el);
    });
  });

  function validateForm() {
    var ok = true;
    [cardName, cardNumber, cardExpiry, cardCvc].forEach(function (el) {
      if (el) clearError(el);
    });
    hideMsg();

    var nameVal = cardName && cardName.value.trim();
    var numVal = cardNumber && cardNumber.value.replace(/\s/g, '');
    var expVal = cardExpiry && cardExpiry.value.trim();
    var cvcVal = cardCvc && cardCvc.value.trim();

    if (!nameVal) {
      setError(cardName, 'Please enter the name on card.');
      if (ok) cardName.focus();
      ok = false;
    }
    if (!numVal || numVal.length < 13) {
      setError(cardNumber, 'Please enter a valid card number.');
      if (ok) cardNumber.focus();
      ok = false;
    }
    if (!expVal || !/^\d{2}\/\d{2}$/.test(expVal)) {
      setError(cardExpiry, 'Please enter expiry (MM/YY).');
      if (ok) cardExpiry.focus();
      ok = false;
    }
    if (!cvcVal || cvcVal.length < 3) {
      setError(cardCvc, 'Please enter a valid CVC.');
      if (ok) cardCvc.focus();
      ok = false;
    }
    return ok;
  }

  if (paymentForm) {
    paymentForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm()) return;

      setLoading(true);
      hideMsg();

      /* Simulated payment. Replace with Paystack/Flutterwave API call. */
      setTimeout(function () {
        setLoading(false);
        showMsg('success', 'Payment successful! Taking you to sign in…');
        if (paymentSection) paymentSection.style.display = 'none';
        setTimeout(function () {
          window.location.href = 'login.html';
        }, 1500);
      }, 1500);
    });
  }
})();
