document.addEventListener('DOMContentLoaded', function () {
  // Section Observer for Sidebar and Animations
  const sections = document.querySelectorAll('.section-card');
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  const policyJump = document.getElementById('policyJump');

  const updateActiveState = (id) => {
    const href = `#${id}`;
    sidebarLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === href);
    });
    if (policyJump) {
      policyJump.value = href;
    }
  };

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        updateActiveState(entry.target.id);
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    observer.observe(section);
  });

  // Smooth Scroll for Sidebar Links
  sidebarLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });

  // Policy Jump Select
  if (policyJump) {
    policyJump.addEventListener('change', function () {
      const targetId = this.value.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  }
});
