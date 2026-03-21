import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — BoggersTheFish",
  description:
    "From Minecraft OG Network base-builder to cognitive OS engineer — the story behind TS and BoggersTheAI.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
