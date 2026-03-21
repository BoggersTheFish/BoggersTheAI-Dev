import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Network — BoggersTheFish",
  description:
    "The full social and project network graph — GitHub, YouTube, Instagram, Threads, X, Chess.com, Minecraft and all repos.",
};

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
