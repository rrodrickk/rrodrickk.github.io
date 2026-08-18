// fade.js — page-transition fade for multi-page navigation (blog subpages)
window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("fade-in");

  document.querySelectorAll("a[href]").forEach(link => {
    if (link.hostname === location.hostname && !link.target && !link.hash) {
      link.addEventListener("click", e => {
        e.preventDefault();
        const href = link.href;
        document.body.classList.remove("fade-in");
        document.body.classList.add("fade-out");
        setTimeout(() => { window.location.href = href; }, 400);
      });
    }
  });
});


