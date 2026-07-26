document.addEventListener('DOMContentLoaded', function () {
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
