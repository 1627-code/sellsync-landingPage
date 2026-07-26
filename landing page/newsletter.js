document.addEventListener('DOMContentLoaded', function () {
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
        // Show loading state
        button.textContent = 'Subscribing...';
        button.disabled = true;

        const apiBase = (window.location.origin && window.location.origin !== 'null') ? '' : 'http://localhost:5050';

        fetch(apiBase + '/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
          if (data.ok) {
            // Success
            button.textContent = 'Subscribed!';
            button.style.backgroundColor = '#10b981'; // Green
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
              button.textContent = 'Subscribe';
              button.style.backgroundColor = '';
              button.disabled = false;
              input.disabled = false;
              if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
              }
            }, 3000);
          } else {
            throw new Error(data.error || 'Subscription failed');
          }
        })
        .catch(error => {
          button.textContent = 'Subscribe';
          button.disabled = false;
          input.style.borderColor = '#ef4444'; // Red
          const errorMsg = document.createElement('p');
          errorMsg.textContent = error.message || 'Something went wrong. Please try again.';
          errorMsg.style.color = '#ef4444';
          errorMsg.style.fontSize = '0.875rem';
          errorMsg.style.marginTop = '8px';
          
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
        });
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
});
