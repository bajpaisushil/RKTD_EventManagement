"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const TempleCanvas = dynamic(() => import("./TempleCanvas"), { ssr: false });

function Glow() {
  return <div aria-hidden="true" className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(209,172,62,0.32),transparent_68%)] blur-2xl" />;
}

// Loaded after the page, paused when scrolled out of view, and still (no spinning,
// no sparkles) for anyone who prefers reduced motion. Touch screens get no drag-to-rotate,
// so swiping over it still scrolls the page.
export function TempleVisual() {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [settings, setSettings] = useState({ reducedMotion: true, finePointer: false });

  useEffect(() => {
    setSettings({
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      finePointer: window.matchMedia("(pointer: fine)").matches,
    });
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="absolute inset-0">
      <Glow />
      <div aria-hidden="true" className="absolute inset-0">
        <TempleCanvas animate={visible && !settings.reducedMotion} interactive={settings.finePointer} />
      </div>
      <p className="sr-only">An illustration of a temple with a tall golden-tipped tower, lit by oil lamps under a full moon.</p>
    </div>
  );
}
