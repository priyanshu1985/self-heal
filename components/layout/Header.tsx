"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
          {/* Original SpinneretGlyph circuit-web icon */}
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
          <span
            style={{
              fontSize: "0.6875rem",
              padding: "0.125rem 0.5rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(224, 33, 47, 0.12)",
              color: "var(--accent-primary)",
              border: "1px solid rgba(224, 33, 47, 0.25)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Bright Data Scraper Studio
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "0.25rem" }}>
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname?.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={isActive ? "header-nav-active" : ""}
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  padding: "0.5rem 0.875rem",
                  borderRadius: "6px",
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  backgroundColor: isActive
                    ? "rgba(224, 33, 47, 0.08)"
                    : "transparent",
                  transition: "all 0.15s ease",
                  display: "block",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

