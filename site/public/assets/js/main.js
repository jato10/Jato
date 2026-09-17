/* Global Beyond LLC — progressive enhancement only.
   Every piece of content is readable, navigable and linkable without this file. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------- header */
  var header = document.querySelector('[data-header]');
  if (header) {
    var stuckQueued = false;
    var setStuck = function () {
      stuckQueued = false;
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    /* Through a frame rather than straight off the event: scroll fires far
       more often than the class can actually change, and this one toggles a
       backdrop-filtered layer. */
    var queueStuck = function () {
      if (stuckQueued) return;
      stuckQueued = true;
      window.requestAnimationFrame(setStuck);
    };
    setStuck();
    window.addEventListener('scroll', queueStuck, { passive: true });
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
        /* Start a block a tenth of a screen before it scrolls into view, so
           by the time the visitor's eyes reach it the motion has already
           settled and the content is simply there. */
        var limit = window.innerHeight * 1.1;
        /* On a short page the last block can sit close enough to the bottom
           that its top never crosses that line — the page simply can't
           scroll any further to bring it there. Once the visitor has hit the
           bottom of the page, reveal whatever is left regardless of rect.top
           so nothing stays permanently hidden. */
        var atBottom = window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 2;
        revealables = revealables.filter(function (el) {
          var rect = el.getBoundingClientRect();
          if (atBottom || rect.top < limit) {
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

  /* ------------------------------------------------------------- tabs */
  Array.prototype.forEach.call(document.querySelectorAll('[data-tabs]'), function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length || !panels.length) return;

    var activate = function (tab, moveFocus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(function (p) {
        p.classList.toggle('is-active', p.id === tab.getAttribute('aria-controls'));
      });
      if (moveFocus) tab.focus();
    };

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { activate(tab, false); });
      tab.addEventListener('keydown', function (event) {
        var target = null;
        if (event.key === 'ArrowRight') target = tabs[(i + 1) % tabs.length];
        else if (event.key === 'ArrowLeft') target = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (event.key === 'Home') target = tabs[0];
        else if (event.key === 'End') target = tabs[tabs.length - 1];
        if (!target) return;
        event.preventDefault();
        activate(target, true);
      });
    });
  });

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


  /* ------------------------------------------------------- contact form */
  /* The form posts normally without this: the endpoint redirects to a
     confirmation page. Here we submit in place and keep the visitor put. */
  var form = document.querySelector('[data-contact-form]');
  if (form && window.fetch && window.FormData) {
    var status = form.querySelector('[data-form-status]');
    var submit = form.querySelector('[data-submit]');

    var say = function (state) {
      if (!status) return;
      status.setAttribute('data-state', state);
      status.textContent = status.getAttribute('data-' + state) || '';
    };

    var busy = function (isBusy) {
      if (!submit) return;
      submit.disabled = isBusy;
      submit.textContent = submit.getAttribute(isBusy ? 'data-busy' : 'data-idle');
    };

    /* Three forms share this handler — the contact form, a product order form
       and the review form — so fields are looked up by name and their error
       slot is found inside the same .field wrapper rather than by a fixed id. */
    var field = function (name) { return form.querySelector('[name="' + name + '"]'); };
    var val = function (el) { return el ? el.value.trim() : ''; };
    var errorFor = function (el) {
      var wrap = el && el.closest && el.closest('.field');
      return wrap ? wrap.querySelector('.field__error') : null;
    };
    /* Only the contact and order forms ask for a way to reply. */
    var contactError = form.querySelector('[id$="-contact-error"]');

    var flag = function (el, invalid, errorEl) {
      if (el) el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      if (errorEl) errorEl.textContent = invalid ? (errorEl.getAttribute('data-message') || '') : '';
    };

    form.addEventListener('submit', function (event) {
      var nameEl = field('name');
      var emailEl = field('email');
      var phoneEl = field('phone');
      var messageEl = field('message');
      var commentEl = field('comment');
      /* What the visitor actually writes: the review text, or the message box. */
      var bodyEl = commentEl || messageEl;

      /* Only the review form has a star rating, and there it is required:
         nothing is selected up front, so a review with no score would mean the
         visitor skipped the control rather than that they had no opinion. */
      var ratingGroup = form.querySelector('[name="rating"]');
      var ratingEl = form.querySelector('[name="rating"]:checked');
      var ratingMissing = !!ratingGroup && !ratingEl;

      var name = val(nameEl);
      var email = val(emailEl);
      var phone = val(phoneEl);
      var body = val(bodyEl);
      var contactMissing = !!contactError && !email && !phone;

      flag(ratingGroup, ratingMissing, errorFor(ratingGroup));
      flag(nameEl, !name, errorFor(nameEl));
      flag(bodyEl, !body, errorFor(bodyEl));
      if (contactError) {
        flag(emailEl, contactMissing, contactError);
        flag(phoneEl, contactMissing, contactError);
      }

      if (ratingMissing || !name || !body || contactMissing) {
        event.preventDefault();
        say('invalid');
        var firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
        return;
      }

      event.preventDefault();
      say('');
      busy(true);

      /* Each form contributes what it has: the order form an address and a
         payment preference, the review form a star rating and the review
         itself. The plain contact form has none of them. */
      var addressEl = field('address');
      var paymentEl = form.querySelector('[name="paymentMethod"]:checked');

      var parts = [];
      if (val(messageEl)) parts.push(val(messageEl));
      if (ratingEl) parts.push('Rating: ' + ratingEl.value + '/5');
      if (commentEl && val(commentEl)) parts.push(val(commentEl));
      if (addressEl && val(addressEl)) parts.push('Shipping address: ' + val(addressEl));
      if (paymentEl) parts.push('Preferred payment method: ' + paymentEl.value);
      var fullMessage = parts.join('\n\n');

      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        body: JSON.stringify({
          lang: form.querySelector('[name="lang"]').value,
          name: name,
          email: email,
          phone: phone,
          message: fullMessage,
          company: form.querySelector('[name="company"]').value,
        }),
      })
        .then(function (response) { return response.json().catch(function () { return { ok: response.ok }; }); })
        .then(function (result) {
          busy(false);
          if (!result || !result.ok) return say('error');
          form.reset();
          say('success');
        })
        .catch(function () { busy(false); say('error'); });
    });
  }

  /* ------------------------------------------------------ google reviews */
  /* An addition to the reviews already on the page, never a replacement: if
     the proxy is unconfigured, slow or unreachable, the page keeps the
     reviews it was served with. Every value from Google is written with
     textContent or setAttribute — none of it is ever parsed as HTML. */
  var googleSlot = document.querySelector('[data-google-reviews]');
  var googleTemplate = document.querySelector('[data-google-review-template]');
  if (googleSlot && googleTemplate && 'content' in googleTemplate && window.fetch) {
    var lang = document.documentElement.getAttribute('lang') || 'en';

    var fillStars = function (holder, rating) {
      var stars = holder.querySelectorAll('.star');
      var whole = Math.floor(rating);
      Array.prototype.forEach.call(stars, function (star, i) {
        if (i < whole) star.classList.add('star--filled');
      });
      holder.setAttribute('aria-label', rating + '/5');
    };

    fetch('/api/google-reviews?lang=' + encodeURIComponent(lang), {
      headers: { 'X-Requested-With': 'fetch' },
    })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (!data || !data.reviews || !data.reviews.length) return;
        var fragment = document.createDocumentFragment();

        data.reviews.forEach(function (review) {
          var card = googleTemplate.content.firstElementChild.cloneNode(true);
          fillStars(card.querySelector('[data-stars]'), Number(review.rating) || 0);
          card.querySelector('[data-body]').textContent = '“' + review.text + '”';
          card.querySelector('[data-author]').textContent = review.author;
          card.querySelector('[data-date]').textContent = review.date || '';

          var link = card.querySelector('[data-link]');
          /* Only a Google address gets to be the link; anything else stays
             inert text so a bad url can never become a javascript: target. */
          if (review.url && /^https:\/\/([a-z0-9-]+\.)*google\.com\//i.test(review.url)) {
            link.setAttribute('href', review.url);
          } else {
            link.removeAttribute('target');
            link.removeAttribute('rel');
          }
          fragment.appendChild(card);
        });

        googleSlot.appendChild(fragment);
      })
      .catch(function () { /* the page already has its own reviews */ });
  }

  /* --------------------------------------------------- :active on iOS
     Safari applies :active to arbitrary elements only once the document
     carries a touch listener, so taps on cards, tabs and chips would show no
     press state at all without this empty passive listener. */
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* ---------------------------------------------------------- footer year */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
