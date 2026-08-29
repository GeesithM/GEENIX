/**
 * GEENIX — script.js  v3.1
 * ─────────────────────────────────────────────────────────────────
 * Handles:
 *  • Header scroll effect & glassmorphism
 *  • Mobile nav (open / close / focus trap / ESC / body scroll lock)
 *  • Smooth scroll with header offset
 *  • Scroll-spy for active nav link
 *  • IntersectionObserver scroll reveals
 *  • Contact form: client-side validation + async submit + rate limiting
 *  • Input sanitization for XSS prevention
 *  • Cookie consent banner (localStorage persistence)
 *  • Back-to-top button
 *  • Dynamic footer year
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════════════════════════════ */

/**
 * Throttle using requestAnimationFrame — zero jank, zero overhead.
 * @param {Function} fn
 * @returns {Function}
 */
const rafThrottle = (fn) => {
  let ticking = false;
  return (...args) => {
    if (!ticking) {
      requestAnimationFrame(() => { fn(...args); ticking = false; });
      ticking = true;
    }
  };
};

/**
 * Safe querySelector — returns null instead of throwing.
 * @param {string} sel
 * @param {Document|Element} [ctx=document]
 * @returns {Element|null}
 */
const $ = (sel, ctx = document) => ctx.querySelector(sel);

/**
 * Safe querySelectorAll — returns an array.
 * @param {string} sel
 * @param {Document|Element} [ctx=document]
 * @returns {Element[]}
 */
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ══════════════════════════════════════════════════════════════════
   DOM READY
   ══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════════════════════
     PRELOADER CONTROLLER
     ══════════════════════════════════════════════════════════════ */
  const preloader = $('#geenix-preloader');
  if (preloader) {
    document.body.classList.add('preloader-active');

    const progressBar = $('#preloader-bar');
    const counterEl   = $('#preloader-counter');
    const statusEl    = $('#preloader-status');
    const taglineEl   = $('#preloader-tagline');

    const statuses = [
      { progress: 20, label: 'INITIALIZING ENGINE...' },
      { progress: 50, label: 'LOADING ASSETS...' },
      { progress: 80, label: 'OPTIMIZING EXPERIENCE...' },
      { progress: 100, label: 'SYSTEM READY' }
    ];

    let currentProgress = 0;
    let targetProgress  = 15;
    let isFullyLoaded   = false;

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const updateProgress = (val) => {
      currentProgress = Math.min(100, Math.max(currentProgress, Math.round(val)));
      if (progressBar) progressBar.style.width = `${currentProgress}%`;
      if (counterEl) counterEl.textContent = `${currentProgress}%`;

      // Update status label based on progress
      const matchStatus = [...statuses].reverse().find(s => currentProgress >= s.progress);
      if (matchStatus && statusEl && statusEl.textContent !== matchStatus.label) {
        statusEl.textContent = matchStatus.label;
      }
    };

    // Smooth animation frame ticker for progress counter
    const tickProgress = () => {
      if (currentProgress < targetProgress) {
        const step = Math.max(1, Math.ceil((targetProgress - currentProgress) * 0.12));
        updateProgress(currentProgress + step);
      }

      if (currentProgress < 100) {
        requestAnimationFrame(tickProgress);
      } else {
        finishPreloader();
      }
    };

    let finished = false;
    const finishPreloader = () => {
      if (finished) return;
      finished = true;
      if (statusEl) statusEl.textContent = 'SYSTEM READY';
      updateProgress(100);

      setTimeout(() => {
        preloader.classList.add('preloader-hide');
        document.body.classList.remove('preloader-active');
        document.body.classList.add('loaded');

        setTimeout(() => {
          preloader.classList.add('preloader-done');
        }, 850);
      }, prefersReducedMotion ? 50 : 350);
    };

    // Trigger target progress increments based on load state
    if (prefersReducedMotion) {
      targetProgress = 100;
    } else {
      targetProgress = 40;
      setTimeout(() => { if (!isFullyLoaded) targetProgress = Math.max(targetProgress, 70); }, 500);
      setTimeout(() => { if (!isFullyLoaded) targetProgress = Math.max(targetProgress, 90); }, 1200);
    }

    const handleWindowLoad = () => {
      isFullyLoaded = true;
      targetProgress = 100;
    };

    if (document.readyState === 'complete') {
      handleWindowLoad();
    } else {
      window.addEventListener('load', handleWindowLoad);
    }

    // Safety fallback: dismiss preloader after 2.5s maximum to never lock up UX
    setTimeout(() => {
      if (!isFullyLoaded) {
        targetProgress = 100;
      }
    }, 2500);

    requestAnimationFrame(tickProgress);
  }

  /* ── DOM Refs ─────────────────────────────────────────────────── */
  const hdr       = $('#hdr');
  const navToggle = $('#nav-toggle');
  const navList   = $('#nav-list');
  const btt       = $('#btt');
  const cform     = $('#cform');
  const fsucc     = $('#fsucc');
  const ferr      = $('#ferr');
  const subBtn    = $('#sub-btn');
  const fyear     = $('#fyear');
  const navLinks  = $$('.nl[href^="#"]');
  const sections  = $$('section[id]');

  /* ── Footer year ─────────────────────────────────────────────── */
  if (fyear) fyear.textContent = new Date().getFullYear();

  /* ══════════════════════════════════════════════════════════════
     HEADER SCROLL & SCROLL-SPY
     ══════════════════════════════════════════════════════════════ */
  const HDR_HEIGHT    = 68;  // matches CSS .nav-wrap height
  const SCROLL_GLASS  = 40;  // px before header gets glass bg
  const SCROLL_BTT    = 320; // px before back-to-top appears

  const handleScroll = rafThrottle(() => {
    const y = window.scrollY;

    /* Header glassmorphism */
    hdr?.classList.toggle('scrolled', y > SCROLL_GLASS);

    /* Back-to-top visibility */
    btt?.classList.toggle('show', y > SCROLL_BTT);

    /* Scroll-spy — find the section closest to top */
    let currentId = '';
    sections.forEach(section => {
      if (y >= section.offsetTop - HDR_HEIGHT - 20) {
        currentId = section.id;
      }
    });

    navLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${currentId}`;
      link.classList.toggle('active', isActive);
      /* Keep aria-current in sync for accessibility */
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  });

  window.addEventListener('scroll', handleScroll, { passive: true });
  /* Run once on load to set initial state */
  handleScroll();

  /* ══════════════════════════════════════════════════════════════
     MOBILE NAVIGATION
     ══════════════════════════════════════════════════════════════ */
  if (navToggle && navList) {
    /** Get all focusable elements inside the nav */
    const getFocusableNavItems = () =>
      $$('a, button', navList).filter(el => !el.hasAttribute('disabled') && !el.closest('[hidden]'));

    /** Track scroll position for body lock */
    let savedScrollY = 0;

    const openNav = () => {
      /* Save scroll position and lock body */
      savedScrollY = window.scrollY;
      document.body.classList.add('nav-open');
      document.body.style.top = `-${savedScrollY}px`;

      navList.classList.add('open');
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', 'Close navigation menu');
      /* Focus first item for keyboard users */
      const items = getFocusableNavItems();
      if (items.length) items[0].focus();
      document.addEventListener('click', handleOutsideClick, true);
      document.addEventListener('keydown', handleNavKeyDown);
    };

    const closeNav = () => {
      navList.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open navigation menu');

      /* Unlock body and restore scroll position */
      document.body.classList.remove('nav-open');
      document.body.style.top = '';
      window.scrollTo(0, savedScrollY);

      document.removeEventListener('click', handleOutsideClick, true);
      document.removeEventListener('keydown', handleNavKeyDown);
    };

    const handleOutsideClick = (e) => {
      if (!navList.contains(e.target) && !navToggle.contains(e.target)) {
        closeNav();
      }
    };

    /** Keyboard navigation: ESC closes, Tab traps focus */
    const handleNavKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeNav();
        navToggle.focus();
        return;
      }
      if (e.key === 'Tab') {
        const items = getFocusableNavItems();
        if (!items.length) return;
        const first = items[0];
        const last  = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    navToggle.addEventListener('click', () => {
      navList.classList.contains('open') ? closeNav() : openNav();
    });

    /* Close mobile nav on resize to desktop */
    const mediaQuery = window.matchMedia('(min-width: 861px)');
    mediaQuery.addEventListener('change', (e) => {
      if (e.matches && navList.classList.contains('open')) closeNav();
    });

    /* Expose closeNav for smooth-scroll handler below */
    window.__geenixCloseNav = closeNav;
  }

  /* ══════════════════════════════════════════════════════════════
     SMOOTH SCROLL
     ══════════════════════════════════════════════════════════════ */
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      const target = href === '#' ? document.documentElement : $(href);
      if (!target) return;

      e.preventDefault();
      window.__geenixCloseNav?.();

      const top = href === '#'
        ? 0
        : target.getBoundingClientRect().top + window.scrollY - HDR_HEIGHT;

      window.scrollTo({ top, behavior: 'smooth' });

      /* Update URL without triggering native scroll */
      if (history.pushState && href !== '#') {
        history.pushState(null, '', href);
      }

      /* Move focus to target for keyboard/screen-reader users */
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    });
  });

  /* ══════════════════════════════════════════════════════════════
     BACK TO TOP
     ══════════════════════════════════════════════════════════════ */
  if (btt) {
    btt.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      /* Return focus to top of page */
      const main = $('#main') || $('h1');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
        main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     SCROLL REVEAL — IntersectionObserver
     ══════════════════════════════════════════════════════════════ */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target); /* fire once */
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px',
    });

    $$('.js-reveal').forEach((el, index) => {
      /* Stagger delay per group of 4 */
      el.style.transitionDelay = `${(index % 4) * 0.09}s`;
      revealObserver.observe(el);
    });
  } else {
    /* Immediately reveal all elements for reduced-motion users */
    $$('.js-reveal').forEach(el => el.classList.add('revealed'));
  }

  /* ══════════════════════════════════════════════════════════════
     CONTACT FORM — validation + async submit
     ══════════════════════════════════════════════════════════════ */
  if (cform) {

    /* ── Validation helpers ─────────────────────────────────── */
    const rules = {
      fn: { required: true, minLength: 2, maxLength: 80,
            messages: { required: 'Name is required.', minLength: 'Name must be at least 2 characters.' } },
      fe: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            messages: { required: 'Email address is required.', pattern: 'Please enter a valid email address.' } },
      fm: { required: true, minLength: 10, maxLength: 2000,
            messages: { required: 'A message is required.', minLength: 'Message must be at least 10 characters.' } },
    };

    /** Rate limiting — prevents rapid re-submission */
    let lastSubmitTime = 0;
    const SUBMIT_COOLDOWN_MS = 5000;

    /**
     * Sanitise a string — strip HTML tags to prevent stored XSS.
     * @param {string} str
     * @returns {string}
     */
    const sanitise = (str) => str.replace(/<[^>]*>/g, '').trim();

    /**
     * Validate a single field.
     * @param {HTMLInputElement|HTMLTextAreaElement} field
     * @returns {{ valid: boolean, message: string }}
     */
    const validateField = (field) => {
      const id    = field.id;
      const rule  = rules[id];
      const value = field.value.trim();

      if (!rule) return { valid: true, message: '' };

      if (rule.required && !value)
        return { valid: false, message: rule.messages.required };
      if (rule.minLength && value.length < rule.minLength)
        return { valid: false, message: rule.messages.minLength };
      if (rule.maxLength && value.length > rule.maxLength)
        return { valid: false, message: `Maximum ${rule.maxLength} characters allowed.` };
      if (rule.pattern && !rule.pattern.test(value))
        return { valid: false, message: rule.messages.pattern };

      return { valid: true, message: '' };
    };

    /**
     * Show or clear an inline error for a field.
     * @param {HTMLInputElement|HTMLTextAreaElement} field
     * @param {string} message  — empty string clears the error
     */
    const setFieldError = (field, message) => {
      const errEl = $(`#${field.id}-err`);
      if (!errEl) return;

      if (message) {
        errEl.textContent = message;
        errEl.hidden = false;
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', errEl.id);
      } else {
        errEl.textContent = '';
        errEl.hidden = true;
        field.removeAttribute('aria-invalid');
      }
    };

    /* Validate on blur for immediate feedback */
    $$('#fn, #fe, #fm', cform).forEach(field => {
      field.addEventListener('blur', () => {
        const { valid, message } = validateField(field);
        setFieldError(field, valid ? '' : message);
      });
      /* Clear error on input once user starts correcting */
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') {
          const { valid, message } = validateField(field);
          setFieldError(field, valid ? '' : message);
        }
      });
    });

    /**
     * Validate all fields and return overall validity.
     * @returns {boolean}
     */
    const validateAll = () => {
      let allValid = true;
      let firstInvalid = null;

      $$('#fn, #fe, #fm', cform).forEach(field => {
        const { valid, message } = validateField(field);
        setFieldError(field, valid ? '' : message);
        if (!valid && !firstInvalid) firstInvalid = field;
        if (!valid) allValid = false;
      });

      if (firstInvalid) firstInvalid.focus();
      return allValid;
    };

    /* ── Submission state helpers ───────────────────────────── */
    const setSubmitting = (isSubmitting) => {
      const lbl  = subBtn.querySelector('.blbl');
      const icon = subBtn.querySelector('i');

      subBtn.disabled = isSubmitting;
      subBtn.setAttribute('aria-busy', String(isSubmitting));

      if (isSubmitting) {
        lbl.textContent = 'Sending…';
        icon.className  = 'fas fa-spinner fa-spin';
      } else {
        lbl.textContent = 'Send Message';
        icon.className  = 'fas fa-paper-plane';
      }
    };

    const showStatus = (type) => {
      fsucc.hidden = type !== 'success';
      ferr.hidden  = type !== 'error';
      const el = type === 'success' ? fsucc : ferr;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    /* ── Submit handler ─────────────────────────────────────── */
    cform.addEventListener('submit', async (e) => {
      e.preventDefault();

      /* Hide previous messages */
      fsucc.hidden = true;
      ferr.hidden  = true;

      /* Client-side validation */
      if (!validateAll()) return;

      /* Rate limiting — prevent rapid submissions */
      const now = Date.now();
      if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
        return; /* silently ignore rapid resubmission */
      }
      lastSubmitTime = now;

      setSubmitting(true);

      try {
        /* Sanitise form values before submission */
        const formData = new FormData(cform);
        for (const [key, value] of formData.entries()) {
          if (typeof value === 'string') {
            formData.set(key, sanitise(value));
          }
        }

        const res = await fetch(cform.action, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          let errMsg = `Server error (${res.status})`;
          try { const data = await res.json(); errMsg = data?.message || errMsg; } catch {}
          throw new Error(errMsg);
        }

        showStatus('success');
        cform.reset();
        /* Clear any residual validation states */
        $$('input, textarea', cform).forEach(f => {
          f.removeAttribute('aria-invalid');
        });

      } catch (err) {
        console.error('[GEENIX] Form submission error:', err.message || err);
        showStatus('error');
      } finally {
        setSubmitting(false);
      }
    });
  }


  /* ══════════════════════════════════════════════════════════════════
     COOKIE CONSENT BANNER
     ══════════════════════════════════════════════════════════════════ */
  {
    const COOKIE_KEY = 'geenix_cookie_consent';
    const banner = $('#cookie-banner');
    const acceptBtn = $('#cookie-accept');
    const declineBtn = $('#cookie-decline');

    /**
     * Dismiss the cookie banner with a slide-down animation.
     * @param {'accepted'|'declined'} choice
     */
    const dismissBanner = (choice) => {
      if (!banner) return;
      try { localStorage.setItem(COOKIE_KEY, choice); } catch {}
      banner.classList.add('cookie-dismiss');
      banner.addEventListener('animationend', () => {
        banner.hidden = true;
        banner.classList.remove('cookie-dismiss');
      }, { once: true });
    };

    /* Only show if user hasn't already made a choice */
    if (banner) {
      let consent = null;
      try { consent = localStorage.getItem(COOKIE_KEY); } catch {}

      if (!consent) {
        /* Delay banner appearance so it doesn't compete with page load */
        setTimeout(() => {
          banner.hidden = false;
        }, 1500);
      }

      if (acceptBtn)  acceptBtn.addEventListener('click',  () => dismissBanner('accepted'));
      if (declineBtn) declineBtn.addEventListener('click', () => dismissBanner('declined'));
    }
  }

}); /* end DOMContentLoaded */
