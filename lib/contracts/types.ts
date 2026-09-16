export type Verdict =
  | "COPY"
  | "DERIVATIVE"
  | "INDEPENDENT"
  | "INSUFFICIENT_EVIDENCE"
  | "";

export type FactorRating = "MATCH" | "PARTIAL" | "DIFFERENT";

export const FACTOR_KEYS = [
  "composition",
  "distinctive_elements",
  "text_and_typography",
  "subject_matter",
] as const;

export type FactorKey = (typeof FACTOR_KEYS)[number];

export const FACTOR_LABELS: Record<FactorKey, string> = {
  composition: "Composition",
  distinctive_elements: "Distinctive elements",
  text_and_typography: "Text & typography",
  subject_matter: "Subject matter",
};

export const FACTOR_QUESTIONS: Record<FactorKey, string> = {
  composition: "Is the arrangement of elements the same?",
  distinctive_elements: "Are there signature details that would not coincide by chance?",
  text_and_typography: "Is the wording or lettering treatment reused?",
  subject_matter: "Does the artwork depict the same thing?",
};

export interface Design {
  id: string;
  owner: string;
  title: string;
  category: string;
  description: string;
  image_url: string;
  registered_at: string;
  bounty_atto: string;
  claims_filed: number;
  copies_confirmed: number;
  is_open: boolean;
}

export interface Claim {
  id: string;
  design_id: string;
  reporter: string;
  evidence_url: string;
  status: "PENDING" | "RESOLVED";
  verdict: Verdict;
  score: number;
  max_score: number;
  listing_title: string;
  listing_seller: string;
  listing_price: string;
  marketplace: string;
  factors: Partial<Record<FactorKey, FactorRating>>;
  generic_trope: string;
  rationale: string;
  stake_atto: string;
  payout_atto: string;
  filed_at: string;
  resolved_at: string;
}

export interface Stats {
  designs: number;
  claims: number;
  copies_confirmed: number;
  total_bounty_atto: string;
  total_paid_atto: string;
  min_stake_atto: string;
  owner: string;
}

export interface Rubric {
  factor_weights: Record<string, Record<string, number>>;
  generic_trope_penalty: number;
  max_score: number;
  thresholds: { COPY: number; DERIVATIVE: number };
  payout_bps: Record<string, number>;
  admissible_evidence: string[];
}

export interface ReporterStats {
  filed: number;
  upheld: number;
  credit_atto: string;
}
