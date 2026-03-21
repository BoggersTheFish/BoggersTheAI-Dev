import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lab — BoggersTheFish",
  description:
    "Run BoggersTheAI locally in 5 steps. Try the live wave-cycle simulator and push activation to the graph.",
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
