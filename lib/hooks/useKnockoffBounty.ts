"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import KnockoffBounty from "../contracts/KnockoffBounty";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import type { Claim, Design, ReporterStats, Rubric, Stats } from "../contracts/types";

export function useContract(): KnockoffBounty | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();

  return useMemo(() => {
    if (!contractAddress) return null;
    return new KnockoffBounty(contractAddress, address);
  }, [contractAddress, address]);
}

const SHARED = { refetchOnWindowFocus: true, staleTime: 4000 } as const;

export function useDesigns() {
  const contract = useContract();
  return useQuery<Design[], Error>({
    queryKey: ["designs"],
    queryFn: () => contract!.getDesigns(),
    enabled: !!contract,
    ...SHARED,
  });
}

export function useClaims() {
  const contract = useContract();
  return useQuery<Claim[], Error>({
    queryKey: ["claims"],
    queryFn: () => contract!.getClaims(),
    enabled: !!contract,
    ...SHARED,
  });
}

export function useClaim(id: string | null) {
  const contract = useContract();
  return useQuery<Claim, Error>({
    queryKey: ["claim", id],
    queryFn: () => contract!.getClaim(id!),
    enabled: !!contract && !!id,
    ...SHARED,
  });
}

export function useStats() {
  const contract = useContract();
  return useQuery<Stats, Error>({
    queryKey: ["stats"],
    queryFn: () => contract!.getStats(),
    enabled: !!contract,
    ...SHARED,
  });
}

export function useRubric() {
  const contract = useContract();
  return useQuery<Rubric, Error>({
    queryKey: ["rubric"],
    queryFn: () => contract!.getRubric(),
    enabled: !!contract,
    staleTime: Infinity,
  });
}

export function useReporterStats(account: string | null) {
  const contract = useContract();
  return useQuery<ReporterStats, Error>({
    queryKey: ["reporter", account],
    queryFn: () => contract!.getReporterStats(account!),
    enabled: !!contract && !!account,
    ...SHARED,
  });
}

export function useRefreshAll() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    for (const key of ["designs", "claims", "claim", "stats", "reporter"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);
}
