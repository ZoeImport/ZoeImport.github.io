// Scroll-reveal for project pages.
// Elements with class "reveal" start hidden (via .js-pending added here) and
// get .is-in when they enter the viewport. Without JS, content stays visible.
// Reduced-motion users see content immediately.
(() => {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }

  els.forEach((el) => el.classList.add("js-pending"));

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((el) => io.observe(el));
})();
