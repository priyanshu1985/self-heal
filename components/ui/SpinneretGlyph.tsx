"use client";

import React from "react";

interface SpinneretGlyphProps {
  size?: number;
  className?: string;
  glowing?: boolean;
}

/**
 * SpinneretGlyph — Original circuit-web icon.
 * 8-spoke radial design with perpendicular "tap" lines on each spoke,
 * reading as a printed-circuit spinneret / web geometry.
 * No Marvel or Spider-Man imagery — purely original SVG paths.
 */
export const SpinneretGlyph: React.FC<SpinneretGlyphProps> = ({
  size = 28,
  className = "",
  glowing = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{
        filter: glowing
          ? "drop-shadow(0 0 6px rgba(224, 33, 47, 0.8)) drop-shadow(0 0 3px rgba(59, 111, 245, 0.6))"
          : undefined,
      }}
    >
      {/* Center hub dot */}
      <circle cx="16" cy="16" r="2.5" fill="#e0212f" />

      {/* Outer ring */}
      <circle cx="16" cy="16" r="12" stroke="rgba(59,111,245,0.35)" strokeWidth="0.75" fill="none" />
      <circle cx="16" cy="16" r="7" stroke="rgba(59,111,245,0.25)" strokeWidth="0.5" fill="none" />

      {/* 8 spokes — alternating red/blue */}
      {/* Spoke 0: 12 o'clock */}
      <line x1="16" y1="13.5" x2="16" y2="4" stroke="#e0212f" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="14" y1="8.5" x2="18" y2="8.5" stroke="#e0212f" strokeWidth="0.75" strokeLinecap="round" />

      {/* Spoke 1: 1:30 */}
      <line x1="17.95" y1="14.05" x2="24.95" y2="7.05" stroke="#3b6ff5" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="22.48" y1="8.52" x2="24.42" y2="10.47" stroke="#3b6ff5" strokeWidth="0.75" strokeLinecap="round" />

      {/* Spoke 2: 3 o'clock */}
      <line x1="18.5" y1="16" x2="28" y2="16" stroke="#e0212f" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="23.5" y1="14" x2="23.5" y2="18" stroke="#e0212f" strokeWidth="0.75" strokeLinecap="round" />

      {/* Spoke 3: 4:30 */}
      <line x1="17.95" y1="17.95" x2="24.95" y2="24.95" stroke="#3b6ff5" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="22.48" y1="23.48" x2="24.42" y2="21.53" stroke="#3b6ff5" strokeWidth="0.75" strokeLinecap="round" />

      {/* Spoke 4: 6 o'clock */}
      <line x1="16" y1="18.5" x2="16" y2="28" stroke="#e0212f" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="14" y1="23.5" x2="18" y2="23.5" stroke="#e0212f" strokeWidth="0.75" strokeLinecap="round" />

      {/* Spoke 5: 7:30 */}
      <line x1="14.05" y1="17.95" x2="7.05" y2="24.95" stroke="#3b6ff5" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="9.52" y1="23.48" x2="7.58" y2="21.53" stroke="#3b6ff5" strokeWidth="0.75" strokeLinecap="round" />

      {/* Spoke 6: 9 o'clock */}
      <line x1="13.5" y1="16" x2="4" y2="16" stroke="#e0212f" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="8.5" y1="14" x2="8.5" y2="18" stroke="#e0212f" strokeWidth="0.75" strokeLinecap="round" />

      {/* Spoke 7: 10:30 */}
      <line x1="14.05" y1="14.05" x2="7.05" y2="7.05" stroke="#3b6ff5" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="9.52" y1="8.52" x2="7.58" y2="10.47" stroke="#3b6ff5" strokeWidth="0.75" strokeLinecap="round" />
    </svg>
  );
};
