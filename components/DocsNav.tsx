"use client";

import { useEffect } from "react";

export function DocsNav() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll(".doc-sec")) as HTMLElement[];
    const anchors = Array.from(document.querySelectorAll('.docs-nav a[href^="#"]')) as HTMLAnchorElement[];

    const spySet = (id: string) => {
      anchors.forEach((a) => {
        const p = a.parentNode as HTMLElement | null;
        p?.classList.toggle("is-active", a.getAttribute("href")?.slice(1) === id);
      });
    };

    if (sections.length) spySet(sections[0].id);

    let spy: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window && sections.length) {
      spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) spySet(en.target.id);
          });
        },
        { rootMargin: "-15% 0px -70% 0px" }
      );
      sections.forEach((s) => spy!.observe(s));
    }

    const dnb = document.getElementById("docs-nav-btn") as HTMLButtonElement | null;
    if (dnb) {
      const dn = document.querySelector(".docs-nav");
      const list = document.getElementById("docs-nav-list");
      const onOpen = () => {
        const o = dn?.classList.toggle("is-open");
        dnb.setAttribute("aria-expanded", o ? "true" : "false");
      };
      dnb.addEventListener("click", onOpen);
      const onList = (e: Event) => {
        if ((e.target as Element).closest("a")) {
          dn?.classList.remove("is-open");
          dnb.setAttribute("aria-expanded", "false");
        }
      };
      list?.addEventListener("click", onList);
      return () => {
        dnb.removeEventListener("click", onOpen);
        list?.removeEventListener("click", onList);
        spy?.disconnect();
      };
    }

    return () => spy?.disconnect();
  }, []);

  return null;
}