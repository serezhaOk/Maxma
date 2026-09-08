/* =====================================================================
   MAXMA prototype — presentation behaviour
   ===================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     Asset slots.
     Every image box keeps its exact Figma geometry. If the export is
     present in assets/img/ it is painted in; if not, the slot stays a
     neutral placeholder instead of a broken image. See ASSETS.md.
     --------------------------------------------------------------- */
  function hydrateAssets() {
    document.querySelectorAll('.ph[data-img]').forEach(function (el) {
      var src = el.getAttribute('data-img');
      var probe = new Image();
      probe.onload = function () {
        el.style.setProperty('--src', 'url("' + src + '")');
        el.classList.add('is-loaded');
      };
      probe.src = src;
    });
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
    track.innerHTML += track.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindMarquee();
    hydrateAssets();
    bindTabs('.cases-tabs', '.pill', 'is-active', function (i, item) {
      toast('Фильтр: ' + item.textContent.trim());
    });
    bindTabs('.stage-tabs', '.stab', 'is-active');
    bindCases();
    bindLeadForm();
    bindSubForm();
    bindAnchors();
  });
})();
