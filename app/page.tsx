"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";
import { FaucetBar } from "@/components/FaucetBar";
import { Footer } from "@/components/Footer";
import { Marquee } from "@/components/Marquee";
import { Preloader } from "@/components/Preloader";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Registry } from "@/components/sections/Registry";
import { Docket } from "@/components/sections/Docket";
import { Rubric } from "@/components/sections/Rubric";
import { Payout } from "@/components/sections/Payout";
import { useLenis } from "@/lib/motion";

const MARQUEE = [
  "Register the work",
  "Stake the bounty",
  "Freeze the evidence",
  "Let the jury rule",
  "Take the receipt",
];

export default function Home() {
  const [ready, setReady] = useState(false);
  useLenis();

  return (
    <>
      <Preloader onDone={() => setReady(true)} />
      <Nav />
      <main>
        <Hero ready={ready} />
        <FaucetBar />
        <Marquee items={MARQUEE} />
        <Problem />
        <Marquee items={["Copy", "Derivative", "Independent", "Insufficient evidence"]} reverse speed={34} />
        <Registry />
        <Docket />
        <Payout />
        <Rubric />
      </main>
      <Footer />
    </>
  );
}
