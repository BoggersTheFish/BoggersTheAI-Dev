import type { Metadata } from "next";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Talk to TS-OS: concept decomposition, living-graph retrieval, wave exploration, and local LLM synthesis.",
};

export default function ChatPage() {
  return <ChatWorkspace />;
}
