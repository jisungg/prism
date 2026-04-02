import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react";

export type PieceColor = "white" | "black";
export type PieceKind = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
export type BoardOrientation = PieceColor;
export type FileName = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type RankName = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
export type SquareName = `${FileName}${RankName}`;

export type ChessPiece = {
  color: PieceColor;
  kind: PieceKind;
  id?: string;
};

export type BoardPosition = Partial<Record<SquareName, ChessPiece>>;
export type ChessPositionInput = string | BoardPosition;

export type ChessMove = {
  from: SquareName;
  to: SquareName;
  piece: ChessPiece;
  captured?: ChessPiece | null;
  promotion?: PieceKind;
};

export type LegalMove = SquareName | Pick<ChessMove, "from" | "to">;

export type SquareVisualState = {
  isDark: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isPreview: boolean;
  isLastMove: boolean;
  isFocused: boolean;
  isOccupied: boolean;
};

export type SquareRenderProps = {
  square: SquareName;
  file: FileName;
  rank: RankName;
  row: number;
  col: number;
  piece: ChessPiece | null;
  state: SquareVisualState;
};

export type ChessPieceRendererProps = {
  piece: ChessPiece;
  square: SquareName;
  color: PieceColor;
  type: PieceKind;
  isDragging: boolean;
  isAnimating: boolean;
  size: number;
  boardOrientation: BoardOrientation;
};

export type PieceComponentMap = Partial<
  Record<`${PieceColor}-${PieceKind}`, (props: ChessPieceRendererProps) => ReactNode>
>;

export type MoveValidationContext = {
  position: BoardPosition;
  selectedSquare: SquareName | null;
  orientation: BoardOrientation;
};

export type ChessSquareClickEvent = {
  square: SquareName;
  piece: ChessPiece | null;
  selectedSquare: SquareName | null;
  position: BoardPosition;
  nativeEvent?:
    | MouseEvent<HTMLButtonElement>
    | KeyboardEvent<HTMLButtonElement>;
};

export type ChessPieceDropEvent = {
  move: ChessMove;
  accepted: boolean;
  position: BoardPosition;
  nativeEvent?: PointerEvent<Element>;
};

export type ChessMoveEvent = {
  move: ChessMove;
  position: BoardPosition;
  nextPosition: BoardPosition;
  nextFen: string;
  input: "click" | "drag" | "keyboard";
};

export type ChessRightClickSquareEvent = {
  square: SquareName;
  piece: ChessPiece | null;
  position: BoardPosition;
  nativeEvent: MouseEvent<HTMLButtonElement>;
};

export type ChessPositionChangeEvent = {
  position: BoardPosition;
  fen: string;
  move?: ChessMove;
};

export type ChessboardTheme = {
  boardClassName?: string;
  gridClassName?: string;
  squareClassName?: string;
  lightSquareClassName?: string;
  darkSquareClassName?: string;
  selectedSquareClassName?: string;
  legalMoveClassName?: string;
  previewSquareClassName?: string;
  lastMoveClassName?: string;
  focusedSquareClassName?: string;
  coordinatesClassName?: string;
  pieceClassName?: string;
  whitePieceClassName?: string;
  blackPieceClassName?: string;
  getSquareClassName?: (props: SquareRenderProps) => string | undefined;
  getSquareStyle?: (props: SquareRenderProps) => CSSProperties | undefined;
};

export type ChessboardInteractionOptions = {
  enableClickToMove?: boolean;
  enableDragToMove?: boolean;
  enableKeyboardNavigation?: boolean;
  enableTouchDrag?: boolean;
};

export type AnimationConfig = {
  enabled?: boolean;
  durationMs?: number;
  easing?: string;
};

export type ChessboardProps = {
  position?: ChessPositionInput;
  defaultPosition?: ChessPositionInput;
  onPositionChange?: (event: ChessPositionChangeEvent) => void;
  orientation?: BoardOrientation;
  size?: number | string;
  squareSize?: number;
  responsive?: boolean;
  fitContainer?: boolean;
  minSize?: number;
  maxSize?: number;
  showCoordinates?: boolean;
  className?: string;
  selectedSquare?: SquareName | null;
  defaultSelectedSquare?: SquareName | null;
  onSelectedSquareChange?: (square: SquareName | null) => void;
  legalMoves?: LegalMove[];
  lastMove?: Pick<ChessMove, "from" | "to"> | null;
  renderPiece?: (props: ChessPieceRendererProps) => ReactNode;
  pieceComponents?: PieceComponentMap;
  theme?: ChessboardTheme;
  interaction?: ChessboardInteractionOptions;
  animation?: AnimationConfig;
  canMove?: (move: ChessMove, context: MoveValidationContext) => boolean;
  onSquareClick?: (event: ChessSquareClickEvent) => void;
  onPieceDrop?: (event: ChessPieceDropEvent) => void;
  onMove?: (event: ChessMoveEvent) => void;
  onRightClickSquare?: (event: ChessRightClickSquareEvent) => void;
  renderSquare?: (props: SquareRenderProps) => ReactNode;
  renderSquareOverlay?: (props: SquareRenderProps) => ReactNode;
  ariaLabel?: string;
};

export type DisplaySquare = {
  square: SquareName;
  file: FileName;
  rank: RankName;
  row: number;
  col: number;
  isDark: boolean;
};
