document.addEventListener('DOMContentLoaded', function() {
  const dropdowns = document.querySelectorAll('.dropdown');
  const hamburgers = document.querySelectorAll('.hamburger');

  // Dropdown Logic
  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropbtn');
    const content = dropdown.querySelector('.dropdown-content');

    if (toggle && content) {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        content.classList.toggle('show');
      });

      // Close on mouse leave
      dropdown.addEventListener('mouseleave', function() {
        content.classList.remove('show');
      });
    }
  });

  // Global click to close dropdowns
  document.addEventListener('click', function(e) {
    dropdowns.forEach(dropdown => {
      const content = dropdown.querySelector('.dropdown-content');
      const toggle = dropdown.querySelector('.dropbtn');
      if (content && content.classList.contains('show') && !dropdown.contains(e.target)) {
        content.classList.remove('show');
      }
    });
  });

  // Close on scroll
  let lastY = window.scrollY;
  window.addEventListener('scroll', function() {
    const currentY = window.scrollY;
    if (Math.abs(currentY - lastY) > 5) {
      dropdowns.forEach(dropdown => {
        const content = dropdown.querySelector('.dropdown-content');
        if (content) content.classList.remove('show');
      });
    }
    lastY = currentY;
  }, { passive: true });

  // Mobile Menu Logic
  hamburgers.forEach(hamburger => {
    const nav = document.querySelector('nav ul');
    if (nav) {
      hamburger.addEventListener('click', () => {
        nav.classList.toggle('active');
        hamburger.classList.toggle('active');
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', String(!expanded));
      });
    }
  });
});
