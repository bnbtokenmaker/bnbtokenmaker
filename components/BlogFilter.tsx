"use client";

import { useEffect } from "react";

export function BlogFilter() {
  useEffect(() => {
    const buttons = Array.from(document.querySelectorAll(".blog-filters button")) as HTMLButtonElement[];
    const cards = Array.from(document.querySelectorAll("#blog-grid .blg-card")) as HTMLElement[];
    const search = document.getElementById("blg-search") as HTMLInputElement | null;
    const meta = document.getElementById("blg-meta");
    const empty = document.getElementById("blg-empty");

    let cur = "all";

    const applyFilter = () => {
      const q = (search?.value || "").trim().toLowerCase();
      let vis = 0;
      cards.forEach((c) => {
        const okCat = cur === "all" || c.getAttribute("data-cat") === cur;
        const hay = (c.textContent || "").toLowerCase();
        const okQ = !q || hay.indexOf(q) !== -1;
        const show = okCat && okQ;
        c.classList.toggle("is-hidden", !show);
        if (show) vis++;
      });
      empty?.classList.toggle("is-show", vis === 0);
      if (meta) meta.textContent = `Showing ${vis} of ${cards.length} articles`;
    };

    const onButton = (e: Event) => {
      const b = e.currentTarget as HTMLButtonElement;
      buttons.forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      cur = b.getAttribute("data-filter") || "all";
      applyFilter();
    };

    buttons.forEach((b) => b.addEventListener("click", onButton));
    search?.addEventListener("input", applyFilter);
    applyFilter();

    return () => {
      buttons.forEach((b) => b.removeEventListener("click", onButton));
      search?.removeEventListener("input", applyFilter);
    };
  }, []);

  return null;
}