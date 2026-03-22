export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-5rem)] pt-[4.75rem] sm:pt-20 pb-6">{children}</div>
  );
}
