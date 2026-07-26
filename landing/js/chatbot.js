/**
 * SellSync Professional Chatbot
 * Modern, elegant AI assistant with enhanced UX
 */
(function() {
    'use strict';
    
    // Enhanced HTML template with modern design
    const CHAT_WIDGET_HTML = `
    <div id="chatbot-widget-container">
        <!-- Floating Toggle Button -->
        <button id="chatbot-toggle-btn" class="chatbot-toggle" aria-label="Open chat assistant">
            <div class="toggle-icon">
                <svg class="chat-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <svg class="close-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </div>
            <div class="notification-pulse"></div>
            <div class="notification-dot"></div>
        </button>
        
        <!-- Chat Window -->
        <div id="chatbot-window" class="chatbot-window">
            <!-- Header -->
            <div class="chatbot-header">
                <div class="header-content">
                    <div class="avatar-container">
                        <div class="avatar">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                            </svg>
                        </div>
                        <div class="status-indicator">
                            <div class="status-dot"></div>
                        </div>
                    </div>
                    <div class="header-info">
                        <h3 class="header-title">Sync AI</h3>
                        <p class="header-subtitle">Always here to help</p>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="action-btn minimize-btn" aria-label="Minimize chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="action-btn close-btn" aria-label="Close chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Messages Area -->
            <div class="messages-container" id="chatbot-messages">
                <div class="welcome-message">
                    <div class="welcome-icon">🚀</div>
                    <div class="welcome-content">
                        <h4>Welcome to SellSync!</h4>
                        <p>I'm your AI assistant, ready to help you discover how SellSync can transform your retail business. What would you like to know?</p>
                    </div>
                </div>
            </div>
            
            <!-- Suggested Actions -->
            <div class="suggested-actions">
                <div class="suggested-header">
                    <span class="suggested-title">Quick Questions</span>
                    <button class="collapse-btn" id="collapse-actions-btn">
                        <svg class="collapse-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="suggested-actions-grid" id="suggested-actions-grid">
                    <button class="suggested-action-btn" data-question="What is SellSync?">What is SellSync?</button>
                    <button class="suggested-action-btn" data-question="How does it work?">How does it work?</button>
                    <button class="suggested-action-btn" data-question="Key features?">Key features?</button>
                    <button class="suggested-action-btn" data-question="Pricing?">Pricing?</button>
                    <button class="suggested-action-btn" data-question="Free trial?">Free trial?</button>
                    <button class="suggested-action-btn" data-question="Multi-store support?">Multi-store support?</button>
                    <button class="suggested-action-btn" data-question="Prevent overselling?">Prevent overselling?</button>
                    <button class="suggested-action-btn" data-question="Integrations?">Integrations?</button>
                </div>
            </div>
            
            <!-- Input Area -->
            <div class="input-container">
                <div class="input-wrapper">
                    <div class="input-field-container">
                        <input type="text" id="chatbot-input" class="input-field" placeholder="Ask me anything about SellSync...">
                    </div>
                    <button class="send-btn" id="chatbot-send-btn" aria-label="Send message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
                <div class="input-footer">
                    <span class="input-hint">Press Enter to send • Get instant answers</span>
                </div>
            </div>
        </div>
    </div>
    `;

    // Inject the HTML
    document.body.insertAdjacentHTML('beforeend', CHAT_WIDGET_HTML);

    (function initChatbot() {
        const container = document.getElementById('chatbot-widget-container');
        if (!container || container.dataset.sellsyncInit === 'true') return;
        container.dataset.sellsyncInit = 'true';

        const toggleBtn = document.getElementById('chatbot-toggle-btn');
        const chatWindow = document.getElementById('chatbot-window');
        const messagesArea = document.getElementById('chatbot-messages');
        const inputField = document.getElementById('chatbot-input');
        const sendBtn = document.getElementById('chatbot-send-btn');
        const closeBtn = container.querySelector('.close-btn');
        const minimizeBtn = container.querySelector('.minimize-btn');
        const collapseBtn = document.getElementById('collapse-actions-btn');
        const suggestedGrid = document.getElementById('suggested-actions-grid');

        if (!toggleBtn || !chatWindow || !messagesArea || !inputField || !sendBtn) return;

        const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        let hasShownWelcome = false;
        let isTyping = false;
        let actionsCollapsed = false;

        const OFFLINE_RESPONSES = {
            'what is sellsync?': "SellSync is your all-in-one retail command center: a centralized platform that connects your POS, inventory, online sales channels, and analytics into a single, real-time dashboard. It automatically syncs everything the moment a sale happens — eliminating disconnected tools, manual tracking errors, and overselling risks.",
            'how does it work?': "SellSync works as the smart core of your business: Every sale (in-store via POS or online) instantly updates inventory, revenue, and reports across all channels in real time. You get one clean dashboard with alerts and insights — no manual updates or spreadsheets needed.",
            'key features?': "• Real-time sales & revenue dashboard with KPIs and trends<br>• Smart inventory tracking (low-stock alerts, oversell prevention)<br>• Automatic multi-channel sync (POS + online stores + marketplaces)<br>• Order & fulfillment management<br>• Detailed reports (daily/weekly/monthly, export Excel/PDF)<br>• POS + payment integrations<br>• Multi-location / multi-platform control<br>• Analytics for smarter decisions",
            'pricing?': "SellSync offers flexible plans starting with a free trial. Pricing is based on features, number of locations/channels, and users — affordable for small shops and scalable as you grow. [See Pricing]",
            'free trial?': "Yes! Start with a no-credit-card-required free trial to test the full platform. We also offer personalized demo calls where we walk you through setup and features specific to your retail type. [Create Account]",
            'multi-store support?': "Absolutely. SellSync handles multi-location setups seamlessly: track inventory, sales, and reports per store or combined. Transfer stock between locations, view centralized analytics, and manage everything from one dashboard.",
            'prevent overselling?': "Yes — SellSync's real-time inventory sync prevents overselling across channels. When an item sells (online or in-store), stock updates instantly everywhere, with low-stock alerts to help you restock proactively.",
            'integrations?': "SellSync integrates with popular tools like major POS hardware, payment gateways (e.g., card processors), e-commerce platforms (Shopify, WooCommerce), marketplaces (Amazon, etc.), and accounting software. [View Features]",
            'security?': "SellSync prioritizes security: data is encrypted in transit and at rest, we follow industry standards for PCI compliance, and access is role-based. Your business and customer data stay protected.",
            'support?': "We provide email/ticket support, a knowledge base, and live chat during business hours. Premium plans include priority support and onboarding help.",
            'cloud-based?': "Yes, SellSync is fully cloud-based, so you can access your dashboard, sales, and inventory from any device — phone, tablet, or computer — anytime, anywhere.",
            'reports and analytics?': "Excellent for decision-making: get sales trends, product performance, revenue by channel/location, inventory turnover, and more. Customize reports and spot opportunities fast."
        };

        function formatAIMessage(text) {
            return String(text || '')
                .replace(/\r\n/g, '\n')
                .replace(/\n/g, '<br>')
                .replace(/•/g, '<span class="bullet">•</span>')
                .replace(/\[Create Account\]/g, '<a href="signup.html" class="message-link-btn">Create Account</a>')
                .replace(/\[View Features\]/g, '<a href="#features" class="message-link-btn">View Features</a>')
                .replace(/\[See Pricing\]/g, '<a href="#get-started" class="message-link-btn">See Pricing</a>');
        }

        function addMessage(text, sender) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chatbot-message ' + (sender || 'ai');
            if ((sender || 'ai') === 'ai') {
                msgDiv.innerHTML = formatAIMessage(text);
            } else {
                msgDiv.textContent = text;
            }
            if (!prefersReduced) msgDiv.style.animation = 'messageSlide 0.3s ease-out';
            messagesArea.appendChild(msgDiv);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function showTyping() {
            if (isTyping) return;
            isTyping = true;
            const indicator = document.createElement('div');
            indicator.className = 'typing-indicator';
            indicator.id = 'typing-indicator';
            indicator.innerHTML =
                '<span class="typing-dot"></span>' +
                '<span class="typing-dot"></span>' +
                '<span class="typing-dot"></span>';
            messagesArea.appendChild(indicator);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function hideTyping() {
            isTyping = false;
            const indicator = document.getElementById('typing-indicator');
            if (indicator) indicator.remove();
        }

        function getOfflineReply(text) {
            const normalized = text.toLowerCase().trim();
            
            // Check for exact matches first
            if (OFFLINE_RESPONSES[normalized]) {
                return OFFLINE_RESPONSES[normalized];
            }

            // Keyword detection
            if (normalized.includes('price') || normalized.includes('cost') || normalized.includes('plan')) return OFFLINE_RESPONSES['pricing?'];
            if (normalized.includes('trial') || normalized.includes('demo') || normalized.includes('try')) return OFFLINE_RESPONSES['free trial?'];
            if (normalized.includes('inventory') || normalized.includes('stock')) return OFFLINE_RESPONSES['prevent overselling?'];
            if (normalized.includes('multi') && (normalized.includes('store') || normalized.includes('location'))) return OFFLINE_RESPONSES['multi-store support?'];
            if (normalized.includes('integrat') || normalized.includes('connect')) return OFFLINE_RESPONSES['integrations?'];
            if (normalized.includes('secure') || normalized.includes('privacy')) return OFFLINE_RESPONSES['security?'];
            if (normalized.includes('report') || normalized.includes('analytic')) return OFFLINE_RESPONSES['reports and analytics?'];
            if (normalized.includes('how') && normalized.includes('work')) return OFFLINE_RESPONSES['how does it work?'];
            if (normalized.includes('what') && normalized.includes('sellsync')) return OFFLINE_RESPONSES['what is sellsync?'];
            if (normalized.includes('feature')) return OFFLINE_RESPONSES['key features?'];
            
            return "I'm SellSync AI. I can help with questions about inventory, sales tracking, pricing, or multi-store management. What would you like to know?";
        }

        async function fetchAiReply(message) {
            try {
                const r = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });
                const data = await r.json().catch(() => ({}));
                const reply = data && typeof data.reply === 'string' ? data.reply.trim() : '';
                if (!r.ok || !reply) return null;
                return reply;
            } catch (e) {
                return null;
            }
        }

        async function handleSend() {
            const text = (inputField.value || '').trim();
            if (!text || isTyping) return;

            inputField.value = '';
            addMessage(text, 'user');
            showTyping();
            sendBtn.disabled = true;

            const aiReply = await fetchAiReply(text);
            const reply = aiReply || getOfflineReply(text);
            const delay = aiReply ? 0 : (prefersReduced ? 0 : 800);
            setTimeout(() => {
                hideTyping();
                addMessage(reply, 'ai');
                sendBtn.disabled = false;
            }, delay);
        }

        function openChat() {
            chatWindow.classList.add('active');
            toggleBtn.classList.add('active');
            if (!hasShownWelcome) {
                hasShownWelcome = true;
                setTimeout(() => {
                    addMessage("Hello! I'm SellSync AI. What would you like to know today?", 'ai');
                }, prefersReduced ? 0 : 400);
            }
            setTimeout(() => inputField.focus(), prefersReduced ? 0 : 300);
        }

        function closeChat() {
            chatWindow.classList.remove('active');
            toggleBtn.classList.remove('active');
        }

        toggleBtn.addEventListener('click', () => {
            if (chatWindow.classList.contains('active')) closeChat();
            else openChat();
        });

        if (closeBtn) closeBtn.addEventListener('click', closeChat);
        if (minimizeBtn) minimizeBtn.addEventListener('click', closeChat);

        if (collapseBtn && suggestedGrid) {
            collapseBtn.addEventListener('click', () => {
                actionsCollapsed = !actionsCollapsed;
                suggestedGrid.style.maxHeight = actionsCollapsed ? '0' : '240px';
                suggestedGrid.style.opacity = actionsCollapsed ? '0' : '1';
                const icon = collapseBtn.querySelector('svg');
                if (icon) icon.style.transform = actionsCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        }

        if (suggestedGrid) {
            suggestedGrid.addEventListener('click', (e) => {
                const btn = e.target.closest('.suggested-action-btn');
                if (!btn) return;
                const q = btn.getAttribute('data-question') || btn.textContent.trim();
                inputField.value = q;
                handleSend();
            });
        }

        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSend();
        });
        sendBtn.addEventListener('click', handleSend);
    })();
})();
