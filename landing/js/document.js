document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.classList.add('visible');
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 100); // Stagger the animation
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  const elementsToAnimate = document.querySelectorAll('.hero-text h1, .hero-text p, .hero-text .buttons, .feature-card');
  elementsToAnimate.forEach(el => {
    observer.observe(el);
  });
});
