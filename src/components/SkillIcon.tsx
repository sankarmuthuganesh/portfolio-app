import { memo } from "react";
import DOMPurify from "dompurify";

type Props = { icon: string; name: string; className?: string };

export const SkillIcon = memo(function SkillIcon({ icon, name, className = "w-6 h-6" }: Props) {
  const trimmed = icon.trim();
  const isImage = trimmed.startsWith("https://");
  const isSvgMarkup = trimmed.startsWith("<svg");

  if (isImage) {
    return (
      <img
        src={trimmed}
        alt={`${name} icon`}
        className={`${className} object-contain`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (isSvgMarkup) {
    const clean = DOMPurify.sanitize(trimmed, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ["svg", "path", "g", "circle", "rect", "line", "polyline", "polygon", "ellipse", "defs", "clipPath"],
      ADD_ATTR: ["viewBox", "d", "fill", "stroke", "stroke-width", "cx", "cy", "r", "x", "y", "width", "height", "transform", "xmlns"],
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "a"],
      FORBID_ATTR: ["onclick", "onerror", "onload", "onmouseover", "xlink:href", "href"],
    });
    return (
      <span
        className={`${className} inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full`}
        aria-label={`${name} icon`}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return <span className="text-2xl leading-none">{trimmed || "✨"}</span>;
});
