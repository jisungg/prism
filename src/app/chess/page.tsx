import { ChessboardDemo } from "@/components/chessboard-demo";

// Temporary non-protected route for building the chessboard in isolation.
export default function ChessPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] px-8 py-8 text-[var(--color-ink)] lg:px-12 lg:py-10">
      <ChessboardDemo />
    </main>
  );
}
