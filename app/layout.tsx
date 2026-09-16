import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "@genlayer/transaction-kit-react/styles.css";
import "./globals.css";
import { Providers } from "./providers";
import { Grain } from "@/components/Grain";
import { themeBootScript } from "@/lib/theme";

// Variable fonts: the width axis is what gives the display type its condensed
// poster proportions, and `axes` is only allowed when weight stays variable.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-stack",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KnockoffBounty — a court for stolen designs",
  description:
    "An on-chain design registry and AI-jury counterfeit court on GenLayer. Register prior art, stake a bounty, and let independent validators rule on whether a marketplace listing is a copy.",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
  openGraph: {
    title: "KnockoffBounty",
    description: "A court for stolen designs, settled by decentralised judgment on GenLayer.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#a89474" },
    { media: "(prefers-color-scheme: dark)", color: "#16130f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${archivo.variable} ${mono.variable}`}>
        <Grain />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
