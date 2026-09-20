"use client";

import { useEffect } from "react";

export function HeaderBehavior() {
  useEffect(() => {
    const header = document.getElementById("site-header");
    const toggle = document.getElementById("nav-toggle");
    const links = document.getElementById("nav-links");

    const onScroll = () => {
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toggle && links) {
      const setMenu = (open: boolean) => {
        links.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute(
          "aria-label",
          open ? "Close menu" : "Open menu"
        );
        toggle.innerHTML = open
          ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
        document.body.classList.toggle("menu-open", open);
      };
      toggle.addEventListener("click", () =>
        setMenu(!links.classList.contains("is-open"))
      );
      links.addEventListener("click", (e) => {
        if ((e.target as Element).closest("a") && links.classList.contains("is-open")) {
          setMenu(false);
        }
      });
      document.addEventListener("click", (e) => {
        if (
          links.classList.contains("is-open") &&
          !(e.target as Element).closest(".site-header")
        ) {
          setMenu(false);
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setMenu(false);
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth > 1160) setMenu(false);
      });
    }

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}