"use client";

import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { SUPPLY_DIGITS_MAX, formatSupplyInput } from "../lib/draft";

type UseSupplyFieldOptions = {
  value: string;
  setValue: (next: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

export function useSupplyField({ value, setValue, inputRef }: UseSupplyFieldOptions) {
  const caretRef = useRef<number | null>(null);

  function handleChange(raw: string) {
    const el = inputRef.current;
    const cursor = el ? el.selectionStart ?? raw.length : raw.length;
    const digitsBefore = raw.slice(0, cursor).replace(/\D/g, "").slice(0, SUPPLY_DIGITS_MAX);
    const next = formatSupplyInput(raw);
    setValue(next);
    let pos = 0;
    let seen = 0;
    while (pos < next.length && seen < digitsBefore.length) {
      if (next[pos] !== ",") seen += 1;
      pos += 1;
    }
    caretRef.current = pos;
  }

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && caretRef.current !== null && document.activeElement === el) {
      const at = Math.min(caretRef.current, el.value.length);
      el.setSelectionRange(at, at);
    }
    caretRef.current = null;
  }, [value, inputRef]);

  return { handleChange };
}