/* Global Beyond LLC — progressive enhancement only.
   Every piece of content is readable, navigable and linkable without this file. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------- header */
  var header = document.querySelector('[data-header]');
  if (header) {
    var setStuck = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    setStuck();
    window.addEventListener('scroll', setStuck, { passive: true });
  }

  /* -------------------------------------------------------- mobile menu */
  var toggle = document.querySelector('[data-menu-toggle]');
  var nav = document.querySelector('[data-nav]');

  if (toggle && nav) {
    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', toggle.getAttribute(open ? 'data-label-close' : 'data-label-open'));
      nav.classList.toggle('is-open', open);
      if (header) header.classList.toggle('is-menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };

    var isOpen = function () { return toggle.getAttribute('aria-expanded') === 'true'; };

    toggle.addEventListener('click', function () { setMenu(!isOpen()); });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        setMenu(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (!isOpen()) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      setMenu(false);
    });

    var desktop = window.matchMedia('(min-width: 1024px)');
    var syncViewport = function () { if (desktop.matches) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', syncViewport);
    else if (desktop.addListener) desktop.addListener(syncViewport);
  }

  /* ------------------------------------------------------------ reveals */
  /* A rect sweep rather than a bare IntersectionObserver: anything at or above
     the fold — including everything the visitor has already scrolled past — is
     revealed on the next frame, so no copy can ever be left hidden. */
  var revealables = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  var revealAll = function () {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
    revealables = [];
  };

  if (revealables.length) {
    if (reduceMotion.matches) {
      revealAll();
    } else {
      var queued = false;

      var sweep = function () {
        queued = false;
        var limit = window.innerHeight * 0.92;
        revealables = revealables.filter(function (el) {
          var rect = el.getBoundingClientRect();
          if (rect.top < limit) {
            el.classList.add('is-visible');
            return false;
          }
          return true;
        });
        if (!revealables.length) detach();
      };

      var request = function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(sweep);
      };

      var detach = function () {
        window.removeEventListener('scroll', request);
        window.removeEventListener('resize', request);
        window.removeEventListener('load', request);
      };

      window.addEventListener('scroll', request, { passive: true });
      window.addEventListener('resize', request, { passive: true });
      window.addEventListener('load', request);
      request();

      /* Honour a mid-session switch to reduced motion. */
      var onMotionChange = function () { if (reduceMotion.matches) { revealAll(); detach(); } };
      if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
      else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);
    }
  }

  /* -------------------------------------------------- current section nav */
  var navLinks = document.querySelectorAll('[data-nav-link]');
  var sections = [];
  Array.prototype.forEach.call(navLinks, function (link) {
    var id = link.getAttribute('href').split('#')[1];
    var section = id && document.getElementById(id);
    if (section) sections.push({ link: link, section: section });
  });

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var match = sections.filter(function (item) { return item.section === entry.target; })[0];
        if (!match) return;
        if (entry.isIntersecting) {
          sections.forEach(function (item) { item.link.removeAttribute('aria-current'); });
          match.link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (item) { spy.observe(item.section); });
  }

  /* --------------------------------------------------- team photo state */
  var media = document.querySelector('[data-media]');
  if (media) {
    var photo = media.querySelector('img');
    var markMissing = function () { media.classList.add('is-missing'); };
    if (photo) {
      if (photo.complete && photo.naturalWidth === 0) markMissing();
      photo.addEventListener('error', markMissing);
    }
  }

  /* ---------------------------------------------------------- footer year */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
