/**
 * GEENIX — script.js  v4.0
 * ─────────────────────────────────────────────────────────────────
 * Handles:
 *  • Preloader reveal & progress ticker
 *  • Top scroll progress indicator bar
 *  • Header floating glassmorphism & scroll-spy
 *  • Mobile nav (open / close / focus trap / ESC / body scroll lock)
 *  • Smooth scroll with header offset
 *  • Interactive cursor spotlight & 3D hero terminal tilt
 *  • Animated hero stat counters
 *  • IntersectionObserver scroll reveals (homepage & inner pages)
 *  • Exclusive FAQ accordion expansion
 *  • Unified contact forms (#cform & #contact-form): validation + async Web3Forms submit
 *  • Cookie consent banner (localStorage persistence)
 *  • Back-to-top button & dynamic footer year
 *  • Deferred AI chatbot loading
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════════════════════════════ */

const rafThrottle = (fn) => {
  let ticking = false;
  return (...args) => {
    if (!ticking) {
      requestAnimationFrame(() => { fn(...args); ticking = false; });
      ticking = true;
    }
  };
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ══════════════════════════════════════════════════════════════════
   DOM READY
   ══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHoverPointer = window.matchMedia('(hover: hover)').matches;

  /* ══════════════════════════════════════════════════════════════
     PRELOADER CONTROLLER
     ══════════════════════════════════════════════════════════════ */
  const preloader = $('#geenix-preloader');
  let onPreloaderDone = null;
  const HDR_OFFSET = 80;
  const initialHashTarget = window.location.hash ? $(window.location.hash) : null;

  if (preloader) {
    document.body.classList.add('preloader-active');

    const progressBar = $('#preloader-bar');
    const counterEl   = $('#preloader-counter');
    const statusEl    = $('#preloader-status');

    const statuses = [
      { progress: 20, label: 'INITIALIZING ENGINE...' },
      { progress: 50, label: 'LOADING ASSETS...' },
      { progress: 80, label: 'OPTIMIZING EXPERIENCE...' },
      { progress: 100, label: 'SYSTEM READY' }
    ];

    let currentProgress = 0;
    const targetProgress = 100;

    const updateProgress = (val) => {
      currentProgress = Math.min(100, Math.max(currentProgress, Math.round(val)));
      if (progressBar) progressBar.style.width = `${currentProgress}%`;
      if (counterEl) counterEl.textContent = `${currentProgress}%`;

      const matchStatus = [...statuses].reverse().find(s => currentProgress >= s.progress);
      if (matchStatus && statusEl && statusEl.textContent !== matchStatus.label) {
        statusEl.textContent = matchStatus.label;
      }
    };

    let finished = false;
    let tickTimer = null;
    const finishPreloader = () => {
      if (finished) return;
      finished = true;
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
      if (statusEl) statusEl.textContent = 'SYSTEM READY';
      updateProgress(100);

      const applyHide = () => {
        preloader.classList.add('preloader-hide');
        document.body.classList.remove('preloader-active');
        document.body.classList.add('loaded');
        onPreloaderDone?.();

        if (initialHashTarget) {
          preloader.classList.add('preloader-done');
          const top = initialHashTarget.getBoundingClientRect().top + window.scrollY - HDR_OFFSET;
          window.scrollTo({ top, behavior: 'instant' });
        } else {
          setTimeout(() => {
            preloader.classList.add('preloader-done');
          }, 850);
        }
      };

      if (prefersReducedMotion || initialHashTarget) {
        applyHide();
      } else {
        setTimeout(applyHide, 80);
      }
    };

    if (prefersReducedMotion || initialHashTarget) {
      finishPreloader();
    } else {
      tickTimer = setInterval(() => {
        const step = Math.max(8, Math.ceil((targetProgress - currentProgress) * 0.35));
        updateProgress(currentProgress + step);
        if (currentProgress >= targetProgress) {
          finishPreloader();
        }
      }, 24);
    }
  }

  /* ── DOM Refs ─────────────────────────────────────────────────── */
  const hdr       = $('#hdr');
  const navToggle = $('#nav-toggle');
  const navList   = $('#nav-list');
  const btt       = $('#btt');
  const fyear     = $('#fyear');
  const navLinks  = $$('.nl[href^="#"]');
  const sections  = $$('section[id]');

  /* ── Footer year ─────────────────────────────────────────────── */
  if (fyear) fyear.textContent = new Date().getFullYear();

  /* ── Top Scroll Progress Bar ─────────────────────────────────── */
  let scrollProgress = $('#scroll-progress');
  if (!scrollProgress) {
    scrollProgress = document.createElement('div');
    scrollProgress.id = 'scroll-progress';
    scrollProgress.setAttribute('aria-hidden', 'true');
    document.body.prepend(scrollProgress);
  }

  /* ══════════════════════════════════════════════════════════════
     HEADER SCROLL, PROGRESS BAR & SCROLL-SPY
     ══════════════════════════════════════════════════════════════ */
  const HDR_HEIGHT   = 68;
  const SCROLL_GLASS = 40;
  const SCROLL_BTT   = 320;

  const handleScroll = rafThrottle(() => {
    const y = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, y / maxScroll)) : 0;

    scrollProgress.style.transform = `scaleX(${progress})`;
    hdr?.classList.toggle('scrolled', y > SCROLL_GLASS);
    btt?.classList.toggle('show', y > SCROLL_BTT);

    if (navLinks.length && sections.length) {
      let currentId = '';
      sections.forEach(section => {
        if (y >= section.offsetTop - HDR_HEIGHT - 24) {
          currentId = section.id;
        }
      });

      navLinks.forEach(link => {
        const isActive = link.getAttribute('href') === `#${currentId}`;
        link.classList.toggle('active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }
  });

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
  handleScroll();

  /* ══════════════════════════════════════════════════════════════
     MOBILE NAVIGATION
     ══════════════════════════════════════════════════════════════ */
  if (navToggle && navList) {
    const getFocusableNavItems = () =>
      $$('a, button', navList).filter(el => !el.hasAttribute('disabled') && !el.closest('[hidden]'));

    let savedScrollY = 0;

    const openNav = () => {
      savedScrollY = window.scrollY;
      document.body.classList.add('nav-open');
      document.body.style.top = `-${savedScrollY}px`;

      navList.classList.add('open');
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', 'Close navigation menu');
      const items = getFocusableNavItems();
      if (items.length) items[0].focus();
      document.addEventListener('click', handleOutsideClick, true);
      document.addEventListener('keydown', handleNavKeyDown);
    };

    const closeNav = () => {
      navList.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open navigation menu');

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

    const mediaQuery = window.matchMedia('(min-width: 861px)');
    mediaQuery.addEventListener('change', (e) => {
      if (e.matches && navList.classList.contains('open')) closeNav();
    });

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
        : target.getBoundingClientRect().top + window.scrollY - HDR_OFFSET;

      window.scrollTo({ top, behavior: 'smooth' });

      if (history.pushState && href !== '#') {
        history.pushState(null, '', href);
      }

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
      const main = $('#main') || $('h1');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
        main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     INTERACTIVE CURSOR SPOTLIGHT & 3D HERO TERMINAL TILT
     ══════════════════════════════════════════════════════════════ */
  if (!prefersReducedMotion && hasHoverPointer) {
    const spotlightTargets = $$(
      '.svc-card, .port-card, .feature-card, .ap-item, .process-step, .related-link, .cinfo-list li'
    );
    spotlightTargets.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      }, { passive: true });
    });

    const heroTerm = $('.hero-terminal');
    if (heroTerm) {
      heroTerm.addEventListener('mousemove', (e) => {
        const rect = heroTerm.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        heroTerm.style.setProperty('--rx', `${(-ny * 4.5).toFixed(2)}deg`);
        heroTerm.style.setProperty('--ry', `${(nx * 4.5).toFixed(2)}deg`);
      }, { passive: true });

      heroTerm.addEventListener('mouseleave', () => {
        heroTerm.style.setProperty('--rx', '0deg');
        heroTerm.style.setProperty('--ry', '0deg');
      }, { passive: true });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     HERO STAT COUNTERS
     ══════════════════════════════════════════════════════════════ */
  const statsWrap = $('.hero-stats');
  if (statsWrap && !prefersReducedMotion) {
    let statsAnimated = false;
    const animateStats = () => {
      if (statsAnimated) return;
      statsAnimated = true;

      $$('.hs-n', statsWrap).forEach(statEl => {
        const textNode = statEl.firstChild;
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
        const target = parseInt(textNode.nodeValue.trim(), 10);
        if (Number.isNaN(target) || target <= 0) return;

        const duration = 1000;
        let start = null;
        const step = (now) => {
          if (start === null) start = now;
          const t = Math.min(1, Math.max(0, (now - start) / duration));
          const eased = 1 - Math.pow(1 - t, 3);
          textNode.nodeValue = String(Math.round(target * eased));
          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            textNode.nodeValue = String(target);
          }
        };
        requestAnimationFrame(step);
      });
    };

    const startStatsObserver = () => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateStats();
            obs.disconnect();
          }
        });
      }, { threshold: 0.25 });
      obs.observe(statsWrap);
    };

    if (preloader) {
      onPreloaderDone = startStatsObserver;
    } else {
      startStatsObserver();
    }
  }

  /* ══════════════════════════════════════════════════════════════
     SCROLL REVEAL — Homepage & Inner Pages
     ══════════════════════════════════════════════════════════════ */
  const autoRevealTargets = $$(
    '.feature-card, .process-step, .related-link, .svc-cta-banner'
  ).filter(el => !el.classList.contains('js-reveal'));
  autoRevealTargets.forEach(el => el.classList.add('js-reveal'));

  const revealEls = $$('.js-reveal');
  if (!prefersReducedMotion && revealEls.length) {
    const revealVisibleInViewport = () => {
      const vh = window.innerHeight || 900;
      revealEls.forEach(el => {
        if (el.classList.contains('revealed')) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < vh * 1.05 && rect.bottom > 0) {
          el.classList.add('revealed');
        }
      });
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -20px 0px',
    });

    revealEls.forEach((el, index) => {
      el.style.transitionDelay = `${(index % 4) * 0.08}s`;
      revealObserver.observe(el);
    });

    if (initialHashTarget) {
      revealEls.forEach(el => {
        el.style.transitionDelay = '0s';
        el.classList.add('revealed');
      });
    } else {
      revealVisibleInViewport();
      window.addEventListener('scroll', rafThrottle(revealVisibleInViewport), { passive: true });
    }
  } else {
    revealEls.forEach(el => el.classList.add('revealed'));
  }

  /* ══════════════════════════════════════════════════════════════
     FAQ ACCORDION — Exclusive expansion
     ══════════════════════════════════════════════════════════════ */
  const faqItems = $$('.faq-item');
  if (faqItems.length) {
    faqItems.forEach(item => {
      item.addEventListener('toggle', () => {
        if (item.open) {
          faqItems.forEach(other => {
            if (other !== item && other.open) {
              other.open = false;
            }
          });
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     CONTACT FORMS (#cform & #contact-form) — Validation + Submit
     ══════════════════════════════════════════════════════════════ */
  const sanitise = (str) => str.replace(/<[^>]*>/g, '').trim();

  const initContactForm = ({ form, fieldMap, submitBtn, defaultLabel, successEl, errorEl, statusWrap }) => {
    if (!form || !submitBtn) return;

    let lastSubmitTime = 0;
    const SUBMIT_COOLDOWN_MS = 5000;

    const fields = Object.keys(fieldMap)
      .map(id => $(`#${id}`, form))
      .filter(Boolean);

    const validateField = (field) => {
      const cfg = fieldMap[field.id];
      if (!cfg) return { valid: true, message: '' };
      const value = field.value.trim();

      if (cfg.required && !value) return { valid: false, message: cfg.messages.required };
      if (cfg.minLength && value.length < cfg.minLength) return { valid: false, message: cfg.messages.minLength };
      if (cfg.maxLength && value.length > cfg.maxLength) return { valid: false, message: `Maximum ${cfg.maxLength} characters allowed.` };
      if (cfg.pattern && !cfg.pattern.test(value)) return { valid: false, message: cfg.messages.pattern };
      return { valid: true, message: '' };
    };

    const setFieldError = (field, message) => {
      const cfg = fieldMap[field.id];
      const errEl = cfg?.errId ? $(`#${cfg.errId}`) : null;
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

    fields.forEach(field => {
      field.addEventListener('blur', () => {
        const { valid, message } = validateField(field);
        setFieldError(field, valid ? '' : message);
      });
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') {
          const { valid, message } = validateField(field);
          setFieldError(field, valid ? '' : message);
        }
      });
    });

    const validateAll = () => {
      let allValid = true;
      let firstInvalid = null;
      fields.forEach(field => {
        const { valid, message } = validateField(field);
        setFieldError(field, valid ? '' : message);
        if (!valid && !firstInvalid) firstInvalid = field;
        if (!valid) allValid = false;
      });
      if (firstInvalid) firstInvalid.focus();
      return allValid;
    };

    const setSubmitting = (isSubmitting) => {
      const lbl = submitBtn.querySelector('.blbl, span');
      const icon = submitBtn.querySelector('i');
      submitBtn.disabled = isSubmitting;
      submitBtn.setAttribute('aria-busy', String(isSubmitting));

      if (lbl) lbl.textContent = isSubmitting ? 'Sending…' : defaultLabel;
      if (icon) icon.className = isSubmitting ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane';
    };

    const clearStatus = () => {
      if (successEl) successEl.hidden = true;
      if (errorEl) errorEl.hidden = true;
      if (statusWrap) statusWrap.innerHTML = '';
    };

    const showStatus = (type) => {
      if (successEl && errorEl) {
        successEl.hidden = type !== 'success';
        errorEl.hidden = type !== 'error';
        const el = type === 'success' ? successEl : errorEl;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (statusWrap) {
        statusWrap.innerHTML = type === 'success'
          ? `<div class="fstat fsucc" role="alert"><i class="fas fa-circle-check" aria-hidden="true"></i><div><strong>Message sent!</strong><span>We'll respond within 24 hours.</span></div></div>`
          : `<div class="fstat ferr" role="alert"><i class="fas fa-circle-exclamation" aria-hidden="true"></i><div><strong>Failed to send.</strong><span>Please email us directly at <a href="mailto:hello@geenix.live">hello@geenix.live</a></span></div></div>`;
        statusWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearStatus();

      if (!validateAll()) return;

      const now = Date.now();
      if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) return;
      lastSubmitTime = now;

      setSubmitting(true);

      try {
        const formData = new FormData(form);
        for (const [key, value] of formData.entries()) {
          if (typeof value === 'string') {
            formData.set(key, sanitise(value));
          }
        }

        const res = await fetch(form.action, {
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
        form.reset();
        $$('input, textarea', form).forEach(f => f.removeAttribute('aria-invalid'));
      } catch (err) {
        console.error('[GEENIX] Form submission error:', err.message || err);
        showStatus('error');
      } finally {
        setSubmitting(false);
      }
    });
  };

  /* Homepage Contact Form */
  const cform = $('#cform');
  if (cform) {
    initContactForm({
      form: cform,
      submitBtn: $('#sub-btn'),
      defaultLabel: 'Send Message',
      successEl: $('#fsucc'),
      errorEl: $('#ferr'),
      fieldMap: {
        fn: { errId: 'fn-err', required: true, minLength: 2, maxLength: 80,
              messages: { required: 'Name is required.', minLength: 'Name must be at least 2 characters.' } },
        fe: { errId: 'fe-err', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              messages: { required: 'Email address is required.', pattern: 'Please enter a valid email address.' } },
        fm: { errId: 'fm-err', required: true, minLength: 10, maxLength: 2000,
              messages: { required: 'A message is required.', minLength: 'Message must be at least 10 characters.' } },
      }
    });
  }

  /* Dedicated /contact/ Page Form */
  const contactPageForm = $('#contact-form');
  if (contactPageForm) {
    initContactForm({
      form: contactPageForm,
      submitBtn: $('button[type="submit"]', contactPageForm),
      defaultLabel: 'Send Inquiry',
      statusWrap: $('#contact-form-status'),
      fieldMap: {
        'contact-name': { errId: 'contact-err-name', required: true, minLength: 2, maxLength: 80,
                          messages: { required: 'Name is required.', minLength: 'Name must be at least 2 characters.' } },
        'contact-email': { errId: 'contact-err-email', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                           messages: { required: 'Email address is required.', pattern: 'Please enter a valid email address.' } },
        'contact-message': { errId: 'contact-err-message', required: true, minLength: 10, maxLength: 2000,
                             messages: { required: 'Project details are required.', minLength: 'Please enter at least 10 characters.' } },
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     COOKIE CONSENT BANNER
     ══════════════════════════════════════════════════════════════ */
  {
    const COOKIE_KEY = 'geenix_cookie_consent';
    const banner = $('#cookie-banner');
    const acceptBtn = $('#cookie-accept');
    const declineBtn = $('#cookie-decline');

    const dismissBanner = (choice) => {
      if (!banner) return;
      try { localStorage.setItem(COOKIE_KEY, choice); } catch {}
      banner.classList.add('cookie-dismiss');
      banner.addEventListener('animationend', () => {
        banner.hidden = true;
        banner.classList.remove('cookie-dismiss');
      }, { once: true });
    };

    if (banner) {
      let consent = null;
      try { consent = localStorage.getItem(COOKIE_KEY); } catch {}

      if (!consent) {
        setTimeout(() => {
          banner.hidden = false;
        }, 1500);
      }

      if (acceptBtn)  acceptBtn.addEventListener('click',  () => dismissBanner('accepted'));
      if (declineBtn) declineBtn.addEventListener('click', () => dismissBanner('declined'));
    }
  }

  /* ══════════════════════════════════════════════════════════════
     DEFERRED CHATBOT
     ══════════════════════════════════════════════════════════════ */
  {
    const loadChatbot = () => {
      if (document.querySelector('script[src$="chatbot.js"]')) return;

      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/css/chatbot.css';
      document.head.appendChild(stylesheet);

      const script = document.createElement('script');
      script.src = '/js/chatbot.js';
      script.defer = true;
      document.body.appendChild(script);
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadChatbot, { timeout: 2500 });
    } else {
      setTimeout(loadChatbot, 1500);
    }
  }

}); /* end DOMContentLoaded */
