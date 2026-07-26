document.addEventListener('DOMContentLoaded', function () {
  // Hamburger menu toggle for mobile
  var hamburger = document.querySelector('.hamburger');
  var nav = document.querySelector('nav ul');
  if (hamburger && nav) {
    hamburger.addEventListener('click', function () {
      nav.classList.toggle('active');
      hamburger.classList.toggle('active');
      var expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!expanded));
    });
  }

  var dropdownToggle = document.querySelector('.dropbtn');
  var dropdownContent = document.querySelector('.dropdown-content');
  var dropdownItem = document.querySelector('.dropdown');
  if (dropdownToggle && dropdownContent) {
    dropdownToggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropdownContent.classList.toggle('show');
    });
    document.addEventListener('click', function (e) {
      if (!dropdownContent.contains(e.target) && !dropdownToggle.contains(e.target)) {
        dropdownContent.classList.remove('show');
      }
    });
    dropdownContent.addEventListener('click', function (e) {
      e.stopPropagation();
    });
    if (dropdownItem) {
      dropdownItem.addEventListener('mouseleave', function () {
        dropdownContent.classList.remove('show');
      });
    }
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var currentY = window.scrollY;
      if (Math.abs(currentY - lastY) > 2) {
        dropdownContent.classList.remove('show');
      }
      lastY = currentY;
    }, { passive: true });
  }
  var activeCategory = 'All';
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.filter-btn'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card[data-category]'));
  var input = document.getElementById('blog-search');
  function normalize(t) {
    return (t || '').toLowerCase();
  }
  function applyFilters() {
    var q = normalize(input ? input.value : '');
    cards.forEach(function (card) {
      var category = card.getAttribute('data-category') || '';
      var titleEl = card.querySelector('h3');
      var descEl = card.querySelector('p');
      var text = normalize((titleEl ? titleEl.textContent : '') + ' ' + (descEl ? descEl.textContent : ''));
      var categoryMatch = activeCategory === 'All' || normalize(category) === normalize(activeCategory);
      var searchMatch = q.length === 0 || text.indexOf(q) !== -1;
      var show = categoryMatch && searchMatch;
      card.style.display = show ? '' : 'none';
    });
  }
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-filter') || 'All';
      applyFilters();
    });
  });
  if (input) {
    input.addEventListener('input', applyFilters);
  }
  applyFilters();
  var observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    cards.forEach(function (card) {
      observer.observe(card);
    });
  } else {
    cards.forEach(function (card) {
      card.classList.add('reveal-visible');
    });
  }
});
