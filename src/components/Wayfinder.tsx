import { useEffect, useState } from "react";
import { motion, useScroll } from "framer-motion";

export default function Wayfinder() {
  const { scrollYProgress } = useScroll();
  const [percent, setPercent] = useState(0);
  const [sections, setSections] = useState<string[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      setPercent(Math.round(v * 100));
    });
    return unsub;
  }, [scrollYProgress]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-wayfinder]"));
    setSections(nodes.map((n) => n.dataset.wayfinder ?? ""));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const label = (visible.target as HTMLElement).dataset.wayfinder ?? "";
          setActive(label);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  function jumpTo(label: string) {
    const el = document.querySelector<HTMLElement>(`[data-wayfinder="${label}"]`);
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }

  return (
    <nav className="wayfinder" aria-label="Page progress">
      <motion.div
        className="wayfinder__rail"
        style={{ scaleX: scrollYProgress }}
        aria-hidden="true"
      />
      <div className="wayfinder__inner container">
        <ol className="wayfinder__sections">
          {sections.map((label) => (
            <li key={label}>
              <button
                type="button"
                className="wayfinder__section-btn font-mono-label truncate"
                data-active={label === active}
                onClick={() => jumpTo(label)}
                aria-current={label === active ? "true" : undefined}
              >
                {label}
              </button>
            </li>
          ))}
        </ol>
        <span
          className="wayfinder__percent font-mono-label hidden sm:inline-block"
          aria-live="polite"
        >
          {String(percent).padStart(2, "0")}%
        </span>
      </div>
    </nav>
  );
}
