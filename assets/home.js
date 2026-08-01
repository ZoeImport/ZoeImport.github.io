// Progressive enhancement for the home pages only:
// 1. Profile dock appears once the hero leaves the viewport (IntersectionObserver
//    on the hero section itself — no bottom-sentinel inversion semantics).
// 2. The dock hides again when the footer is visible, so it never covers footer content.
// 3. On narrow screens the dock collapses to a floating avatar button with an
//    expandable card (aria-expanded / aria-controls, Escape to close, focus
//    wraps inside the open panel).
// 4. A restrained pointer glow on the hero, desktop fine pointers only, rAF-throttled.
// The pages remain fully readable without this script.
(() => {
  const dock = document.querySelector("[data-profile-dock]");
  const fab = dock ? dock.querySelector(".dock-fab") : null;
  const panel = dock ? dock.querySelector(".dock-panel") : null;
  const closeBtn = dock ? dock.querySelector(".dock-close") : null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let open = false;
  function focusables() {
    return panel ? Array.from(panel.querySelectorAll("a, button")) : [];
  }
  function setOpen(next, focusTrigger) {
    open = next;
    if (fab) fab.setAttribute("aria-expanded", String(open));
    if (panel) panel.classList.toggle("is-open", open);
    if (open) {
      const first = focusables()[0];
      if (first) first.focus();
    } else if (focusTrigger && fab) {
      fab.focus();
    }
  }

  let heroVisible = true;
  let footerVisible = false;
  const heroEl = document.querySelector(".identity-hero");
  let footer = null;

  // Auto-hide must not strand focus inside a hidden dock: when the hero or
  // footer scrolls into view the whole dock is hidden (visibility:hidden, or
  // display:none for the mobile panel), so a focused dock link would become
  // invisible. Move focus to the most relevant visible element of the context
  // instead — the hero's first visible CTA, else the footer's first visible
  // link, else the page content as a safe fallback.
  function firstVisible(scope, selector) {
    if (!scope) return null;
    for (const el of scope.querySelectorAll(selector)) {
      if (el.getClientRects().length > 0) return el;
    }
    return null;
  }

  function contextFocusTarget() {
    if (heroVisible) {
      const cta = firstVisible(heroEl, ".hero-actions a");
      if (cta) return cta;
    }
    if (footerVisible) {
      const link = firstVisible(footer, ".footer-links a");
      if (link) return link;
    }
    return document.getElementById("content") || document.body;
  }

  function moveFocusToVisibleContext() {
    const target = contextFocusTarget();
    if (!target || target === document.activeElement) return;
    if (!target.matches("a[href], button, input, select, textarea, [tabindex]")) {
      target.tabIndex = -1;
    }
    target.focus({ preventScroll: true });
  }

  function updateDock() {
    if (!dock) return;
    const show = !heroVisible && !footerVisible;
    const focusWasInDock = dock.contains(document.activeElement);
    dock.classList.toggle("is-visible", show);
    if (!show) {
      setOpen(false, false);
      if (focusWasInDock) moveFocusToVisibleContext();
    }
  }

  if (dock && heroEl && "IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
      updateDock();
    }, { threshold: 0 }).observe(heroEl);

    footer = document.querySelector(".site-footer");
    if (footer) {
      new IntersectionObserver((entries) => {
        footerVisible = entries[0].isIntersecting;
        updateDock();
      }, { threshold: 0.05 }).observe(footer);
    }
  } else if (dock) {
    // No IO support: approximate with scroll position so the dock is never
    // present on the first screen.
    const onScroll = () => {
      heroVisible = window.scrollY < window.innerHeight;
      updateDock();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (fab) {
    fab.addEventListener("click", () => setOpen(!open, false));
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => setOpen(false, true));
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) {
      setOpen(false, true);
      return;
    }
    if (event.key === "Tab" && open) {
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  const hero = document.querySelector(".identity-hero");
  const glow = hero ? hero.querySelector(".hero-glow") : null;
  if (
    hero &&
    glow &&
    window.matchMedia("(pointer: fine)").matches &&
    !reducedMotion.matches
  ) {
    let raf = null;
    hero.addEventListener("pointermove", (event) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        glow.style.setProperty("--gx", `${x}%`);
        glow.style.setProperty("--gy", `${y}%`);
        raf = null;
      });
    });
  }
})();
