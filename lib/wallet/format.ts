const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && ADDRESS_PATTERN.test(value);
}

export function shortenAddress(
  address: string | undefined | null,
  leading = 4,
  trailing = 4
): string {
  if (typeof address !== "string" || !ADDRESS_PATTERN.test(address)) {
    return "";
  }
  if (leading < 0 || trailing < 0) return "";
  if (address.length <= leading + trailing + 2) return address;
  return `${address.slice(0, leading + 2)}\u2026${address.slice(
    address.length - trailing
  )}`;
}

export function formatBalance(value: bigint, decimals = 18, maxFraction = 4): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;

  let fractionText = fraction.toString().padStart(decimals, "0").slice(0, maxFraction);
  fractionText = fractionText.replace(/0+$/, "");

  const wholeText = whole.toString();
  return `${negative ? "-" : ""}${wholeText}${fractionText ? `.${fractionText}` : ""}`;
}
