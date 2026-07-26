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
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    animatedSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add('scroll-fade', 'visible');
      });
    });
  } else {
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

    animatedSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el, idx) => {
        el.classList.add('scroll-fade');
        el.dataset.staggerIndex = idx.toString();
        intersectionObserver.observe(el);
      });
    });
  }

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

  const updateProgress = () => {
    const scrollTop = window.scrollY || window.pageYOffset;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollTop / docHeight : 0;
    progressBar.style.transform = `scaleX(${progress})`;
  };

  const handleScroll = () => {
    updateProgress();
    if (!prefersReducedMotion && heroImageWrapper) {
      const rawOffset = (window.scrollY || window.pageYOffset) * 0.06;
      const offset = Math.max(0, Math.min(120, rawOffset));
      heroImageWrapper.style.transform = `translateY(${offset}px)`;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Newsletter Subscription
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input[type="email"]');
      const email = input.value.trim();
      const button = newsletterForm.querySelector('button');

      // Simple email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (emailRegex.test(email)) {
        // Success
        const originalText = button.textContent;
        button.textContent = 'Subscribed!';
        button.style.backgroundColor = '#10b981'; // Green
        button.disabled = true;
        input.value = '';
        input.disabled = true;
        
        // Show success message
        const successMsg = document.createElement('p');
        successMsg.textContent = 'Thank you for subscribing!';
        successMsg.style.color = '#10b981';
        successMsg.style.fontSize = '0.875rem';
        successMsg.style.marginTop = '8px';
        newsletterForm.appendChild(successMsg);

        // Reset after 3 seconds
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = '';
          button.disabled = false;
          input.disabled = false;
          if (successMsg.parentNode) {
            successMsg.parentNode.removeChild(successMsg);
          }
        }, 3000);
      } else {
        // Error
        input.style.borderColor = '#ef4444'; // Red
        const errorMsg = document.createElement('p');
        errorMsg.textContent = 'Please enter a valid email address.';
        errorMsg.style.color = '#ef4444';
        errorMsg.style.fontSize = '0.875rem';
        errorMsg.style.marginTop = '8px';
        
        // Remove old error if exists
        const oldError = newsletterForm.querySelector('.error-msg');
        if (oldError) oldError.remove();
        
        errorMsg.classList.add('error-msg');
        newsletterForm.appendChild(errorMsg);

        setTimeout(() => {
          input.style.borderColor = '';
          if (errorMsg.parentNode) {
            errorMsg.parentNode.removeChild(errorMsg);
          }
        }, 3000);
      }
    });
  }

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
