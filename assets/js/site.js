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

  /* ---------- Mobile menu (scroll-lock, Escape, outside-tap close) ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var navLinks = document.getElementById("navLinks");
  function setMenu(open) {
    navLinks.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.documentElement.classList.toggle("menu-open", open);
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
    document.addEventListener("click", function (e) {
      if (navLinks.classList.contains("open") &&
          !navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
        setMenu(false);
      }
    });
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
