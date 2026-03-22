export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-6rem)] pt-16 pb-8">{children}</div>
  );
}
