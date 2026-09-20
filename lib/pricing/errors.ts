export type PricingErrorCode =
  | "unknown-feature"
  | "duplicate-feature"
  | "included-feature-selected"
  | "coming-soon-feature-selected"
  | "incompatible-features"
  | "invalid-bnb-amount"
  | "negative-bnb-amount"
  | "too-many-decimals"
  | "negative-fee"
  | "unknown-feature-fee"
  | "missing-feature-fee"
  | "invalid-config-version"
  | "invalid-config"
  | "invalid-campaign";

export class PricingError extends Error {
  public readonly code: PricingErrorCode;
  public readonly feature?: string;

  constructor(code: PricingErrorCode, message?: string, feature?: string) {
    super(message ?? code);
    this.name = "PricingError";
    this.code = code;
    this.feature = feature;
  }
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ReadonlyArray<PricingError> };