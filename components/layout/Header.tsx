"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { SpinneretGlyph } from "@/components/ui/SpinneretGlyph";

export const Header: React.FC = () => {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Collectors" },
    { href: "/timeline", label: "Drift Timeline" },
    { href: "/output", label: "Structured Output" },
  ];

  return (
    <header
      style={{
        borderBottom: "1px solid rgba(224, 33, 47, 0.12)",
        background: "rgba(5, 7, 13, 0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 1px 0 0 rgba(59, 111, 245, 0.08)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "4rem",
        }}
      >
        {/* Brand Logo & Title */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontWeight: 700,
            fontSize: "1.25rem",
            letterSpacing: "-0.02em",
          }}
        >
          <span
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, rgba(224,33,47,0.15), rgba(59,111,245,0.15))",
              border: "1px solid rgba(224,33,47,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="spinneret-glow"
          >
            <SpinneretGlyph size={22} glowing />
          </span>
          <span>SelfHeal</span>
          <span className="header-badge-tag">
            Bright Data Scraper Studio
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "0.25rem", overflowX: "auto", maxWidth: "100%" }}>
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname?.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  fontWeight: isActive ? 600 : 500,
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  backgroundColor: "transparent",
                  transition: "color 0.15s ease",
                  display: "block",
                  position: "relative",
                  whiteSpace: "nowrap",
                }}
              >
                {link.label}

                {/* Animated thread underline — shared layoutId means framer-motion
                    slides it from old active → new active automatically */}
                {isActive && (
                  <motion.span
                    layoutId="nav-thread"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 38,
                      mass: 0.5,
                    }}
                    style={{
                      position: "absolute",
                      bottom: "2px",
                      left: "0.5rem",
                      right: "0.5rem",
                      height: "2px",
                      borderRadius: "2px",
                      background: "var(--accent-primary)",
                      boxShadow: "0 0 8px var(--accent-primary), 0 0 3px var(--accent-primary)",
                      transformOrigin: "left center",
                      display: "block",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
