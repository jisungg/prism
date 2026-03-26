import type {
  BoardOrientation,
  BoardPosition,
  ChessMove,
  ChessPiece,
  ChessPositionInput,
  DisplaySquare,
  FileName,
  PieceColor,
  PieceKind,
  RankName,
  SquareName,
} from "@/components/chessboard-system/types";

export const FILES: FileName[] = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS_ASC: RankName[] = ["1", "2", "3", "4", "5", "6", "7", "8"];
export const RANKS_DESC: RankName[] = ["8", "7", "6", "5", "4", "3", "2", "1"];
export const START_POSITION_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

const FEN_TO_KIND: Record<string, PieceKind> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

const KIND_TO_FEN: Record<PieceKind, string> = {
  king: "k",
  queen: "q",
  rook: "r",
  bishop: "b",
  knight: "n",
  pawn: "p",
};

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function oppositeColor(color: PieceColor): PieceColor {
  return color === "white" ? "black" : "white";
}

export function parseFenPosition(input: string): BoardPosition {
  const board = input.trim().split(/\s+/)[0] ?? "";
  const ranks = board.split("/");

  if (ranks.length !== 8) {
    throw new Error(`Invalid FEN board segment: "${input}"`);
  }

  const position: BoardPosition = {};

  ranks.forEach((fenRank, rankIndex) => {
    let fileIndex = 0;
    const rank = RANKS_DESC[rankIndex];

    for (const char of fenRank) {
      const emptyCount = Number(char);

      if (Number.isInteger(emptyCount) && emptyCount > 0) {
        fileIndex += emptyCount;
        continue;
      }

      const lower = char.toLowerCase();
      const kind = FEN_TO_KIND[lower];

      if (!kind || fileIndex > 7) {
        throw new Error(`Invalid FEN board segment: "${input}"`);
      }

      position[`${FILES[fileIndex]}${rank}` as SquareName] = {
        color: char === lower ? "black" : "white",
        kind,
      };
      fileIndex += 1;
    }

    if (fileIndex !== 8) {
      throw new Error(`Invalid FEN board segment: "${input}"`);
    }
  });

  return position;
}

export function normalizePositionInput(input?: ChessPositionInput) {
  if (!input) {
    return parseFenPosition(START_POSITION_FEN);
  }

  if (typeof input === "string") {
    return parseFenPosition(input);
  }

  return { ...input };
}

export function serializeFenPosition(position: BoardPosition) {
  return RANKS_DESC.map((rank) => {
    let emptyCount = 0;
    let segment = "";

    FILES.forEach((file) => {
      const piece = position[`${file}${rank}` as SquareName];

      if (!piece) {
        emptyCount += 1;
        return;
      }

      if (emptyCount > 0) {
        segment += String(emptyCount);
        emptyCount = 0;
      }

      const fen = KIND_TO_FEN[piece.kind];
      segment += piece.color === "white" ? fen.toUpperCase() : fen;
    });

    if (emptyCount > 0) {
      segment += String(emptyCount);
    }

    return segment;
  }).join("/");
}

export function movePiece(position: BoardPosition, move: ChessMove): BoardPosition {
  const nextPosition = { ...position };
  delete nextPosition[move.from];
  nextPosition[move.to] = move.promotion
    ? { ...move.piece, kind: move.promotion }
    : move.piece;
  return nextPosition;
}

export function createDisplaySquares(orientation: BoardOrientation): DisplaySquare[] {
  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const ranks = orientation === "white" ? RANKS_DESC : [...RANKS_DESC].reverse();

  return ranks.flatMap((rank, row) =>
    files.map((file, col) => ({
      square: `${file}${rank}` as SquareName,
      file,
      rank,
      row,
      col,
      isDark: (row + col) % 2 === 1,
    })),
  );
}

export function getSquareDisplayPosition(
  square: SquareName,
  orientation: BoardOrientation,
) {
  const fileIndex = FILES.indexOf(square[0] as FileName);
  const rankIndex = RANKS_DESC.indexOf(square[1] as RankName);

  return orientation === "white"
    ? { row: rankIndex, col: fileIndex }
    : { row: 7 - rankIndex, col: 7 - fileIndex };
}

export function getSquareAtDisplayPosition(
  row: number,
  col: number,
  orientation: BoardOrientation,
) {
  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const ranks = orientation === "white" ? RANKS_DESC : [...RANKS_DESC].reverse();
  const file = files[col];
  const rank = ranks[row];

  if (!file || !rank) {
    return null;
  }

  return `${file}${rank}` as SquareName;
}

export function getSquareFromPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  orientation: BoardOrientation,
) {
  const normalizedX = (clientX - rect.left) / rect.width;
  const normalizedY = (clientY - rect.top) / rect.height;

  if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) {
    return null;
  }

  const col = clamp(Math.floor(normalizedX * 8), 0, 7);
  const row = clamp(Math.floor(normalizedY * 8), 0, 7);

  return getSquareAtDisplayPosition(row, col, orientation);
}

export function describeSquare(square: SquareName, piece: ChessPiece | null, isDark: boolean) {
  const tone = isDark ? "dark" : "light";

  if (!piece) {
    return `${square}, empty ${tone} square`;
  }

  return `${square}, ${piece.color} ${piece.kind}, ${tone} square`;
}

export function buildLegalTargetSet(
  legalMoves: Array<SquareName | Pick<ChessMove, "from" | "to">> | undefined,
  selectedSquare: SquareName | null,
) {
  const targets = new Set<SquareName>();

  for (const move of legalMoves ?? []) {
    if (typeof move === "string") {
      targets.add(move);
      continue;
    }

    if (!selectedSquare || move.from === selectedSquare) {
      targets.add(move.to);
    }
  }

  return targets;
}

export function isTouchPointer(pointerType: string) {
  return pointerType === "touch" || pointerType === "pen";
}
