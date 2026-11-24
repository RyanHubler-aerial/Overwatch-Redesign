(function () {
  'use strict';

  // Progressive scroll-reveal (fast-scroll safe: never leaves passed sections hidden)
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced && 'IntersectionObserver' in window) {
    var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    var revealIfReached = function () {
      var thresholdY = window.innerHeight + 80;
      for (var i = reveals.length - 1; i >= 0; i--) {
        var el = reveals[i];
        if (el.getBoundingClientRect().top <= thresholdY) {
          el.classList.add('is-visible');
          observer.unobserve(el);
          reveals.splice(i, 1);
        }
      }
      if (reveals.length === 0) {
        window.removeEventListener('scroll', revealIfReached);
      }
    };

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight + 80) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '0px 0px 80px 0px' }
    );

    document.documentElement.classList.add('js-anim');
    reveals.forEach(function (el) {
      observer.observe(el);
    });
    revealIfReached();
    window.addEventListener('scroll', revealIfReached, { passive: true });
  }

  // Hero ambient dot field on dark obsidian canvas — drifting dots that part around cursor
  var heroSection = document.querySelector('[data-particle-hero]');
  var canvas = heroSection ? heroSection.querySelector('.hero-particles') : null;

  if (heroSection && canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var dots = [];
    var rafId = null;
    var isVisible = true;
    var pointer = { x: -9999, y: -9999, active: false };

    function buildField() {
      var rect = heroSection.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var maxDots = width < 640 ? 65 : 220;
      var count = Math.max(50, Math.min(maxDots, Math.round((width * height) / 4600)));
      dots = [];

      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * width,
          y: Math.random() * height,
          dir: Math.random() * Math.PI * 2,
          speed: 0.14 + Math.random() * 0.26,
          turnSpeed: (Math.random() - 0.5) * 0.012,
          ivx: 0,
          ivy: 0,
          baseR: 1.2 + Math.random() * 1.2,
          blueTint: Math.random() < 0.35
        });
      }
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      var radius = 155;
      var radiusSq = radius * radius;
      var pad = 12;

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];

        d.dir += d.turnSpeed + (Math.random() - 0.5) * 0.015;
        var bvx = Math.cos(d.dir) * d.speed;
        var bvy = Math.sin(d.dir) * d.speed;

        if (pointer.active) {
          var dx = d.x - pointer.x;
          var dy = d.y - pointer.y;
          var distSq = dx * dx + dy * dy;

          if (distSq < radiusSq && distSq > 0.01) {
            var dist = Math.sqrt(distSq);
            var falloff = 1 - dist / radius;
            var push = falloff * falloff * 2.1;
            d.ivx += (dx / dist) * push;
            d.ivy += (dy / dist) * push;
          }
        }

        d.x += bvx + d.ivx;
        d.y += bvy + d.ivy;
        d.ivx *= 0.92;
        d.ivy *= 0.92;

        if (d.x < -pad) d.x = width + pad;
        else if (d.x > width + pad) d.x = -pad;
        if (d.y < -pad) d.y = height + pad;
        else if (d.y > height + pad) d.y = -pad;

        var impulse = Math.hypot(d.ivx, d.ivy);
        var energy = Math.min(1, impulse / 3.0);

        // Cool dark-surface slate/steel transitioning to OverWatch bright cerulean (#4DB4F5)
        var r0 = d.blueTint ? 60 : 120;
        var g0 = d.blueTint ? 132 : 132;
        var b0 = d.blueTint ? 190 : 154;

        var r = Math.round(r0 + (77 - r0) * energy);
        var g = Math.round(g0 + (180 - g0) * energy);
        var b = Math.round(b0 + (245 - b0) * energy);
        var alpha = (d.blueTint ? 0.34 : 0.24) + energy * 0.62;
        var dotR = d.baseR + energy * 1.1;

        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(d.x, d.y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReduced && isVisible) {
        rafId = window.requestAnimationFrame(render);
      }
    }

    function startLoop() {
      if (prefersReduced) {
        render();
        return;
      }
      if (!rafId && isVisible) {
        rafId = window.requestAnimationFrame(render);
      }
    }

    function stopLoop() {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    heroSection.addEventListener('pointermove', function (e) {
      var rect = heroSection.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });

    heroSection.addEventListener('pointerleave', function () {
      pointer.active = false;
    });

    window.addEventListener('resize', function () {
      var rect = heroSection.getBoundingClientRect();
      if (Math.abs(rect.width - width) > 2 || Math.abs(rect.height - height) > 120) {
        buildField();
        if (prefersReduced) render();
      }
    });

    if ('IntersectionObserver' in window) {
      var heroVis = new IntersectionObserver(
        function (entries) {
          isVisible = entries[0].isIntersecting;
          if (isVisible) startLoop();
          else stopLoop();
        },
        { threshold: 0.01 }
      );
      heroVis.observe(heroSection);
    }

    buildField();
    startLoop();
  }

  // Sticky header shadow
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile navigation drawer
  var toggle = document.querySelector('[data-menu-toggle]');
  var drawer = document.getElementById('mobile-drawer');
  if (toggle && drawer) {
    var burgerIcon =
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
    var closeIcon =
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<path d="M4.5 4.5l11 11M15.5 4.5l-11 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';

    var setDrawer = function (open) {
      drawer.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = open ? closeIcon : burgerIcon;
    };

    toggle.addEventListener('click', function () {
      setDrawer(!drawer.classList.contains('is-open'));
    });

    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setDrawer(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        setDrawer(false);
        toggle.focus();
      }
    });
  }

  // Expandable service disciplines
  document.querySelectorAll('[data-service-trigger]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.service-item');
      if (!item) return;
      var willOpen = !item.classList.contains('is-open');

      document.querySelectorAll('.service-item.is-open').forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('is-open');
          var otherBtn = openItem.querySelector('[data-service-trigger]');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      item.classList.toggle('is-open', willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  });

  // Education Hub live search & category filter
  var kbSearchInput = document.querySelector('[data-kb-search]');
  var kbFilterBtns = document.querySelectorAll('[data-kb-filter]');
  var kbCards = document.querySelectorAll('[data-kb-card]');
  var kbEmpty = document.querySelector('[data-kb-empty]');

  if (kbCards.length > 0) {
    var activeCat = 'all';

    var applyKbFilter = function () {
      var q = kbSearchInput ? (kbSearchInput.value || '').trim().toLowerCase() : '';
      var visibleCount = 0;

      kbCards.forEach(function (card) {
        var cat = card.getAttribute('data-kb-cat') || '';
        var text = (card.getAttribute('data-kb-keywords') || '') + ' ' + card.textContent;
        var matchesCat = activeCat === 'all' || cat === activeCat;
        var matchesQuery = !q || text.toLowerCase().indexOf(q) !== -1;
        var show = matchesCat && matchesQuery;
        card.classList.toggle('is-hidden', !show);
        if (show) visibleCount++;
      });

      if (kbEmpty) {
        kbEmpty.classList.toggle('is-visible', visibleCount === 0);
      }
    };

    kbFilterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeCat = btn.getAttribute('data-kb-filter') || 'all';
        kbFilterBtns.forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        applyKbFilter();
      });
    });

    if (kbSearchInput) {
      kbSearchInput.addEventListener('input', applyKbFilter);
    }
  }

  // Copy buttons
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = btn.getAttribute('data-copy');
      if (!val || !navigator.clipboard) return;
      navigator.clipboard.writeText(val).then(function () {
        var orig = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('is-copied');
        setTimeout(function () {
          btn.textContent = orig;
          btn.classList.remove('is-copied');
        }, 1800);
      });
    });
  });

  // Static-friendly forms (optional data-endpoint for Formspree/Web3Forms, else mailto:support@overwatchus.com)
  document.querySelectorAll('form[data-static-form]').forEach(function (form) {
    var status = form.querySelector('[data-form-status]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = new FormData(form);
      var endpoint = (form.getAttribute('data-endpoint') || '').trim();
      var subject = form.getAttribute('data-subject') || 'Inquiry from OverWatch Security Website';

      if (endpoint) {
        fetch(endpoint, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' }
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Submission failed');
            showStatus(status, 'success', 'Thank you. Your message has been sent and our team will be in touch promptly.');
            form.reset();
          })
          .catch(function () {
            showStatus(status, 'error', 'Unable to submit online right now. Please email support@overwatchus.com or call (877) 359-4407.');
          });
        return;
      }

      var lines = [];
      data.forEach(function (val, key) {
        var cleaned = String(val).trim();
        if (cleaned) lines.push(key + ': ' + cleaned);
      });
      var mailtoUrl =
        'mailto:support@overwatchus.com?subject=' +
        encodeURIComponent(subject) +
        '&body=' +
        encodeURIComponent(lines.join('\n'));

      window.location.href = mailtoUrl;

      showStatus(
        status,
        'success',
        'Your email client has been opened with your message addressed to support@overwatchus.com. ' +
          'If no email app opened, email support@overwatchus.com directly or call (877) 359-4407.'
      );
    });
  });

  function showStatus(el, type, message) {
    if (!el) return;
    el.textContent = message;
    el.className = 'form-status is-visible form-status--' + type;
  }
})();
