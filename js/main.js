/* =====================================================================
   MAXMA prototype — presentation behaviour
   ===================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     Asset slots.

     A slot names the asset, not the file: data-asset="hero-dashboard".
     The loader tries the extensions below and uses whichever one is
     actually in assets/img/, so an export saved as .svg where .png was
     expected still lands — and a .webm/.mp4 becomes a looping video
     instead of a still. Nothing found: the slot keeps its designed
     geometry as a neutral placeholder. See ASSETS.md.
     --------------------------------------------------------------- */
  var DIR = 'assets/img/';
  var IMAGE_EXT = ['svg', 'png', 'webp', 'jpg', 'jpeg'];
  var VIDEO_EXT = ['webm', 'mp4'];

  function probeImage(url) {
    return new Promise(function (resolve) {
      var probe = new Image();
      probe.onload = function () { resolve(true); };
      probe.onerror = function () { resolve(false); };
      probe.src = url;
    });
  }

  function probeVideo(url) {
    return new Promise(function (resolve) {
      var probe = document.createElement('video');
      probe.muted = true;
      probe.preload = 'metadata';
      probe.onloadeddata = probe.onloadedmetadata = function () { resolve(true); };
      probe.onerror = function () { resolve(false); };
      probe.src = url;
    });
  }

  function mountVideo(el, url) {
    var video = document.createElement('video');
    video.src = url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    el.classList.add('is-video');
    el.appendChild(video);
    // Autoplay can still be refused; a muted inline video normally isn't.
    var started = video.play();
    if (started && started.catch) started.catch(function () {});
  }

  async function hydrateAsset(el) {
    var name = el.getAttribute('data-asset');
    for (var i = 0; i < IMAGE_EXT.length; i++) {
      var url = DIR + name + '.' + IMAGE_EXT[i];
      if (await probeImage(url)) {
        // Absolute: the property is read inside css/styles.css, and a
        // relative URL there would resolve against css/, not the page.
        el.style.setProperty('--src', 'url("' + new URL(url, document.baseURI).href + '")');
        el.classList.add('is-loaded');
        return;
      }
    }
    for (var k = 0; k < VIDEO_EXT.length; k++) {
      var vurl = DIR + name + '.' + VIDEO_EXT[k];
      if (await probeVideo(vurl)) { mountVideo(el, vurl); return; }
    }
  }

  function hydrateAssets() {
    document.querySelectorAll('.ph[data-asset]').forEach(hydrateAsset);
  }

  /* ---------------------------------------------------------------
     Icon font. The ligatures would otherwise show as the words
     "bolt", "token", ... if Google Fonts is unreachable.
     --------------------------------------------------------------- */
  function revealIcons() {
    if (!document.fonts) return;
    document.fonts.load('300 24px "Material Symbols Outlined"', 'bolt').then(function (faces) {
      if (faces && faces.length) document.documentElement.classList.add('fonts-ready');
    }).catch(function () {});
  }

  /* ---------------------------------------------------------------
     First screen: as you scroll it, the gradient card grows into a
     full-bleed background and the dashboard scales up by 15%.
     --------------------------------------------------------------- */
  function bindHeroScroll() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    var RUN = 700; // px of scroll the expansion takes
    var ticking = false;

    function apply() {
      ticking = false;
      var p = Math.min(1, Math.max(0, window.pageYOffset / RUN));
      stage.style.setProperty('--hero-p', p.toFixed(4));
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    apply();
  }

  /* ---------------------------------------------------------------
     Toast
     --------------------------------------------------------------- */
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  /* ---------------------------------------------------------------
     Pill tab groups (cases + platform stages)
     --------------------------------------------------------------- */
  function bindTabs(root, itemSelector, activeClass, onChange) {
    var group = document.querySelector(root);
    if (!group) return;
    var items = Array.prototype.slice.call(group.querySelectorAll(itemSelector));
    items.forEach(function (item, i) {
      item.addEventListener('click', function () {
        items.forEach(function (other) {
          other.classList.remove(activeClass);
          other.setAttribute('aria-selected', 'false');
        });
        item.classList.add(activeClass);
        item.setAttribute('aria-selected', 'true');
        if (onChange) onChange(i, item);
      });
    });
  }

  /* ---------------------------------------------------------------
     Cases carousel · 2968:17370
     Card widths + 16px gap, exactly as laid out in Figma.
     --------------------------------------------------------------- */
  function bindCases() {
    var track = document.getElementById('casesTrack');
    var prev = document.getElementById('casesPrev');
    var next = document.getElementById('casesNext');
    if (!track || !prev || !next) return;

    var GAP = 16;
    var cards = Array.prototype.slice.call(track.children);
    var offsets = [];
    var run = 0;
    cards.forEach(function (card) {
      offsets.push(run);
      run += card.getBoundingClientRect().width + GAP;
    });

    var index = 0;
    function render() {
      track.style.transform = 'translateX(' + -offsets[index] + 'px)';
      prev.disabled = index === 0;
      next.disabled = index >= cards.length - 2;
    }
    prev.addEventListener('click', function () { index = Math.max(0, index - 1); render(); });
    next.addEventListener('click', function () { index = Math.min(cards.length - 2, index + 1); render(); });
    render();
  }

  /* ---------------------------------------------------------------
     Platform stages: picking a tab slides the matching card in.
     --------------------------------------------------------------- */
  function bindPlatformCards() {
    var track = document.getElementById('pcardsTrack');
    if (!track) return;
    var STEP = 1046 + 16; // card width + gap
    bindTabs('.stage-tabs', '.stab', 'is-active', function (i) {
      track.style.transform = 'translateX(' + -(i * STEP) + 'px)';
    });
  }

  /* ---------------------------------------------------------------
     "Максимум результата": the section stays pinned while scrolling
     walks through the five steps one at a time.
     --------------------------------------------------------------- */
  function bindWhyPin() {
    var pin = document.getElementById('whyPin');
    if (!pin) return;
    var steps = Array.prototype.slice.call(pin.querySelectorAll('.why-step'));
    if (!steps.length) return;
    var ticking = false, current = -1;

    function apply() {
      ticking = false;
      var inner = pin.firstElementChild;
      var top = pin.getBoundingClientRect().top + window.pageYOffset;
      // Distance actually spent scrolling while the inner block is stuck.
      var travel = pin.offsetHeight - inner.offsetHeight;
      if (travel <= 0) return;
      var p = (window.pageYOffset + 84 - top) / travel;
      var i = Math.floor(Math.min(1, Math.max(0, p)) * steps.length);
      if (i >= steps.length) i = steps.length - 1;
      if (i === current) return;
      current = i;
      steps.forEach(function (step, k) { step.classList.toggle('is-active', k === i); });
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    apply();
  }

  /* ---------------------------------------------------------------
     Forms — prototype only, nothing is sent anywhere
     --------------------------------------------------------------- */
  function bindLeadForm() {
    var form = document.getElementById('leadForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('.field').forEach(function (field) {
        var input = field.querySelector('input');
        var filled = input.value.trim() !== '';
        field.classList.toggle('is-error', !filled);
        if (!filled) ok = false;
      });
      if (!ok) { toast('Заполните все поля'); return; }
      toast('Заявка отправлена — с вами свяжутся');
      form.reset();
    });
    form.querySelectorAll('.field input').forEach(function (input) {
      input.addEventListener('input', function () {
        input.closest('.field').classList.remove('is-error');
      });
    });
  }

  function bindSubForm() {
    var form = document.getElementById('subForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value.trim())) {
        toast('Введите корректный e-mail');
        return;
      }
      toast('Вы подписаны на рассылку');
      form.reset();
    });
  }

  /* ---------------------------------------------------------------
     In-page anchors
     --------------------------------------------------------------- */
  function bindAnchors() {
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.pageYOffset - 40,
          behavior: 'smooth'
        });
      });
    });
  }

  /* ---------------------------------------------------------------
     Marquee · duplicate the strip so the loop has no visible seam
     --------------------------------------------------------------- */
  function bindMarquee() {
    var track = document.getElementById('marqueeTrack');
    if (!track) return;
    var count = track.children.length;
    // One item pitch is 150px wide + the 40px flex gap.
    track.style.setProperty('--marquee-run', count * 190 + 'px');
    track.innerHTML += track.innerHTML; // second copy hides the loop seam
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindMarquee();
    hydrateAssets();
    revealIcons();
    bindHeroScroll();
    bindTabs('.cases-tabs', '.pill', 'is-active', function (i, item) {
      toast('Фильтр: ' + item.textContent.trim());
    });
    bindPlatformCards();
    bindCases();
    bindWhyPin();
    bindLeadForm();
    bindSubForm();
    bindAnchors();
  });
})();
