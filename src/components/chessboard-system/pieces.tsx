import type { SVGProps } from "react";
import type { ChessPiece, PieceColor } from "@/components/chessboard-system/types";

function palette(color: PieceColor) {
  return color === "white"
    ? { fill: "#fffdf8", stroke: "#171717" }
    : { fill: "#171717", stroke: "#f5f1e8" };
}

function PieceFrame({
  color,
  children,
  className,
  ...props
}: SVGProps<SVGSVGElement> & {
  color: PieceColor;
}) {
  const colors = palette(color);

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      {...props}
    >
      <g
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}

function KingPiece(props: SVGProps<SVGSVGElement> & { color: PieceColor }) {
  return (
    <PieceFrame {...props}>
      <path d="M50 14v20" />
      <path d="M40 24h20" />
      <path d="M35 42c0-8 7-14 15-14s15 6 15 14c0 5-2 9-5 12 9 5 14 14 14 25H26c0-11 5-20 14-25-3-3-5-7-5-12Z" />
      <path d="M32 79h36" />
      <path d="M28 86h44" />
    </PieceFrame>
  );
}

function QueenPiece(props: SVGProps<SVGSVGElement> & { color: PieceColor }) {
  return (
    <PieceFrame {...props}>
      <circle cx="28" cy="24" r="5" />
      <circle cx="50" cy="18" r="5" />
      <circle cx="72" cy="24" r="5" />
      <path d="M28 32 34 58h32l6-26" />
      <path d="M36 58c0-8 6-14 14-14s14 6 14 14v3H36v-3Z" />
      <path d="M32 79h36" />
      <path d="M28 86h44" />
    </PieceFrame>
  );
}

function RookPiece(props: SVGProps<SVGSVGElement> & { color: PieceColor }) {
  return (
    <PieceFrame {...props}>
      <path d="M30 22h10v10H30z" />
      <path d="M45 22h10v10H45z" />
      <path d="M60 22h10v10H60z" />
      <path d="M34 32h32v14H34z" />
      <path d="M38 46h24v24H38z" />
      <path d="M32 70h36" />
      <path d="M28 86h44" />
    </PieceFrame>
  );
}

function BishopPiece(props: SVGProps<SVGSVGElement> & { color: PieceColor }) {
  return (
    <PieceFrame {...props}>
      <path d="M50 18c7 0 12 5 12 12 0 5-3 10-7 15 5 4 11 11 11 20H34c0-9 6-16 11-20-4-5-7-10-7-15 0-7 5-12 12-12Z" />
      <path d="M46 32 58 20" />
      <path d="M42 79h16" />
      <path d="M30 86h40" />
    </PieceFrame>
  );
}

function KnightPiece(props: SVGProps<SVGSVGElement> & { color: PieceColor }) {
  return (
    <PieceFrame {...props}>
      <path d="M64 30c-8-10-26-8-30 8 8 0 14 2 18 8-8 3-13 10-13 21h30c0-9-2-18-7-24 1-4 2-8 2-13Z" />
      <circle cx="54" cy="35" r="2.5" />
      <path d="M38 67h30" />
      <path d="M30 86h40" />
    </PieceFrame>
  );
}

function PawnPiece(props: SVGProps<SVGSVGElement> & { color: PieceColor }) {
  return (
    <PieceFrame {...props}>
      <circle cx="50" cy="30" r="10" />
      <path d="M36 70c0-12 6-22 14-22s14 10 14 22H36Z" />
      <path d="M40 79h20" />
      <path d="M32 86h36" />
    </PieceFrame>
  );
}

export function DefaultPieceSvg({
  piece,
  className,
}: {
  piece: ChessPiece;
  className?: string;
}) {
  switch (piece.kind) {
    case "king":
      return <KingPiece color={piece.color} className={className} aria-label={`${piece.color} king`} />;
    case "queen":
      return <QueenPiece color={piece.color} className={className} aria-label={`${piece.color} queen`} />;
    case "rook":
      return <RookPiece color={piece.color} className={className} aria-label={`${piece.color} rook`} />;
    case "bishop":
      return <BishopPiece color={piece.color} className={className} aria-label={`${piece.color} bishop`} />;
    case "knight":
      return <KnightPiece color={piece.color} className={className} aria-label={`${piece.color} knight`} />;
    case "pawn":
      return <PawnPiece color={piece.color} className={className} aria-label={`${piece.color} pawn`} />;
    default:
      return null;
  }
}
