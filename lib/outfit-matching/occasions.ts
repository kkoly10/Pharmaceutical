import { FORMALITY, type Occasion } from "./types.ts";

export interface OccasionRule {
  minFormality: number;
  maxFormality: number;
  allowDress: boolean;
  allowOuterwear: boolean;
  allowAccessory: boolean;
}

export const OCCASION_RULES: Record<Occasion, OccasionRule> = {
  work: {
    minFormality: FORMALITY.SMART_CASUAL,
    maxFormality: FORMALITY.BUSINESS,
    allowDress: true,
    allowOuterwear: true,
    allowAccessory: true,
  },
  casual: {
    minFormality: FORMALITY.ATHLETIC,
    maxFormality: FORMALITY.SMART_CASUAL,
    allowDress: true,
    allowOuterwear: true,
    allowAccessory: true,
  },
  date_night: {
    minFormality: FORMALITY.SMART_CASUAL,
    maxFormality: FORMALITY.FORMAL,
    allowDress: true,
    allowOuterwear: true,
    allowAccessory: true,
  },
  formal: {
    minFormality: FORMALITY.BUSINESS,
    maxFormality: FORMALITY.FORMAL,
    allowDress: true,
    allowOuterwear: true,
    allowAccessory: true,
  },
  workout: {
    minFormality: FORMALITY.ATHLETIC,
    maxFormality: FORMALITY.ATHLETIC,
    allowDress: false,
    allowOuterwear: true,
    allowAccessory: false,
  },
  travel: {
    minFormality: FORMALITY.ATHLETIC,
    maxFormality: FORMALITY.SMART_CASUAL,
    allowDress: true,
    allowOuterwear: true,
    allowAccessory: false,
  },
};
