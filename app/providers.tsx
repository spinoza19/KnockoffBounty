"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { WalletProvider } from "@/lib/genlayer/WalletProvider";
import { ThemeProvider } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 4000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WalletProvider>{children}</WalletProvider>
        <Toaster
          position="bottom-right"
          richColors={false}
          closeButton
          toastOptions={{
            style: {
              background: "var(--bg-sunken)",
              border: "1px solid var(--line-strong)",
              color: "var(--fg)",
              borderRadius: 0,
              fontFamily: "var(--font-mono-stack), monospace",
              fontSize: "12px",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
