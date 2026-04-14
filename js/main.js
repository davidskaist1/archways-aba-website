/* ============================================================
   Archways ABA — Main JavaScript
   ============================================================ */

// ── Scroll progress bar ────────────────────────────────────────
const progressBar = document.getElementById('progress-bar');
if (progressBar) {
  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (scrollTop / scrollHeight * 100) + '%';
  });
}

// ── Mobile nav toggle ──────────────────────────────────────────
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
  });
  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
  // Close on outside click
  document.addEventListener('click', e => {
    if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
    }
  });
}


// ── Mark active nav link ───────────────────────────────────────
(function markActiveLink() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

// ── Intersection Observer – animate on scroll ──────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.animate').forEach(el => observer.observe(el));

// ── FAQ Accordion ──────────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ── Toast notification ─────────────────────────────────────────
function showToast(message, duration = 4000) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Contact / Application forms ────────────────────────────────
document.querySelectorAll('form[data-form]').forEach(form => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      let res;

      if (form.dataset.form === 'contact' || form.dataset.form === 'intake') {
        // Contact page intake form → Netlify function → Supabase CRM
        const data = Object.fromEntries(new FormData(form).entries());
        res = await fetch('/.netlify/functions/intake-to-crm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else if (form.dataset.form === 'consult') {
        // Homepage consultation form → Netlify function → Supabase CRM
        const raw = Object.fromEntries(new FormData(form).entries());
        res = await fetch('/.netlify/functions/intake-to-crm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_name: raw.name,
            phone: raw.phone,
            email: raw.email,
            county: raw.county,
            message: raw.message,
            referral_source: 'website_homepage',
          }),
        });
      } else {
        // All other forms (referral etc.) go straight to Formspree
        res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' },
        });
      }

      if (res.ok) {
        form.reset();
        const successEl = form.querySelector('.form-success');
        if (successEl) {
          successEl.style.display = 'block';
          successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        showToast('✓ Sent! We\'ll be in touch within 24 hours.');

        // Fire GA4 conversion event
        if (typeof gtag === 'function') {
          const formType = form.dataset.form || 'unknown';
          gtag('event', 'form_submission', {
            event_category: 'conversion',
            event_label: formType,
          });
          // Also fire the specific conversion types Google Ads needs
          if (formType === 'consult' || formType === 'contact' || formType === 'intake') {
            gtag('event', 'generate_lead', { event_category: 'conversion' });
          }
        }
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (err) {
      showToast('Something went wrong. Please call us at (314) 668-2866.');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
});

// ── County search filter (locations page) ──────────────────────
const countySearch = document.getElementById('county-search');
if (countySearch) {
  countySearch.addEventListener('input', () => {
    const q = countySearch.value.toLowerCase();
    document.querySelectorAll('.county-item').forEach(item => {
      const name = item.textContent.toLowerCase();
      item.style.display = name.includes(q) ? '' : 'none';
    });
  });
}

// ── Smooth scroll for anchor links ────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80; // nav height
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ── Nav dropdown (Services menu) ──────────────────────────────
(function () {
  const dropdowns = document.querySelectorAll('.nav-dropdown');

  function closeAll() {
    dropdowns.forEach(function (d) {
      d.classList.remove('is-open');
      const t = d.querySelector('.nav-dropdown__toggle');
      const m = d.querySelector('.nav-dropdown__menu');
      if (t) t.setAttribute('aria-expanded', 'false');
      if (m) {
        m.style.cssText = '';   // clear any lingering inline styles
      }
    });
  }

  dropdowns.forEach(function (dd) {
    const toggle = dd.querySelector('.nav-dropdown__toggle');
    const menu   = dd.querySelector('.nav-dropdown__menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const isMobile = window.innerWidth <= 768;
      const wasOpen  = dd.classList.contains('is-open');
      closeAll();
      if (!wasOpen) {
        dd.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        if (isMobile) {
          // On mobile: show inline, no absolute positioning
          menu.style.cssText = 'display:block !important; position:static !important; transform:none !important; left:auto !important; opacity:1 !important; visibility:visible !important; pointer-events:auto !important;';
        }
      }
    });
  });

  document.addEventListener('click', closeAll);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });
}());
