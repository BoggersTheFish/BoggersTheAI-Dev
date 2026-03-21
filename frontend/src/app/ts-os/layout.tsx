import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TS-OS Architecture — BoggersTheFish",
  description:
    "The complete TS-OS architecture: UniversalLivingGraph, WaveCycleRunner, self-improvement loop, multimodal stack, and observability.",
};

export default function TSOSLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
