document.addEventListener('DOMContentLoaded', function() {
  // --- Quick Help Modal Functionality ---
  const helpModal = document.getElementById('help-modal');
  const modalBody = document.getElementById('modal-body');
  const closeModalBtn = helpModal.querySelector('.close-modal');
  const categoryCards = document.querySelectorAll('.category-card');

  const modalContent = {
    'getting-started': {
      title: 'Getting Started with SellSync',
      body: `
        <div class="panel-content-body">
          <h2>Getting Started</h2>
          <p>Welcome to SellSync! Setting up your business management platform is simple and straightforward. Follow these steps to get up and running:</p>
          <ul>
            <li><strong>Creating an account:</strong> Sign up using your email or Google account to access your personal dashboard.</li>
            <li><strong>Setting up your business:</strong> Enter your business name, location, and industry type to customize your experience.</li>
            <li><strong>Choosing a plan:</strong> Select from our Free, Growth, or Custom plans based on your business size and needs.</li>
            <li><strong>Managing sales & inventory:</strong> Start adding products and recording transactions immediately.</li>
          </ul>
          <button id="start-setup-btn" class="btn-black">Start Setup</button>
        </div>
      `
    },
    'campaign-help': {
      title: 'Campaign Help',
      body: `
        <div class="panel-content-body">
          <h2>Campaign Help</h2>
          <p>Learn how to manage and optimize your marketing campaigns directly within SellSync to drive more sales.</p>
          <ul>
            <li><strong>Creating Campaigns:</strong> Use our intuitive builder to design email and SMS campaigns for your customers.</li>
            <li><strong>Targeting:</strong> Segment your customer base based on purchase history and behavior.</li>
            <li><strong>Optimization:</strong> Track open rates, click-through rates, and conversion metrics in real-time.</li>
          </ul>
        </div>
      `
    },
    'integrations': {
      title: 'Integrations',
      body: `
        <div class="panel-content-body">
          <h2>Integrations</h2>
          <p>SellSync connects seamlessly with the tools you already use to run your business efficiently.</p>
          <ul>
            <li><strong>POS Systems:</strong> Sync your existing Point of Sale hardware with our cloud database.</li>
            <li><strong>Accounting:</strong> Export financial data directly to popular accounting software.</li>
            <li><strong>E-commerce:</strong> Connect your online store to manage inventory across all channels.</li>
          </ul>
        </div>
      `
    },
    'billing': {
      title: 'Billing & Plans',
      body: `
        <div class="panel-content-body">
          <h2>Billing & Plans</h2>
          <p>Manage your SellSync subscription and payment details with ease.</p>
          <ul>
            <li><strong>Subscription Plans:</strong> View and compare our Free, Growth (₦2,000/mo), and Custom plans.</li>
            <li><strong>Billing Cycles:</strong> Choose between monthly or annual billing to suit your cash flow.</li>
            <li><strong>Upgrading:</strong> Scale your plan instantly as your business grows to unlock more features.</li>
            <li><strong>Payment Methods:</strong> Securely manage your credit cards and bank transfer options.</li>
          </ul>
        </div>
      `
    },
    'report-bug': {
      title: 'Report a Bug',
      body: `
        <div class="panel-content-body">
          <h2>Report a Bug</h2>
          <p>Encountered a technical issue? Our engineering team is ready to help resolve any problems you face.</p>
          <p>When reporting a bug, please include as much detail as possible, such as what you were doing when it happened and any error messages you saw.</p>
          <button id="bug-contact-btn" class="btn-black">Contact Us</button>
        </div>
      `
    },
    'contact-support': {
      title: 'Contact Support',
      body: `
        <div class="panel-content-body">
          <h2>Contact Support</h2>
          <p>Need direct assistance? You can schedule a support call with our dedicated success team.</p>
          <p>We'll guide you through any challenges and help you get the most out of SellSync.</p>
          <p><em>You will be redirected to the Schedule a Call page in a few seconds...</em></p>
        </div>
      `
    }
  };

  function openModal(category) {
    const content = modalContent[category];
    if (content) {
      modalBody.innerHTML = content.body;
      helpModal.classList.add('open');

      // Special logic for specific buttons inside modal
      if (category === 'getting-started') {
        document.getElementById('start-setup-btn').addEventListener('click', () => {
          window.location.href = 'business.html#get-started';
        });
      } else if (category === 'report-bug') {
        document.getElementById('bug-contact-btn').addEventListener('click', () => {
          closeModal();
          document.getElementById('contact-support-section').scrollIntoView({ behavior: 'smooth' });
        });
      } else if (category === 'contact-support') {
        setTimeout(() => {
          if (helpModal.classList.contains('open')) {
            window.location.href = 'schedule-call.html';
          }
        }, 4000);
      }
    }
  }

  function closeModal() {
    helpModal.classList.remove('open');
  }

  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      const category = card.getAttribute('data-category');
      openModal(category);
    });
  });

  closeModalBtn.addEventListener('click', closeModal);
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeModal();
  });

  // --- FAQ Accordion (Synced with business.html) ---
  const faqQuestions = document.querySelectorAll('.faq-item h3');
  faqQuestions.forEach(item => {
    item.addEventListener('click', () => {
      // Close other items
      faqQuestions.forEach(q => {
        if (q !== item) {
          q.classList.remove('active');
          q.nextElementSibling.classList.remove('active');
        }
      });
      // Toggle current item
      item.classList.toggle('active');
      item.nextElementSibling.classList.toggle('active');
    });
  });

  // --- Live Chat Modal Functionality ---
  const liveChatCard = document.getElementById('live-chat-card');
  const liveChatModal = document.getElementById('live-chat-modal');
  const closeLiveChatModalBtn = document.querySelector('#live-chat-modal .close-modal');
  const chatMessages = document.getElementById('live-chat-messages');
  const chatInput = document.getElementById('live-chat-input');
  const sendBtn = document.getElementById('live-chat-send');

  if (liveChatCard) {
    liveChatCard.addEventListener('click', () => {
      if (liveChatModal) {
        liveChatModal.classList.add('open');
        // Professional initial message
        chatMessages.innerHTML = '<div class="message bot"><p>Contacting our live agent, wait a bit...</p></div>';
        
        // Optional: Simulate agent joining after a delay
        setTimeout(() => {
          addChatMessage("An agent has joined the chat. How can we help you today?", 'bot');
        }, 3000);
      }
    });
  }

  function closeChat() {
    liveChatModal.classList.remove('open');
  }

  closeLiveChatModalBtn.addEventListener('click', closeChat);
  liveChatModal.addEventListener('click', (e) => {
    if (e.target === liveChatModal) closeChat();
  });

  function addChatMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    addChatMessage(text, 'user');
    chatInput.value = '';

    // Simulate agent response
    setTimeout(() => {
      addChatMessage("Thanks for reaching out! A support agent will be with you in just a moment.", 'bot');
    }, 1500);
  }

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });

  // --- Email Support Functionality ---
  const emailSupportCard = document.getElementById('email-support-card');
  if (emailSupportCard) {
    emailSupportCard.addEventListener('click', () => {
      const email = 'sellsynctechnology@gmail.com';
      const subject = 'SellSync Support Request';
      // Open Gmail compose with recipient pre-filled.
      window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}`, '_blank');
    });
  }

  // --- Ask SellSync AI (made to behave like the chatbot UX) ---
  const aiInput = document.querySelector('.ai-assistant .chat-input input');
  const aiSendBtn = document.querySelector('.ai-assistant .chat-input button');
  const aiMessages = document.querySelector('.ai-assistant .chat-messages');

  function addAiMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerHTML = `<p>${String(text)}</p>`;
    aiMessages.appendChild(msgDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  function showAiTyping() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'ai-typing-indicator';
    indicator.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    aiMessages.appendChild(indicator);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  function hideAiTyping() {
    const indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.remove();
  }

  let aiIsTyping = false;

  function handleAiQuery() {
    if (!aiInput || !aiSendBtn || !aiMessages) return;
    const query = aiInput.value.trim();
    if (!query || aiIsTyping) return;

    aiIsTyping = true;
    aiSendBtn.disabled = true;
    aiSendBtn.style.opacity = '0.75';

    addAiMessage(query, 'user');
    aiInput.value = '';

    showAiTyping();

    // Simple keyword-based AI logic (same content as before, improved UX)
    setTimeout(() => {
      let response = "I'm the SellSync assistant. I can help you with inventory, sales tracking, and platform features. Could you be more specific?";
      const q = query.toLowerCase();
      if (q.includes('inventory')) response = "SellSync helps you track inventory across multiple locations automatically as sales happen.";
      if (q.includes('price') || q.includes('cost')) response = "We offer a Free plan, a Growth plan at ₦5,000/month, and custom enterprise solutions.";
      if (q.includes('signup') || q.includes('start')) response = "You can start by clicking 'Get Started' on our main page and choosing a plan.";

      hideAiTyping();
      addAiMessage(response, 'bot');

      aiIsTyping = false;
      aiSendBtn.disabled = false;
      aiSendBtn.style.opacity = '';
    }, 900);
  }

  if (aiSendBtn) aiSendBtn.addEventListener('click', handleAiQuery);
  if (aiInput) {
    aiInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAiQuery();
    });
  }
});
