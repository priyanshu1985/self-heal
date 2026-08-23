"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(10, 13, 20, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
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
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.875rem",
              color: "#fff",
              fontWeight: 800,
              boxShadow: "0 0 12px rgba(99, 102, 241, 0.5)",
            }}
          >
            ⚡
          </span>
          <span>SelfHeal</span>
          <span
            style={{
              fontSize: "0.6875rem",
              padding: "0.125rem 0.5rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Bright Data Scraper Studio
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname?.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  padding: "0.5rem 0.875rem",
                  borderRadius: "6px",
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  backgroundColor: isActive
                    ? "rgba(255, 255, 255, 0.08)"
                    : "transparent",
                  transition: "all 0.15s ease",
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
