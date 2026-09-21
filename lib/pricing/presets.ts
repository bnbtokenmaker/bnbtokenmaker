import { PAID_FEATURES } from "./features";
import type { PaidFeatureId } from "./types";

export type FeatureSelection = Record<PaidFeatureId, boolean>;

export type PresetId = "standard" | "mintable" | "community" | "custom";

export const DEFAULT_FEAT_SELECTION: FeatureSelection = {
  burn: false,
  mint: false,
  pause: false,
  maxTx: false,
  maxWallet: false,
  blacklist: false,
  whitelist: false,
};

export const PRESETS: Record<PresetId, FeatureSelection> = {
  standard: { ...DEFAULT_FEAT_SELECTION },
  mintable: { ...DEFAULT_FEAT_SELECTION, mint: true },
  community: { ...DEFAULT_FEAT_SELECTION, maxTx: true, maxWallet: true },
  custom: { ...DEFAULT_FEAT_SELECTION },
};

export const PRESET_IDS: ReadonlyArray<PresetId> = [
  "standard",
  "mintable",
  "community",
  "custom",
];

export function selectedFeatureIds(selection: FeatureSelection): ReadonlyArray<PaidFeatureId> {
  return PAID_FEATURES.filter((id) => selection[id]);
}

export function presetForSelection(selection: FeatureSelection): PresetId {
  for (const id of PRESET_IDS) {
    if (PAID_FEATURES.every((feature) => PRESETS[id][feature] === selection[feature])) {
      return id;
    }
  }
  return "custom";
}