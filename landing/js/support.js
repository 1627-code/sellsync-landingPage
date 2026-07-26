// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  // Hamburger menu toggle for mobile (shared business-style header)
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('nav ul');
  if (hamburger && nav) {
    hamburger.addEventListener('click', ()=>{
      nav.classList.toggle('active');
      hamburger.classList.toggle('active');
      const expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!expanded));
    });
  }

  // Solutions dropdown toggle (shared business-style header)
  const dropdownToggle = document.querySelector('.dropbtn');
  const dropdownContent = document.querySelector('.dropdown-content');
  const dropdownItem = document.querySelector('.dropdown');
  if (dropdownToggle && dropdownContent) {
    dropdownToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropdownContent.classList.toggle('show');
    });
    document.addEventListener('click', function(e) {
      if (!dropdownContent.contains(e.target) && !dropdownToggle.contains(e.target)) {
        dropdownContent.classList.remove('show');
      }
    });
    dropdownContent.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    if (dropdownItem) {
      dropdownItem.addEventListener('mouseleave', function() {
        dropdownContent.classList.remove('show');
      });
    }
    let lastY = window.scrollY;
    window.addEventListener('scroll', function() {
      const currentY = window.scrollY;
      if (Math.abs(currentY - lastY) > 2) {
        dropdownContent.classList.remove('show');
      }
      lastY = currentY;
    }, { passive: true });
  }

  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const toggle = item.querySelector('.faq-toggle');
    
    question.addEventListener('click', () => {
      answer.classList.toggle('active');
      toggle.classList.toggle('active');
    });
  });
  
  // AI Chat Assistant
  const chatInput = document.querySelector('.chat-input input');
  const chatButton = document.querySelector('.chat-input button');
  const chatMessages = document.querySelector('.chat-messages');
  
  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (isUser) {
      messageDiv.classList.add('user');
    } else {
      messageDiv.classList.add('bot');
    }
    messageDiv.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  function getAIResponse(question) {
    // Simple AI responses based on keywords
    question = question.toLowerCase();
    
    if (question.includes('campaign')) {
      return "To create a campaign, go to the Campaigns tab and click 'Create New Campaign'. Follow the wizard to set up your campaign details, target audience, and schedule.";
    } else if (question.includes('email') && (question.includes('send') || question.includes('connect'))) {
      return "To connect your email account, go to Settings > Email Integrations and select your provider. Follow the authentication steps. If emails aren't sending, check your connection and sending limits.";
    } else if (question.includes('lead') || question.includes('import')) {
      return "To import leads, go to the Leads tab and click 'Import Leads'. You can upload a CSV file or connect to your CRM. Make sure your file includes email addresses.";
    } else if (question.includes('plan') || question.includes('upgrade')) {
      return "To upgrade your plan, go to Settings > Billing and select the plan that best fits your needs. Your new plan will take effect immediately.";
    } else if (question.includes('bug') || question.includes('issue')) {
      return "To report a bug, go to the 'Report a Bug' section on this page and fill out the form with details about the issue. Include a screenshot if possible.";
    } else {
      return "I'm sorry, I don't have information about that. Please try rephrasing your question or contact our support team directly.";
    }
  }
  
  function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      addMessage(message, true);
      chatInput.value = '';
      
      // Simulate AI thinking
      setTimeout(() => {
        const response = getAIResponse(message);
        addMessage(response);
      }, 1000);
    }
  }
  
  chatButton.addEventListener('click', sendMessage);
  
  chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Bug Report Form
  const bugForm = document.querySelector('.bug-form');
  
  bugForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const issueType = document.getElementById('issue-type').value;
    const description = document.getElementById('description').value;
    const screenshot = document.getElementById('screenshot').files[0];
    
    // Simple form validation
    if (!description) {
      alert('Please provide a description of the issue.');
      return;
    }
    
    // Simulate form submission
    const submitButton = bugForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;
    
    setTimeout(() => {
      alert('Bug report submitted successfully! Our team will investigate the issue.');
      bugForm.reset();
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }, 1500);
  });
  
  // Contact Support Buttons
  const chatButtonSupport = document.querySelector('.contact-card:nth-child(1) .btn-secondary');
  const emailButtonSupport = document.querySelector('.contact-card:nth-child(2) .btn-secondary');
  
  chatButtonSupport.addEventListener('click', function() {
    alert('Live chat feature would open here.');
  });
  
  emailButtonSupport.addEventListener('click', function() {
    window.location.href = 'mailto:support@sellsyn.ai';
  });
  
  // Search Functionality
  const searchInput = document.querySelector('.search-bar input');
  const searchButton = document.querySelector('.search-bar button');
  
  function performSearch() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
      alert(`Searching for: ${searchTerm}`);
      // In a real implementation, this would redirect to search results
    }
  }
  
  searchButton.addEventListener('click', performSearch);
  
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  // Category Cards Click Events
  const categoryCards = document.querySelectorAll('.category-card');
  
  categoryCards.forEach(card => {
    card.addEventListener('click', function() {
      const category = this.querySelector('h3').textContent;
      alert(`You selected the ${category} category.`);
      // In a real implementation, this would redirect to the relevant help articles
    });
  });
});