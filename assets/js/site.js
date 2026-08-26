/* Health Unpaused — shared behaviour (multi-page)
   - Focus Mode (neurodiversity) with persistence across pages
   - Mobile menu
   - Scroll reveal
   - Marks the current nav link based on the filename
*/
(function () {
  "use strict";
  var body = document.body;
  var FOCUS_KEY = "hu-focus";

  /* ---------- Focus Mode ---------- */
  function setFocus(on) {
    body.classList.toggle("focus", on);
    var t = document.getElementById("focusToggle");
    if (t) t.setAttribute("aria-pressed", on ? "true" : "false");
  }
  try { if (localStorage.getItem(FOCUS_KEY) === "on") setFocus(true); } catch (e) {}

  var toggle = document.getElementById("focusToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var on = !body.classList.contains("focus");
      setFocus(on);
      try { localStorage.setItem(FOCUS_KEY, on ? "on" : "off"); } catch (e) {}
    });
  }

  /* ---------- Mobile menu (Escape / outside-tap / scroll close — NO body lock:
       a stuck lock freezes the page on iOS, and the panel scrolls internally) ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var navLinks = document.getElementById("navLinks");
  function setMenu(open) {
    navLinks.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", function () {
      setMenu(!navLinks.classList.contains("open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navLinks.classList.contains("open")) {
        setMenu(false); menuBtn.focus();
      }
    });
    /* pointerdown fires reliably on iOS where document 'click' does not */
    document.addEventListener("pointerdown", function (e) {
      if (navLinks.classList.contains("open") &&
          !navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
        setMenu(false);
      }
    });
    /* scrolling away also closes the menu */
    var menuScrollY = 0;
    window.addEventListener("scroll", function () {
      if (!navLinks.classList.contains("open")) { menuScrollY = window.scrollY; return; }
      if (Math.abs(window.scrollY - menuScrollY) > 60) setMenu(false);
    }, { passive: true });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
  }

  /* ---------- Dropdown for touch input (per-interaction, not per-device) ----------
     A finger tap first opens the submenu; a second tap (or any mouse click) navigates. */
  var lastPointer = "mouse";
  document.addEventListener("pointerdown", function (e) {
    lastPointer = e.pointerType || "mouse";
  }, true);
  if (navLinks) {
    navLinks.querySelectorAll(".has-sub > a").forEach(function (top) {
      top.addEventListener("click", function (e) {
        var wrap = top.closest(".has-sub");
        var burgerVisible = menuBtn && getComputedStyle(menuBtn).display !== "none";
        if (burgerVisible || lastPointer === "mouse") return;
        if (!wrap.classList.contains("open")) {
          e.preventDefault();
          wrap.classList.add("open");
        }
      });
    });
    document.addEventListener("click", function (e) {
      navLinks.querySelectorAll(".has-sub.open").forEach(function (w) {
        if (!w.contains(e.target)) w.classList.remove("open");
      });
    });
  }

  /* ---------- Rotating hero questions ([data-rotate] > .q) ----------
     Static list in Focus Mode / reduced motion. */
  document.querySelectorAll("[data-rotate]").forEach(function (wrap) {
    var qs = wrap.querySelectorAll(".q");
    if (qs.length < 2) return;
    var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
               body.classList.contains("focus");
    if (calm) return; /* CSS shows all statically in focus mode */
    var i = 0;
    qs[0].classList.add("show");
    setInterval(function () {
      if (body.classList.contains("focus")) return;
      qs[i].classList.remove("show");
      i = (i + 1) % qs.length;
      qs[i].classList.add("show");
    }, 3400);
  });

  /* ---------- Marquee: fill any viewport width (no empty gaps) ----------
     Markup ships with 2 identical groups; we clone until the track is at
     least 2× the viewport, keeping an even group count so the -50% loop
     stays seamless. Re-fills on resize. */
  document.querySelectorAll(".marquee-hu .track, .marquee .track").forEach(function (track) {
    var items = Array.prototype.slice.call(track.children);
    var groupLen = items.length / 2;
    var group = items.slice(0, groupLen).map(function (n) { return n.outerHTML; }).join("");
    function fill() {
      track.innerHTML = group + group;
      var groups = 2;
      var guard = 0;
      while (track.scrollWidth < window.innerWidth * 2 + 200 && guard < 40) {
        track.insertAdjacentHTML("beforeend", group + group);
        groups += 2; guard++;
      }
    }
    fill();
    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(fill, 200); });
  });

  /* ---------- Focus toggle: explicit accessible name ---------- */
  var ft = document.getElementById("focusToggle");
  if (ft && !ft.getAttribute("aria-label")) {
    ft.setAttribute("aria-label", "Focus Mode: simplify layout and typography for easier reading");
  }

  /* ---------- Mark current nav link ---------- */
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (navLinks) {
    navLinks.querySelectorAll("a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").toLowerCase();
      if (href === here || (here === "index.html" && href === "index.html")) {
        a.setAttribute("aria-current", "page");
      }
    });
    /* if a dropdown sub-link is current, highlight its parent too */
    var curSub = navLinks.querySelector(".sub a[aria-current]");
    if (curSub) {
      var parent = curSub.closest(".has-sub");
      var top = parent && parent.querySelector("a");
      if (top) top.classList.add("is-current-parent");
    }
  }

  /* ---------- Header scrolled state ---------- */
  var header = document.querySelector("header");
  if (header) {
    var lastScrolled = false;
    var onScrollHeader = function () {
      var s = window.scrollY > 24;
      if (s !== lastScrolled) { header.classList.toggle("scrolled", s); lastScrolled = s; }
    };
    window.addEventListener("scroll", onScrollHeader, { passive: true });
    onScrollHeader();
  }

  /* ---------- Parallax on image bands (live-respects Focus Mode) ---------- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bands = document.querySelectorAll(".imgband img");
  if (bands.length && !reduceMotion) {
    var ticking = false;
    var parallax = function () {
      ticking = false;
      if (body.classList.contains("focus")) return;
      bands.forEach(function (img) {
        var band = img.closest(".imgband");
        var r = band.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        // progress: -1 (band below viewport) .. 1 (band above viewport)
        var p = (r.top + r.height / 2 - window.innerHeight / 2) / (window.innerHeight / 2 + r.height / 2);
        img.style.transform = "translateY(" + (p * 34).toFixed(1) + "px)";
      });
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
    }, { passive: true });
    parallax();
  }

  /* ---------- Count-up for stats ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    var dur = 1200, start = null;
    var isInt = target % 1 === 0;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = prefix + (isInt ? Math.round(val) : val.toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + (isInt ? target : target.toFixed(1)) + suffix;
    }
    requestAnimationFrame(step);
  }

  /* ---------- Scroll reveal (+ stagger, brief meters, count-up) ---------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
               document.body.classList.contains("focus");
  var animated = document.querySelectorAll(".reveal, .stagger, .brief, [data-count]");

  function activate(el) {
    el.classList.add("in");
    if (el.hasAttribute("data-count")) {
      // re-check focus at activation time (user may toggle mid-session)
      if (reduce || body.classList.contains("focus")) {
        var t = el.getAttribute("data-count");
        el.textContent = (el.getAttribute("data-prefix") || "") + t + (el.getAttribute("data-suffix") || "");
      } else countUp(el);
    }
  }

  if (reduce || !("IntersectionObserver" in window)) {
    animated.forEach(activate);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { activate(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    animated.forEach(function (el) { io.observe(el); });
  }
})();
