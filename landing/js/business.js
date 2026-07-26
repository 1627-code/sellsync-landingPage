document.addEventListener('DOMContentLoaded', () => {
  const pieChartCanvas = document.getElementById('salesPieChart');
  const barChartCanvas = document.getElementById('salesBarChart');

  if (pieChartCanvas && barChartCanvas && window.Chart) {
    const pieCtx = pieChartCanvas.getContext('2d');
    const barCtx = barChartCanvas.getContext('2d');

    new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: ['Active Sales', 'Delivered', 'Cancelled', 'Pending'],
        datasets: [{
          data: [200, 150, 50, 100],
          backgroundColor: ['#00bfa5', '#2196f3', '#f44336', '#ff9800']
        }]
      }
    });

    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
          label: 'Sales Activity',
          data: [50, 75, 60, 90, 100, 80, 70],
          backgroundColor: '#2196f3'
        }]
      }
    });
  }

  // Scroll-triggered reveals
  const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const delay = (parseInt(target.dataset.staggerIndex || index, 10) || 0) * 120;
        setTimeout(() => {
          target.classList.add('visible');
        }, delay);
        intersectionObserver.unobserve(target);
      }
    });
  }, { threshold: 0.12 });

  const animatedSelectors = [
    '.animated-card',
    '.feature-card',
    '.step',
    '.testimonial-carousel',
    '.faq-item',
    '.contact-form',
    '.contact-info',
    '.features-header',
    '.how-it-works-header',
    '.testimonial-header',
    '.pricing-header',
    '.faq-header',
    '.contact-header'
  ];

  animatedSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el, idx) => {
      el.classList.add('scroll-fade');
      el.dataset.staggerIndex = idx.toString();
      intersectionObserver.observe(el);
    });
  });

  // Navbar entrance
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    requestAnimationFrame(() => {
      navbar.classList.add('navbar-animate', 'navbar-visible');
    });
  }

  // Hero button micro-interaction
  const heroCta = document.querySelector('.hero .btn-black');
  if (heroCta) {
    heroCta.addEventListener('click', () => {
      heroCta.classList.add('btn-press');
      setTimeout(() => {
        heroCta.classList.remove('btn-press');
      }, 180);
    });
  }

  // Scroll progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  const heroImageWrapper = document.querySelector('.hero-image');
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateProgress = () => {
    const scrollTop = window.scrollY || window.pageYOffset;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollTop / docHeight : 0;
    progressBar.style.transform = `scaleX(${progress})`;
  };

  const handleScroll = () => {
    updateProgress();
    if (!prefersReducedMotion && heroImageWrapper) {
      const offset = (window.scrollY || window.pageYOffset) * 0.06;
      heroImageWrapper.style.transform = `translateY(${offset}px)`;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Button ripple micro-interaction
  const rippleButtons = document.querySelectorAll('.btn-black, .btn-outline, .btn-white, .nav-right .cta, .newsletter-form button');
  rippleButtons.forEach((btn) => {
    btn.classList.add('btn-ripple');
    btn.addEventListener('click', () => {
      btn.classList.remove('ripple-active');
      // Force reflow to allow re-triggering animation
      // eslint-disable-next-line no-unused-expressions
      void btn.offsetWidth;
      btn.classList.add('ripple-active');
    });
  });
});