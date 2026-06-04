"use client";

import { useState } from "react";
import { getPageImages } from "@/lib/kahl-assets";

type KahlImageScatterProps = {
  page: string;
  count?: number;
  variant?: "compact" | "wide";
};

export function KahlImageScatter({ page, count = 4, variant = "wide" }: KahlImageScatterProps) {
  const [expanded, setExpanded] = useState(false);
  const images = getPageImages(page, count);
  const visibleImages = expanded ? images : images.slice(0, 1);

  return (
    <section className={`imageScatter ${variant}${expanded ? " expanded" : " collapsed"}`} aria-label="Galería Copa Kahl">
      {visibleImages.map((src, index) => (
        <button
          className="kahlPhoto"
          key={`${page}-${src}`}
          onClick={() => setExpanded((current) => !current)}
          type="button"
          data-tilt={index % 4}
          aria-expanded={expanded}
          aria-label={expanded ? "Ocultar fotos" : "Ver todas las fotos"}
        >
          <img src={src} alt="" loading="lazy" />
        </button>
      ))}
    </section>
  );
}
