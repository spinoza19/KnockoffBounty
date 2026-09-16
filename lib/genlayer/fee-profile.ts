import type { FeeSuggestions } from "@genlayer/transaction-kit";

/**
 * Allocations measured against the deployed contract on Studio Next
 * (see scripts/seed.mjs runs). The network default profile is sized for a plain
 * state write; `adjudicate` renders a web page and prompts a model on the
 * leader AND on every validator, and with the default allocation the validators
 * time out before they can vote. A timed-out round leaves the claim PENDING
 * rather than corrupting it, but it wastes the user's fee, so the panel is
 * seeded with the real numbers instead.
 */
export const FEE_PROFILE: FeeSuggestions = {
  version: 1,
  chainId: 61997,
  network: "GenLayer Studio Next",
  measuredAt: "2026-09-16",
  deploy: {
    leaderTimeunitsAllocation: 200,
    validatorTimeunitsAllocation: 300,
    executionBudgetPerRound: "100000000000000000",
  },
  methods: {
    adjudicate: {
      leaderTimeunitsAllocation: 600,
      validatorTimeunitsAllocation: 600,
      executionBudgetPerRound: "1000000000000000000",
      rotationsPerRound: 3,
    },
    register_design: {
      leaderTimeunitsAllocation: 150,
      validatorTimeunitsAllocation: 250,
      executionBudgetPerRound: "60000000000000000",
    },
    file_claim: {
      leaderTimeunitsAllocation: 150,
      validatorTimeunitsAllocation: 250,
      executionBudgetPerRound: "60000000000000000",
    },
    fund_design: {
      leaderTimeunitsAllocation: 120,
      validatorTimeunitsAllocation: 220,
      executionBudgetPerRound: "50000000000000000",
    },
    withdraw: {
      leaderTimeunitsAllocation: 120,
      validatorTimeunitsAllocation: 220,
      executionBudgetPerRound: "50000000000000000",
    },
    close_design: {
      leaderTimeunitsAllocation: 120,
      validatorTimeunitsAllocation: 220,
      executionBudgetPerRound: "50000000000000000",
    },
  },
};
