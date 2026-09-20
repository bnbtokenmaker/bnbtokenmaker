"use client";

import { useEffect } from "react";

export function FaqFilter() {
  useEffect(() => {
    const input = document.getElementById("faq-search") as HTMLInputElement | null;
    const items = Array.from(document.querySelectorAll(".faq-item")) as HTMLElement[];
    const cats = Array.from(document.querySelectorAll(".faq-cat")) as HTMLElement[];
    const meta = document.getElementById("faq-meta");
    const noResults = document.getElementById("no-results");

    if (!input) return;

    const filter = () => {
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      items.forEach((it) => {
        const show = !q || it.textContent!.toLowerCase().indexOf(q) !== -1;
        it.classList.toggle("is-hidden", !show);
        if (show) visible++;
      });
      cats.forEach((c) => {
        c.classList.toggle(
          "is-empty",
          c.querySelectorAll(".faq-item:not(.is-hidden)").length === 0
        );
      });
      if (meta) {
        meta.textContent = q
          ? `Showing ${visible} of ${items.length} questions`
          : `Showing all ${items.length} questions`;
      }
      noResults?.classList.toggle("is-show", visible === 0);
    };

    input.addEventListener("input", filter);
    if (meta) meta.textContent = `Showing all ${items.length} questions`;
    return () => input.removeEventListener("input", filter);
  }, []);

  return null;
}