"use client";

import Link from "next/link";
import { use } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { EvidencePack } from "@/components/EvidencePack";

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <Nav />
      <main className="shell pt-32 pb-24">
        <Link href="/#docket" className="label link-underline no-print">
          ← Back to the docket
        </Link>
        <EvidencePack claimId={decodeURIComponent(id)} />
      </main>
      <Footer />
    </>
  );
}
