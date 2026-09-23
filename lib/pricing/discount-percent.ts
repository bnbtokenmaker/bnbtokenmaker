/**
 * Shared discount-percent formatting (client-safe, no dependencies).
 *
 * Converts integer basis points to a human percent label with unnecessary
 * trailing zeros removed: 1000 -> "10", 1050 -> "10.5", 1225 -> "12.25".
 * Pure integer math — no floats, no toFixed, no locale surprises.
 *
 * Formatting only: basis-point math and stored values are untouched.
 */

export function formatDiscountPercent(basisPoints: number): string {
  if (!Number.isInteger(basisPoints) || basisPoints < 0) {
    throw new Error("basis points must be a non-negative integer");
  }
  const whole = Math.floor(basisPoints / 100);
  const frac = basisPoints % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}
