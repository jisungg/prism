"use client";

import { startTransition, useMemo, useState } from "react";
import {
  Chessboard,
  START_POSITION_FEN,
  normalizePositionInput,
  oppositeColor,
} from "@/components/chessboard";
import type {
  BoardOrientation,
  BoardPosition,
  ChessMove,
  ChessPieceRendererProps,
  SquareName,
} from "@/components/chessboard";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

function shiftSquare(square: SquareName, fileOffset: number, rankOffset: number) {
  const fileIndex = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rankIndex = RANKS.indexOf(square[1] as (typeof RANKS)[number]);
  const nextFile = FILES[fileIndex + fileOffset];
  const nextRank = RANKS[rankIndex + rankOffset];

  if (!nextFile || !nextRank) {
    return null;
  }

  return `${nextFile}${nextRank}` as SquareName;
}

function collectSlidingTargets(
  position: BoardPosition,
  square: SquareName,
  color: "white" | "black",
  directions: Array<[number, number]>,
) {
  const targets: SquareName[] = [];

  for (const [fileOffset, rankOffset] of directions) {
    let cursor = shiftSquare(square, fileOffset, rankOffset);

    while (cursor) {
      const occupant = position[cursor];

      if (!occupant) {
        targets.push(cursor);
        cursor = shiftSquare(cursor, fileOffset, rankOffset);
        continue;
      }

      if (occupant.color !== color) {
        targets.push(cursor);
      }

      break;
    }
  }

  return targets;
}

function getDemoTargets(position: BoardPosition, square: SquareName) {
  const piece = position[square];

  if (!piece) {
    return [];
  }

  if (piece.kind === "pawn") {
    const direction = piece.color === "white" ? 1 : -1;
    const oneForward = shiftSquare(square, 0, direction);
    const twoForward = shiftSquare(square, 0, direction * 2);
    const captures = [
      shiftSquare(square, -1, direction),
      shiftSquare(square, 1, direction),
    ].filter(Boolean) as SquareName[];
    const targets: SquareName[] = [];

    if (oneForward && !position[oneForward]) {
      targets.push(oneForward);
    }

    const homeRank = piece.color === "white" ? "2" : "7";

    if (
      square[1] === homeRank
      && oneForward
      && !position[oneForward]
      && twoForward
      && !position[twoForward]
    ) {
      targets.push(twoForward);
    }

    captures.forEach((target) => {
      if (position[target] && position[target]?.color !== piece.color) {
        targets.push(target);
      }
    });

    return targets;
  }

  if (piece.kind === "knight") {
    return [
      shiftSquare(square, -2, -1),
      shiftSquare(square, -2, 1),
      shiftSquare(square, -1, -2),
      shiftSquare(square, -1, 2),
      shiftSquare(square, 1, -2),
      shiftSquare(square, 1, 2),
      shiftSquare(square, 2, -1),
      shiftSquare(square, 2, 1),
    ]
      .filter(Boolean)
      .filter((target) => !position[target as SquareName] || position[target as SquareName]?.color !== piece.color) as SquareName[];
  }

  if (piece.kind === "king") {
    return [
      shiftSquare(square, -1, -1),
      shiftSquare(square, 0, -1),
      shiftSquare(square, 1, -1),
      shiftSquare(square, -1, 0),
      shiftSquare(square, 1, 0),
      shiftSquare(square, -1, 1),
      shiftSquare(square, 0, 1),
      shiftSquare(square, 1, 1),
    ]
      .filter(Boolean)
      .filter((target) => !position[target as SquareName] || position[target as SquareName]?.color !== piece.color) as SquareName[];
  }

  if (piece.kind === "bishop") {
    return collectSlidingTargets(position, square, piece.color, [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]);
  }

  if (piece.kind === "rook") {
    return collectSlidingTargets(position, square, piece.color, [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]);
  }

  if (piece.kind === "queen") {
    return collectSlidingTargets(position, square, piece.color, [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]);
  }

  return [];
}

function ToggleButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="text-[0.96rem] font-semibold tracking-[-0.02em] text-[#111114] transition hover:text-black/60"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function CustomPiece({
  color,
  type,
  isDragging,
  isAnimating,
  size,
}: ChessPieceRendererProps) {
  const label = {
    king: "K",
    queen: "Q",
    rook: "R",
    bishop: "B",
    knight: "N",
    pawn: "P",
  }[type];

  return (
    <div
      className={[
        "flex h-full w-full items-center justify-center rounded-[28%] border transition-transform duration-150",
        color === "white"
          ? "border-[#171717] bg-[linear-gradient(180deg,#fffcf6_0%,#f1e8db_100%)] text-[#171717]"
          : "border-[#f5f1e8] bg-[linear-gradient(180deg,#232323_0%,#111114_100%)] text-[#f5f1e8]",
        isDragging ? "scale-[1.05]" : "scale-100",
        isAnimating ? "shadow-[0_10px_24px_rgba(17,17,20,0.16)]" : "shadow-[0_4px_10px_rgba(17,17,20,0.12)]",
      ].join(" ")}
    >
      <span
        className="font-semibold uppercase tracking-[-0.06em]"
        style={{ fontSize: Math.max(18, size * 0.34) }}
      >
        {label}
      </span>
    </div>
  );
}

export function ChessboardDemo() {
  const [position, setPosition] = useState(() => normalizePositionInput(START_POSITION_FEN));
  const [selectedSquare, setSelectedSquare] = useState<SquareName | null>(null);
  const [lastMove, setLastMove] = useState<Pick<ChessMove, "from" | "to"> | null>(null);
  const [orientation, setOrientation] = useState<BoardOrientation>("white");
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [useCustomPieces, setUseCustomPieces] = useState(true);

  const legalMoves = useMemo(() => {
    if (!selectedSquare) {
      return [];
    }

    return getDemoTargets(position, selectedSquare).map((to) => ({
      from: selectedSquare,
      to,
    }));
  }, [position, selectedSquare]);

  return (
    <section className="mx-auto flex max-w-[1240px] flex-col gap-8">
      <header className="flex items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div className="space-y-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Prism
          </p>
          <h1 className="text-[clamp(2.3rem,5vw,4.2rem)] leading-[0.95] tracking-[-0.06em] text-[#0f1014]">
            Prism Board
          </h1>
        </div>

        <div className="flex gap-8">
          <ToggleButton
            label={orientation === "white" ? "Flip" : "Reset View"}
            onClick={() => setOrientation((current) => oppositeColor(current))}
          />
          <ToggleButton
            label={showCoordinates ? "Hide Coords" : "Show Coords"}
            onClick={() => setShowCoordinates((current) => !current)}
          />
          <ToggleButton
            label={useCustomPieces ? "Default Pieces" : "Custom Pieces"}
            onClick={() => setUseCustomPieces((current) => !current)}
          />
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(18rem,0.76fr)_minmax(0,1.24fr)]">
        <div className="space-y-6 border-t border-black/10 pt-6">
          <div className="space-y-2">
            <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Selection</p>
            <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">{selectedSquare ?? "None"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Last move</p>
            <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">
              {lastMove ? `${lastMove.from} -> ${lastMove.to}` : "None"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Control model</p>
            <p className="max-w-[22rem] text-[0.95rem] leading-7 text-[var(--color-muted)]">
              Position, selection, legal targets, and move validation are all owned outside the board.
            </p>
          </div>
        </div>

        <div className="flex min-h-[760px] items-start justify-center">
          <Chessboard
            position={position}
            selectedSquare={selectedSquare}
            onSelectedSquareChange={setSelectedSquare}
            legalMoves={legalMoves}
            lastMove={lastMove}
            canMove={(move) => getDemoTargets(position, move.from).includes(move.to)}
            onMove={({ move, nextPosition }) => {
              startTransition(() => {
                setPosition(nextPosition);
                setLastMove({ from: move.from, to: move.to });
                setSelectedSquare(null);
              });
            }}
            orientation={orientation}
            showCoordinates={showCoordinates}
            size={760}
            animation={{
              enabled: true,
              durationMs: 180,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            renderPiece={useCustomPieces ? (props) => <CustomPiece {...props} /> : undefined}
            theme={{
              boardClassName: "rounded-[1.65rem] border-black/8 bg-[#efe8dc] shadow-[0_28px_80px_rgba(17,17,20,0.10)]",
              gridClassName: "overflow-hidden rounded-[1.5rem]",
              lightSquareClassName: "bg-[#f6efe4]",
              darkSquareClassName: "bg-[#dbcfbc]",
              focusedSquareClassName: "ring-2 ring-inset ring-[#111114]/18",
              selectedSquareClassName: "shadow-[inset_0_0_0_2px_rgba(17,17,20,0.58),inset_0_0_0_999px_rgba(17,17,20,0.03)]",
              previewSquareClassName: "shadow-[inset_0_0_0_2px_rgba(17,17,20,0.18)]",
              lastMoveClassName: "shadow-[inset_0_0_0_999px_rgba(0,113,227,0.10)]",
              coordinatesClassName: "text-black/24",
            }}
          />
        </div>
      </div>
    </section>
  );
}
