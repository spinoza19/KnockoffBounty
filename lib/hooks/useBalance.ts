"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { createClient } from "genlayer-js";
import { GENLAYER_CHAIN } from "../genlayer/network";

const client = () => createClient({ chain: GENLAYER_CHAIN });

export function useBalance(address: string | null) {
  return useQuery<bigint, Error>({
    queryKey: ["balance", address],
    queryFn: async () => {
      const value = await client().getBalance({ address: address as `0x${string}` });
      return BigInt(value ?? 0);
    },
    enabled: !!address,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
}

/**
 * Studio Next exposes a faucet RPC. Without it a visitor arrives with an empty
 * wallet and cannot even pay the fee to look around, so the app offers it
 * directly rather than sending people off to find one.
 *
 * The amount must be a decimal string in wei: a JS number large enough to be
 * useful loses precision and serialises in exponent form, which the node
 * rejects outright.
 */
export function useFaucet(address: string | null) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const fund = useCallback(
    async (gen = 50n) => {
      if (!address) throw new Error("Connect a wallet first");
      setPending(true);
      try {
        await client().request({
          method: "sim_fundAccount" as any,
          params: [address, (gen * 10n ** 18n).toString()] as any,
        });
        // The faucet transaction needs a moment to land before the balance moves.
        for (let i = 0; i < 12; i += 1) {
          await new Promise((r) => setTimeout(r, 1500));
          const value = BigInt(
            (await client().getBalance({ address: address as `0x${string}` })) ?? 0,
          );
          if (value > 0n) break;
        }
        queryClient.invalidateQueries({ queryKey: ["balance", address] });
      } finally {
        setPending(false);
      }
    },
    [address, queryClient],
  );

  return { fund, pending };
}
