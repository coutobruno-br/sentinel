// landing/js/app.js
/**
 * Sentinel Landing Page - Main Application Script
 *
 * Handles:
 * - Mobile menu toggle
 * - Smooth scrolling
 * - Paddle checkout integration
 * - Environment detection (dev/prod)
 */

(function() {
  'use strict';

  // ===========================================
  // Environment Detection
  // ===========================================
  const ENV = {
    isDev: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    apiUrl: null, // Will be set after detection
  };

  // Auto-detect API URL based on environment
  if (ENV.isDev) {
    ENV.apiUrl = 'http://localhost:3000';
  } else {
    // Production: use same origin or configured URL
    ENV.apiUrl = window.SENTINEL_API_URL || window.location.origin.replace('://', '://api.');
  }

  // Expose for debugging
  window.SENTINEL_ENV = ENV;
  console.log('[Sentinel] Environment:', ENV.isDev ? 'development' : 'production');
  console.log('[Sentinel] API URL:', ENV.apiUrl);

  // ===========================================
  // Mobile Menu
  // ===========================================
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      mobileMenuBtn.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });

    // Close menu when clicking a link
    mobileMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        mobileMenuBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
      });
    });
  }

  // ===========================================
  // Smooth Scrolling
  // ===========================================
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // ===========================================
  // Paddle Integration
  // ===========================================
  let paddleInitialized = false;
  let paddleConfig = null;

  /**
   * Fetch Paddle configuration from backend
   */
  async function fetchPaddleConfig() {
    try {
      const apiUrl = ENV.apiUrl;
      const response = await fetch(`${apiUrl}/billing/paddle/config`);
      if (response.ok) {
        paddleConfig = await response.json();
        return paddleConfig;
      }
    } catch (error) {
      console.warn('[Paddle] Could not fetch config:', error);
    }
    return null;
  }

  /**
   * Initialize Paddle.js
   */
  async function initPaddle() {
    if (paddleInitialized) return true;

    const config = await fetchPaddleConfig();
    if (!config || !config.configured || !config.clientToken) {
      console.warn('[Paddle] Not configured');
      return false;
    }

    return new Promise(function(resolve) {
      // Check if Paddle script is already loaded
      if (window.Paddle) {
        setupPaddle(config);
        paddleInitialized = true;
        resolve(true);
        return;
      }

      // Load Paddle.js dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.onload = function() {
        setupPaddle(config);
        paddleInitialized = true;
        resolve(true);
      };
      script.onerror = function() {
        console.error('[Paddle] Failed to load script');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Configure Paddle after script loads
   */
  function setupPaddle(config) {
    if (!window.Paddle) return;

    const isSandbox = config.environment !== 'production';

    // Paddle.js v2 uses 'sandbox' boolean instead of 'environment' string
    Paddle.Initialize({
      token: config.clientToken,
      checkout: {
        settings: {
          displayMode: 'overlay',
          locale: 'en'
        }
      },
      eventCallback: function(event) {
        console.log('[Paddle] Event:', event.name);

        if (event.name === 'checkout.completed') {
          // Checkout completed successfully
          showNotification('success', 'Payment successful! Your subscription is now active.');
          setTimeout(function() {
            window.location.href = '/billing/success';
          }, 2000);
        }

        if (event.name === 'checkout.closed') {
          // User closed checkout without completing
          console.log('[Paddle] Checkout closed');
        }
      }
    });

    // Set environment after initialization
    if (isSandbox) {
      Paddle.Environment.set('sandbox');
    }

    console.log('[Paddle] Initialized in', isSandbox ? 'sandbox' : 'production', 'mode');
  }

  /**
   * Open Paddle checkout for a plan
   */
  async function openCheckout(planId) {
    const initialized = await initPaddle();
    if (!initialized) {
      // Fallback: redirect to contact page
      showNotification('info', 'Payment system loading... Please try again.');
      return;
    }

    // Get user email (could prompt or get from GitHub)
    const email = await promptForEmail();
    if (!email) return;

    try {
      // Create checkout session via backend
      const apiUrl = ENV.apiUrl;
      const response = await fetch(`${apiUrl}/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: getAccountId(),
          accountLogin: getAccountLogin(),
          email: email,
          planId: planId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Checkout failed');
      }

      const result = await response.json();

      if (result.checkoutUrl) {
        // Open Paddle checkout overlay
        Paddle.Checkout.open({
          transactionId: result.transactionId
        });
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('[Checkout] Error:', error);
      showNotification('error', error.message || 'Unable to start checkout. Please try again.');
    }
  }

  /**
   * Prompt user for email address
   */
  function promptForEmail() {
    return new Promise(function(resolve) {
      const modal = createEmailModal(function(email) {
        resolve(email);
      });
      document.body.appendChild(modal);
    });
  }

  /**
   * Create email input modal
   */
  function createEmailModal(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Enter your email</h3>
        <p>We'll send your receipt and subscription details to this email.</p>
        <form id="emailForm">
          <input type="email" id="emailInput" placeholder="you@company.com" required>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">Continue to Payment</button>
          </div>
        </form>
      </div>
    `;

    const form = overlay.querySelector('#emailForm');
    const input = overlay.querySelector('#emailInput');
    const cancelBtn = overlay.querySelector('#cancelBtn');

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = input.value.trim();
      if (email) {
        overlay.remove();
        callback(email);
      }
    });

    cancelBtn.addEventListener('click', function() {
      overlay.remove();
      callback(null);
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
        callback(null);
      }
    });

    setTimeout(function() {
      input.focus();
    }, 100);

    return overlay;
  }

  /**
   * Get account ID (from URL params or localStorage)
   */
  function getAccountId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('account_id') || localStorage.getItem('sentinel_account_id') || 'anonymous';
  }

  /**
   * Get account login
   */
  function getAccountLogin() {
    const params = new URLSearchParams(window.location.search);
    return params.get('account_login') || localStorage.getItem('sentinel_account_login') || '';
  }

  /**
   * Show notification toast
   */
  function showNotification(type, message) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(function() {
      notification.classList.add('show');
    }, 10);

    setTimeout(function() {
      notification.classList.remove('show');
      setTimeout(function() {
        notification.remove();
      }, 300);
    }, 5000);
  }

  // ===========================================
  // Pricing Button Handlers
  // ===========================================

  // Attach click handlers to ALL buttons with data-plan attribute
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[Sentinel] Initializing plan buttons...');

    // Find all buttons with data-plan attribute
    const planButtons = document.querySelectorAll('[data-plan]');
    console.log('[Sentinel] Found', planButtons.length, 'plan buttons');

    planButtons.forEach(function(btn) {
      const planId = btn.getAttribute('data-plan');
      console.log('[Sentinel] Attaching handler for plan:', planId);

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('[Sentinel] Plan button clicked:', planId);
        openCheckout(planId);
      });
    });

    // Pre-initialize Paddle on page load (optional, for faster checkout)
    initPaddle();
  });

  // Expose for external use
  window.SentinelCheckout = {
    open: openCheckout,
    init: initPaddle
  };
})();
