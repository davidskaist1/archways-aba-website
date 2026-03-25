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

// ── Services dropdown (click to open) ─────────────────────────
(function initDropdowns() {
  var toggles = document.querySelectorAll('.nav-dropdown__toggle');
  toggles.forEach(function(btn) {
    var menu = btn.parentElement.querySelector('.nav-dropdown__menu');
    if (!menu) return;
    // Start hidden
    menu.style.display = 'none';

    btn.onclick = function(e) {
      e.stopPropagation();
      var isOpen = menu.style.display === 'block';
      // Close all
      toggles.forEach(function(b) {
        var m = b.parentElement.querySelector('.nav-dropdown__menu');
        if (m) m.style.display = 'none';
        b.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        menu.style.display = 'block';
        btn.setAttribute('aria-expanded', 'true');
      }
    };
  });

  document.addEventListener('click', function() {
    toggles.forEach(function(b) {
      var m = b.parentElement.querySelector('.nav-dropdown__menu');
      if (m) m.style.display = 'none';
      b.setAttribute('aria-expanded', 'false');
    });
  });
})();

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

      if (form.dataset.form === 'intake') {
        // Route intake form to Netlify function → Supabase CRM
        const data = Object.fromEntries(new FormData(form).entries());
        res = await fetch('/.netlify/functions/intake-to-crm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        // All other forms (referral, etc.) go straight to Formspree
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
        showToast('✓ Message sent! We\'ll be in touch shortly.');
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (err) {
      showToast('Something went wrong. Please email us directly.');
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
  dropdowns.forEach(function (dd) {
    const toggle = dd.querySelector('.nav-dropdown__toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = dd.classList.contains('is-open');
      // close all
      dropdowns.forEach(function (d) {
        d.classList.remove('is-open');
        const t = d.querySelector('.nav-dropdown__toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!open) {
        dd.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', function () {
    dropdowns.forEach(function (d) {
      d.classList.remove('is-open');
      const t = d.querySelector('.nav-dropdown__toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  });

  // keyboard: close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      dropdowns.forEach(function (d) {
        d.classList.remove('is-open');
        const t = d.querySelector('.nav-dropdown__toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }
  });
}());
