// fade.js
window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("fade-in");

  document.querySelectorAll("a[href]").forEach(link => {
    // only apply to internal links
    if (link.hostname === location.hostname && !link.target) {
      link.addEventListener("click", e => {
        e.preventDefault();
        const href = link.href;

        document.body.classList.remove("fade-in");
        document.body.classList.add("fade-out");

        setTimeout(() => {
          window.location.href = href;
        }, 400); // matches the transition duration
      });
    }
  });
});


