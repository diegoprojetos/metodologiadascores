// Analytics System for Sales Funnel
// Created by Claude - Full tracking implementation

(function() {
    'use strict';
    
    // Configuration
    const ANALYTICS_KEY = 'cronograma_analytics';
    const SESSION_KEY = 'cronograma_session';
    const FUNNEL_STAGES = {
        QUIZ_LOADED: 'quiz_loaded',
        QUIZ_STARTED: 'quiz_started',
        QUIZ_COMPLETED: 'quiz_completed',
        SALES_PAGE_LOADED: 'sales_page_loaded',
        SALES_PAGE_SCROLLED: 'sales_page_scrolled',
        CHECKOUT_CLICKED: 'checkout_clicked'
    };
    
    // Initialize Analytics
    class FunnelAnalytics {
        constructor() {
            this.sessionId = this.getOrCreateSession();
            this.startTime = Date.now();
            this.data = this.loadData();
            this.currentPage = this.detectCurrentPage();
            this.init();
        }
        
        // Get or create session
        getOrCreateSession() {
            let session = sessionStorage.getItem(SESSION_KEY);
            if (!session) {
                session = this.generateSessionId();
                sessionStorage.setItem(SESSION_KEY, session);
            }
            return session;
        }
        
        // Generate unique session ID
        generateSessionId() {
            return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        // Load existing data from localStorage
        loadData() {
            const stored = localStorage.getItem(ANALYTICS_KEY);
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    console.error('Error loading analytics data:', e);
                    return this.getDefaultData();
                }
            }
            return this.getDefaultData();
        }
        
        // Get default data structure
        getDefaultData() {
            return {
                totalSessions: 0,
                events: [],
                funnelMetrics: {
                    quiz_loaded: 0,
                    quiz_started: 0,
                    quiz_completed: 0,
                    sales_page_loaded: 0,
                    sales_page_scrolled: 0,
                    checkout_clicked: 0
                },
                dailyStats: {},
                conversionRates: {},
                sessions: []
            };
        }
        
        // Save data to localStorage
        saveData() {
            try {
                localStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.data));
            } catch (e) {
                console.error('Error saving analytics data:', e);
            }
        }
        
        // Detect current page
        detectCurrentPage() {
            const path = window.location.pathname;
            const page = path.split('/').pop() || 'index.html';
            
            if (page.includes('index') || page.includes('quiz')) {
                return 'quiz';
            } else if (page.includes('vendas') || page.includes('sales')) {
                return 'sales';
            } else if (page.includes('dashboard') || page.includes('analytics')) {
                return 'dashboard';
            }
            return 'unknown';
        }
        
        // Initialize tracking based on current page
        init() {
            // Track page load
            this.trackPageLoad();
            
            // Set up page-specific tracking
            switch(this.currentPage) {
                case 'quiz':
                    this.initQuizTracking();
                    break;
                case 'sales':
                    this.initSalesPageTracking();
                    break;
                case 'dashboard':
                    // Dashboard doesn't need tracking
                    break;
            }
            
            // Track time on page
            this.trackTimeOnPage();
            
            // Track UTM parameters
            this.trackUTMParams();
        }
        
        // Track page load
        trackPageLoad() {
            if (this.currentPage === 'quiz') {
                this.trackEvent(FUNNEL_STAGES.QUIZ_LOADED);
            } else if (this.currentPage === 'sales') {
                this.trackEvent(FUNNEL_STAGES.SALES_PAGE_LOADED);
            }
        }
        
        // Initialize quiz tracking
        initQuizTracking() {
            // Track quiz start
            const startButton = document.querySelector('[onclick*="startQuiz"]');
            if (startButton) {
                startButton.addEventListener('click', () => {
                    this.trackEvent(FUNNEL_STAGES.QUIZ_STARTED, {
                        timestamp: Date.now()
                    });
                });
            }
            
            // Track quiz completion
            const resultScreen = document.getElementById('resultScreen');
            if (resultScreen) {
                // Use MutationObserver to detect when result screen is shown
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.target.style.display === 'block' || 
                            mutation.target.classList.contains('active')) {
                            this.trackEvent(FUNNEL_STAGES.QUIZ_COMPLETED, {
                                score: document.getElementById('scoreNumber')?.textContent || 'N/A',
                                timeToComplete: Date.now() - this.startTime
                            });
                            observer.disconnect();
                        }
                    });
                });
                
                observer.observe(resultScreen, {
                    attributes: true,
                    attributeFilter: ['style', 'class']
                });
            }
            
            // Track CTA clicks to sales page
            document.addEventListener('click', (e) => {
                const target = e.target.closest('a, button');
                if (target) {
                    const href = target.href || target.getAttribute('onclick') || '';
                    if (href.includes('vendas') || href.includes('sales') || 
                        href.includes('goToOffer') || href.includes('checkout')) {
                        this.trackEvent('quiz_cta_clicked', {
                            buttonText: target.textContent.trim(),
                            destination: href
                        });
                    }
                }
            });
        }
        
        // Initialize sales page tracking
        initSalesPageTracking() {
            let scrollTracked = false;
            let maxScroll = 0;
            
            // Track scroll depth
            window.addEventListener('scroll', () => {
                const scrollPercentage = (window.scrollY + window.innerHeight) / document.body.scrollHeight * 100;
                maxScroll = Math.max(maxScroll, scrollPercentage);
                
                // Track when user reaches checkout area (assuming it's in the bottom 30% of page)
                if (!scrollTracked && scrollPercentage > 70) {
                    scrollTracked = true;
                    this.trackEvent(FUNNEL_STAGES.SALES_PAGE_SCROLLED, {
                        scrollDepth: Math.round(scrollPercentage) + '%',
                        timeToScroll: Date.now() - this.startTime
                    });
                }
            });
            
            // Track checkout button clicks
            document.addEventListener('click', (e) => {
                const target = e.target.closest('a, button');
                if (target) {
                    const text = target.textContent.toLowerCase();
                    const href = target.href || '';
                    
                    if (text.includes('checkout') || text.includes('comprar') || 
                        text.includes('garantir') || href.includes('hotmart') || 
                        href.includes('monetizze') || href.includes('pay')) {
                        this.trackEvent(FUNNEL_STAGES.CHECKOUT_CLICKED, {
                            buttonText: target.textContent.trim(),
                            position: this.getElementPosition(target),
                            scrollDepth: maxScroll + '%',
                            timeOnPage: Date.now() - this.startTime
                        });
                    }
                }
            });
            
            // Track video plays if any
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                video.addEventListener('play', () => {
                    this.trackEvent('video_played', {
                        duration: video.duration,
                        currentTime: video.currentTime
                    });
                });
            });
        }
        
        // Get element position on page
        getElementPosition(element) {
            const rect = element.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            return {
                top: rect.top + scrollTop,
                percentage: ((rect.top + scrollTop) / document.body.scrollHeight * 100).toFixed(2) + '%'
            };
        }
        
        // Track time on page
        trackTimeOnPage() {
            window.addEventListener('beforeunload', () => {
                const timeOnPage = Date.now() - this.startTime;
                this.trackEvent('page_exit', {
                    page: this.currentPage,
                    timeOnPage: timeOnPage,
                    scrollDepth: ((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100).toFixed(2) + '%'
                });
            });
        }
        
        // Track UTM parameters
        trackUTMParams() {
            const params = new URLSearchParams(window.location.search);
            const utmData = {};
            
            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
                if (params.get(param)) {
                    utmData[param] = params.get(param);
                }
            });
            
            if (Object.keys(utmData).length > 0) {
                this.trackEvent('utm_parameters', utmData);
            }
        }
        
        // Main tracking function
        trackEvent(eventName, data = {}) {
            const event = {
                event: eventName,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString(),
                page: this.currentPage,
                url: window.location.href,
                referrer: document.referrer,
                userAgent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                data: data
            };
            
            // Add to events array
            this.data.events.push(event);
            
            // Update funnel metrics
            if (this.data.funnelMetrics.hasOwnProperty(eventName)) {
                this.data.funnelMetrics[eventName]++;
            }
            
            // Update daily stats
            const today = new Date().toISOString().split('T')[0];
            if (!this.data.dailyStats[today]) {
                this.data.dailyStats[today] = {
                    sessions: 0,
                    events: {},
                    conversions: {}
                };
            }
            
            if (!this.data.dailyStats[today].events[eventName]) {
                this.data.dailyStats[today].events[eventName] = 0;
            }
            this.data.dailyStats[today].events[eventName]++;
            
            // Update session data
            this.updateSessionData(event);
            
            // Calculate conversion rates
            this.calculateConversionRates();
            
            // Save to localStorage
            this.saveData();
            
            // Optional: Send to external analytics (Google Analytics, etc.)
            this.sendToExternalAnalytics(event);
        }
        
        // Update session data
        updateSessionData(event) {
            let session = this.data.sessions.find(s => s.id === this.sessionId);
            if (!session) {
                session = {
                    id: this.sessionId,
                    startTime: new Date().toISOString(),
                    events: [],
                    funnel: {}
                };
                this.data.sessions.push(session);
                this.data.totalSessions++;
            }
            
            session.events.push(event.event);
            session.lastActivity = new Date().toISOString();
            session.funnel[event.event] = true;
        }
        
        // Calculate conversion rates
        calculateConversionRates() {
            const metrics = this.data.funnelMetrics;
            
            // Quiz start rate
            if (metrics.quiz_loaded > 0) {
                this.data.conversionRates.quizStartRate = 
                    ((metrics.quiz_started / metrics.quiz_loaded) * 100).toFixed(2);
            }
            
            // Quiz completion rate
            if (metrics.quiz_started > 0) {
                this.data.conversionRates.quizCompletionRate = 
                    ((metrics.quiz_completed / metrics.quiz_started) * 100).toFixed(2);
            }
            
            // Sales page view rate
            if (metrics.quiz_completed > 0) {
                this.data.conversionRates.salesPageViewRate = 
                    ((metrics.sales_page_loaded / metrics.quiz_completed) * 100).toFixed(2);
            }
            
            // Scroll rate
            if (metrics.sales_page_loaded > 0) {
                this.data.conversionRates.scrollRate = 
                    ((metrics.sales_page_scrolled / metrics.sales_page_loaded) * 100).toFixed(2);
            }
            
            // Checkout click rate
            if (metrics.sales_page_scrolled > 0) {
                this.data.conversionRates.checkoutClickRate = 
                    ((metrics.checkout_clicked / metrics.sales_page_scrolled) * 100).toFixed(2);
            }
            
            // Overall conversion rate
            if (metrics.quiz_loaded > 0) {
                this.data.conversionRates.overallConversionRate = 
                    ((metrics.checkout_clicked / metrics.quiz_loaded) * 100).toFixed(2);
            }
        }
        
        // Send to external analytics (optional)
        sendToExternalAnalytics(event) {
            // Google Analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', event.event, {
                    event_category: 'Funnel',
                    event_label: this.currentPage,
                    value: event.data
                });
            }
            
            // Facebook Pixel
            if (typeof fbq !== 'undefined') {
                fbq('trackCustom', event.event, event.data);
            }
        }
        
        // Public API
        getAnalytics() {
            return this.data;
        }
        
        // Reset analytics (for admin use)
        resetAnalytics() {
            if (confirm('Tem certeza que deseja resetar todas as métricas?')) {
                localStorage.removeItem(ANALYTICS_KEY);
                this.data = this.getDefaultData();
                this.saveData();
                return true;
            }
            return false;
        }
    }
    
    // Initialize analytics on page load
    window.FunnelAnalytics = new FunnelAnalytics();
    
})();
