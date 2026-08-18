import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";

type Project = {
  title: string;
  status: "Active" | "Archive" | "Maintenance";
  period: string;
  tags: string[];
  desc: string;
  image: string;
  href: string;
};

const PROJECTS: Project[] = [
  {
    title: "Geisha Gains",
    status: "Archive",
    period: "Jan 2026",
    tags: ["Next.js", "TypeScript", "Prisma", "NVIDIA NIM"],
    desc: "AI-powered crypto trading simulator. Won the Uphold-sponsored theme at BugsByte Hackathon 2026.",
    image: "/assets/photos/1771514660259.jpeg",
    href: "https://github.com/rrodrickk/bugsbyte2526",
  },
  {
    title: "solmaneband.github.io",
    status: "Active",
    period: "2025 - now",
    tags: ["HTML", "CSS", "JS"],
    desc: "Official website for Solmåne, the alt-rock band I co-founded, design, build, and content.",
    image: "/assets/photos/solmanebanner.jpeg",
    href: "https://solmaneband.github.io",
  },
  {
    title: "dotfiles",
    status: "Maintenance",
    period: "2025",
    tags: ["Shell", "Sway", "Waybar"],
    desc: "My Arch Linux + Sway environment, scripted setup for a streamlined daily workflow.",
    image: "/assets/photos/dotfiles-preview.jpg",
    href: "https://github.com/rrodrickk/dotfiles",
  },
  {
    title: "Empire Rush",
    status: "Archive",
    period: "2024",
    tags: ["Haskell", "Gloss"],
    desc: "A strategy game written in Haskell for my first-year Functional Programming course.",
    image: "/assets/photos/empire-rush-loadscreen.jpg",
    href: "https://github.com/rrodrickk/Empire_Rush-projeto-li12425",
  },
];

const STATUS_LABEL: Record<Project["status"], string> = {
  Active: "Active",
  Archive: "Archive",
  Maintenance: "Maint.",
};

export default function ProjectGallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const n = PROJECTS.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  const rawIndex = useTransform(scrollYProgress, [0, 1], [0, n - 1]);

  useMotionValueEvent(rawIndex, "change", (v) => {
    const clamped = Math.min(n - 1, Math.max(0, Math.round(v)));
    setActive((prev) => (prev === clamped ? prev : clamped));
  });

  function jumpTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const trackTop = rect.top + window.scrollY;
    const trackHeight = track.offsetHeight;
    const fraction = index / (n - 1 || 1);
    const target = trackTop + fraction * (trackHeight - window.innerHeight);
    window.scrollTo({ top: target, behavior: reducedMotion ? "auto" : "smooth" });
  }

  return (
    <section id="work" className="gallery container" data-wayfinder="Work">
      <div ref={trackRef} className="gallery__track" style={{ height: `${n * 100}vh` }}>
        <div className="gallery__sticky">
          <h2 className="gallery__heading">Things I've shipped.</h2>

          <div className="gallery__sticky-body">
            <div className="gallery__panel gallery__panel--text">
              {PROJECTS.map((p, i) => (
                <div
                  key={p.title}
                  className="gallery__text-item"
                  style={{ opacity: i === active ? 1 : 0, pointerEvents: i === active ? "auto" : "none" }}
                >
                  <span className="gallery__status font-mono-label" data-status={p.status}>
                    {STATUS_LABEL[p.status]} · {p.period}
                  </span>
                  <h3 className="gallery__title">{p.title}</h3>
                  <p className="gallery__desc measure">{p.desc}</p>
                  <ul className="gallery__tags">
                    {p.tags.map((t) => (
                      <li key={t} className="gallery__tag font-mono-label">{t}</li>
                    ))}
                  </ul>
                  <a
                    className="gallery__link"
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View project <span aria-hidden="true">↗</span>
                  </a>
                </div>
              ))}
            </div>

            <div className="gallery__panel gallery__panel--media">
              <div className="bezel gallery__frame">
                <span className="bezel__corner bezel__corner--tl"></span>
                <span className="bezel__corner bezel__corner--tr"></span>
                <span className="bezel__corner bezel__corner--bl"></span>
                <span className="bezel__corner bezel__corner--br"></span>
                {PROJECTS.map((p, i) => (
                  <motion.img
                    key={p.title}
                    src={p.image}
                    alt={p.title}
                    className="gallery__image"
                    animate={{ opacity: i === active ? 1 : 0 }}
                    transition={{ duration: reducedMotion ? 0.05 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                ))}
                <span className="gallery__frame-label font-mono-label">
                  {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                </span>
              </div>

              <div className="gallery__progress" role="tablist" aria-label="Projects">
                {PROJECTS.map((p, i) => (
                  <button
                    key={p.title}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-label={`Jump to ${p.title}`}
                    className="gallery__bar"
                    onClick={() => jumpTo(i)}
                  >
                    <span
                      className="gallery__bar-fill"
                      style={{ transform: i <= active ? "scaleX(1)" : "scaleX(0)" }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
