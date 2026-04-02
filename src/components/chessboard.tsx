"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { DefaultPieceSvg } from "@/components/chessboard-system/pieces";
import type {
  BoardOrientation,
  BoardPosition,
  ChessMove,
  ChessMoveEvent,
  ChessPiece,
  ChessPieceRendererProps,
  ChessPositionInput,
  ChessSquareClickEvent,
  ChessboardProps,
  DisplaySquare,
  PieceComponentMap,
  SquareName,
  SquareRenderProps,
} from "@/components/chessboard-system/types";
import { useBoardSize } from "@/components/chessboard-system/use-board-size";
import {
  START_POSITION_FEN,
  buildLegalTargetSet,
  createDisplaySquares,
  cx,
  describeSquare,
  getSquareAtDisplayPosition,
  getSquareDisplayPosition,
  getSquareFromPoint,
  isTouchPointer,
  movePiece,
  normalizePositionInput,
  serializeFenPosition,
} from "@/components/chessboard-system/utils";

type DragPreviewState = {
  from: SquareName;
  piece: ChessPiece;
  squareSize: number;
};

type AnimatedMoveState = {
  piece: ChessPiece;
  from: SquareName;
  to: SquareName;
};

type DragSession = {
  from: SquareName;
  piece: ChessPiece;
  pointerId: number;
  pointerType: string;
  boardRect: DOMRect;
  squareSize: number;
  startX: number;
  startY: number;
  moved: boolean;
  overSquare: SquareName | null;
};

function resolvePosition(
  controlledPosition: ChessPositionInput | undefined,
  internalPosition: BoardPosition,
) {
  return controlledPosition === undefined
    ? internalPosition
    : normalizePositionInput(controlledPosition);
}

function getSquareElement(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<HTMLButtonElement>("[data-square]");
}

function getSquareFromTarget(target: EventTarget | null) {
  return getSquareElement(target)?.dataset.square as SquareName | undefined;
}

function getPieceRenderer(
  renderPiece: ChessboardProps["renderPiece"],
  pieceComponents: PieceComponentMap | undefined,
  piece: ChessPiece,
) {
  if (renderPiece) {
    return renderPiece;
  }

  const mappedRenderer = pieceComponents?.[`${piece.color}-${piece.kind}`];

  if (mappedRenderer) {
    return mappedRenderer;
  }

  return null;
}

const SquareCell = memo(function SquareCell({
  squareData,
  squareProps,
  tabIndex,
  showCoordinates,
  coordinatesClassName,
  squareClassName,
  lightSquareClassName,
  darkSquareClassName,
  selectedSquareClassName,
  legalMoveClassName,
  previewSquareClassName,
  lastMoveClassName,
  focusedSquareClassName,
  getSquareClassName,
  getSquareStyle,
  renderSquare,
  renderSquareOverlay,
}: {
  squareData: DisplaySquare;
  squareProps: SquareRenderProps;
  tabIndex: number;
  showCoordinates: boolean;
  coordinatesClassName?: string;
  squareClassName?: string;
  lightSquareClassName?: string;
  darkSquareClassName?: string;
  selectedSquareClassName?: string;
  legalMoveClassName?: string;
  previewSquareClassName?: string;
  lastMoveClassName?: string;
  focusedSquareClassName?: string;
  getSquareClassName?: (props: SquareRenderProps) => string | undefined;
  getSquareStyle?: (props: SquareRenderProps) => CSSProperties | undefined;
  renderSquare?: (props: SquareRenderProps) => ReactNode;
  renderSquareOverlay?: (props: SquareRenderProps) => ReactNode;
}) {
  const className = cx(
    "relative flex h-full w-full items-center justify-center border-0 p-0 text-left outline-none",
    squareProps.state.isDark ? "bg-[#d8d1c5]" : "bg-[#f2ede2]",
    squareClassName,
    squareProps.state.isDark ? darkSquareClassName : lightSquareClassName,
    squareProps.state.isSelected
      && (selectedSquareClassName ?? "shadow-[inset_0_0_0_2px_rgba(17,17,20,0.52),inset_0_0_0_999px_rgba(17,17,20,0.04)]"),
    squareProps.state.isLegalTarget && legalMoveClassName,
    squareProps.state.isPreview && (previewSquareClassName ?? "shadow-[inset_0_0_0_2px_rgba(17,17,20,0.22)]"),
    squareProps.state.isLastMove && (lastMoveClassName ?? "shadow-[inset_0_0_0_999px_rgba(0,113,227,0.12)]"),
    squareProps.state.isFocused && (focusedSquareClassName ?? "ring-2 ring-inset ring-black/25"),
    getSquareClassName?.(squareProps),
  );

  return (
    <button
      type="button"
      role="gridcell"
      data-square={squareData.square}
      tabIndex={tabIndex}
      aria-selected={squareProps.state.isSelected}
      aria-label={describeSquare(squareData.square, squareProps.piece, squareData.isDark)}
      className={className}
      style={getSquareStyle?.(squareProps)}
    >
      {renderSquare?.(squareProps) ?? (
        <>
          {showCoordinates && squareData.col === 0 ? (
            <span
              className={cx(
                "pointer-events-none absolute left-2 top-1.5 text-[0.66rem] tracking-[0.02em] text-black/30",
                coordinatesClassName,
              )}
            >
              {squareData.rank}
            </span>
          ) : null}

          {showCoordinates && squareData.row === 7 ? (
            <span
              className={cx(
                "pointer-events-none absolute bottom-1.5 right-2 text-[0.66rem] tracking-[0.02em] text-black/30",
                coordinatesClassName,
              )}
            >
              {squareData.file}
            </span>
          ) : null}

          {squareProps.state.isLegalTarget ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="h-[18%] w-[18%] rounded-full bg-black/12" />
            </span>
          ) : null}
        </>
      )}
      {renderSquareOverlay?.(squareProps)}
    </button>
  );
});

const PieceSprite = memo(function PieceSprite({
  square,
  piece,
  row,
  col,
  boardOrientation,
  squareSize,
  hidden,
  pieceClassName,
  whitePieceClassName,
  blackPieceClassName,
  renderPiece,
  pieceComponents,
  onPiecePointerDown,
  onPieceClick,
}: {
  square: SquareName;
  piece: ChessPiece;
  row: number;
  col: number;
  boardOrientation: BoardOrientation;
  squareSize: number;
  hidden: boolean;
  pieceClassName?: string;
  whitePieceClassName?: string;
  blackPieceClassName?: string;
  renderPiece?: ChessboardProps["renderPiece"];
  pieceComponents?: PieceComponentMap;
  onPiecePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    square: SquareName,
    piece: ChessPiece,
  ) => void;
  onPieceClick: (
    event: React.MouseEvent<HTMLButtonElement>,
    square: SquareName,
  ) => void;
}) {
  const renderer = getPieceRenderer(renderPiece, pieceComponents, piece);
  const renderProps: ChessPieceRendererProps = {
    piece,
    square,
    color: piece.color,
    type: piece.kind,
    isDragging: false,
    isAnimating: false,
    size: squareSize,
    boardOrientation,
  };

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    onPiecePointerDown(event, square, piece);
  }, [onPiecePointerDown, piece, square]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    onPieceClick(event, square);
  }, [onPieceClick, square]);

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`${piece.color} ${piece.kind} on ${square}`}
      className={cx(
        "absolute flex cursor-grab items-center justify-center border-0 bg-transparent p-0 text-left transition-[left,top,opacity] duration-180 ease-out active:cursor-grabbing",
        hidden ? "opacity-0" : "opacity-100",
      )}
      style={{
        left: `${col * 12.5}%`,
        top: `${row * 12.5}%`,
        width: "12.5%",
        height: "12.5%",
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <div className="flex h-full w-full items-center justify-center p-[11%]">
        {renderer
          ? renderer(renderProps)
          : (
              <DefaultPieceSvg
                piece={piece}
                className={cx(
                  "pointer-events-none h-full w-full drop-shadow-[0_2px_6px_rgba(17,17,20,0.16)]",
                  pieceClassName,
                  piece.color === "white" ? whitePieceClassName : blackPieceClassName,
                )}
              />
            )}
      </div>
    </button>
  );
});

function AnimatedPieceOverlay({
  move,
  boardOrientation,
  squareSize,
  durationMs,
  easing,
  pieceClassName,
  whitePieceClassName,
  blackPieceClassName,
  renderPiece,
  pieceComponents,
  onComplete,
}: {
  move: AnimatedMoveState;
  boardOrientation: BoardOrientation;
  squareSize: number;
  durationMs: number;
  easing: string;
  pieceClassName?: string;
  whitePieceClassName?: string;
  blackPieceClassName?: string;
  renderPiece?: ChessboardProps["renderPiece"];
  pieceComponents?: PieceComponentMap;
  onComplete: () => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const from = getSquareDisplayPosition(move.from, boardOrientation);
  const to = getSquareDisplayPosition(move.to, boardOrientation);
  const deltaX = (to.col - from.col) * 100;
  const deltaY = (to.row - from.row) * 100;
  const renderer = getPieceRenderer(renderPiece, pieceComponents, move.piece);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsRunning(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [move.from, move.to]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      onTransitionEnd={onComplete}
    >
      <div
        className="absolute flex items-center justify-center p-[11%] will-change-transform"
        style={{
          left: `${from.col * 12.5}%`,
          top: `${from.row * 12.5}%`,
          width: "12.5%",
          height: "12.5%",
          transform: isRunning ? `translate(${deltaX}%, ${deltaY}%)` : "translate(0%, 0%)",
          transitionDuration: `${durationMs}ms`,
          transitionTimingFunction: easing,
        }}
      >
        {renderer
          ? renderer({
              piece: move.piece,
              square: move.to,
              color: move.piece.color,
              type: move.piece.kind,
              isDragging: false,
              isAnimating: true,
              size: squareSize,
              boardOrientation,
            })
          : (
              <DefaultPieceSvg
                piece={move.piece}
                className={cx(
                  "pointer-events-none h-full w-full drop-shadow-[0_12px_20px_rgba(17,17,20,0.14)]",
                  pieceClassName,
                  move.piece.color === "white" ? whitePieceClassName : blackPieceClassName,
                )}
              />
            )}
      </div>
    </div>
  );
}

export function Chessboard({
  position,
  defaultPosition = START_POSITION_FEN,
  onPositionChange,
  orientation = "white",
  size,
  squareSize,
  responsive = true,
  fitContainer = true,
  minSize = 320,
  maxSize,
  showCoordinates = true,
  className,
  selectedSquare: controlledSelectedSquare,
  defaultSelectedSquare = null,
  onSelectedSquareChange,
  legalMoves,
  lastMove,
  renderPiece,
  pieceComponents,
  theme,
  interaction,
  animation,
  canMove,
  onSquareClick,
  onPieceDrop,
  onMove,
  onRightClickSquare,
  renderSquare,
  renderSquareOverlay,
  ariaLabel = "Interactive chessboard",
}: ChessboardProps) {
  const [internalPosition, setInternalPosition] = useState(() => normalizePositionInput(defaultPosition));
  const [internalSelectedSquare, setInternalSelectedSquare] = useState<SquareName | null>(defaultSelectedSquare);
  const [focusedSquare, setFocusedSquare] = useState<SquareName | null>(null);
  const [previewSquare, setPreviewSquare] = useState<SquareName | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);
  const [animatedMove, setAnimatedMove] = useState<AnimatedMoveState | null>(null);
  const [boardPixels, setBoardPixels] = useState(0);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const skipNextClickRef = useRef(false);
  const previewSquareRef = useRef<SquareName | null>(null);
  const lastMoveKeyRef = useRef<string | null>(null);

  const activePosition = resolvePosition(position, internalPosition);
  const activeSelectedSquare = controlledSelectedSquare === undefined
    ? internalSelectedSquare
    : controlledSelectedSquare;
  const activeOrientation = orientation;

  const {
    containerRef,
    boardStyle,
  } = useBoardSize({
    size,
    squareSize,
    responsive,
    fitContainer,
    minSize,
    maxSize,
  });

  const {
    boardClassName,
    gridClassName,
    squareClassName,
    lightSquareClassName,
    darkSquareClassName,
    selectedSquareClassName,
    legalMoveClassName,
    previewSquareClassName,
    lastMoveClassName,
    focusedSquareClassName,
    coordinatesClassName,
    pieceClassName,
    whitePieceClassName,
    blackPieceClassName,
    getSquareClassName,
    getSquareStyle,
  } = theme ?? {};

  const {
    enableClickToMove = true,
    enableDragToMove = true,
    enableKeyboardNavigation = true,
    enableTouchDrag = true,
  } = interaction ?? {};
  const {
    enabled: animationsEnabled = true,
    durationMs: animationDurationMs = 180,
    easing: animationEasing = "cubic-bezier(0.22, 1, 0.36, 1)",
  } = animation ?? {};

  useEffect(() => {
    const element = boardRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setBoardPixels(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const resolvedSquareSize = boardPixels > 0 ? boardPixels / 8 : 0;
  const displaySquares = useMemo(() => createDisplaySquares(activeOrientation), [activeOrientation]);
  const legalTargetSet = useMemo(
    () => buildLegalTargetSet(legalMoves, activeSelectedSquare),
    [activeSelectedSquare, legalMoves],
  );

  const setSelectedSquare = useCallback((square: SquareName | null) => {
    if (controlledSelectedSquare === undefined) {
      setInternalSelectedSquare(square);
    }

    onSelectedSquareChange?.(square);
  }, [controlledSelectedSquare, onSelectedSquareChange]);

  const updatePreviewSquare = useCallback((square: SquareName | null) => {
    if (previewSquareRef.current === square) {
      return;
    }

    previewSquareRef.current = square;
    setPreviewSquare(square);
  }, []);

  const squarePropsMap = useMemo(
    () => displaySquares.reduce<Map<SquareName, SquareRenderProps>>((map, squareData) => {
      const piece = activePosition[squareData.square] ?? null;

      map.set(squareData.square, {
        square: squareData.square,
        file: squareData.file,
        rank: squareData.rank,
        row: squareData.row,
        col: squareData.col,
        piece,
        state: {
          isDark: squareData.isDark,
          isSelected: activeSelectedSquare === squareData.square,
          isLegalTarget: legalTargetSet.has(squareData.square),
          isPreview: previewSquare === squareData.square,
          isLastMove: Boolean(
            lastMove
            && (lastMove.from === squareData.square || lastMove.to === squareData.square),
          ),
          isFocused: focusedSquare === squareData.square,
          isOccupied: Boolean(piece),
        },
      });

      return map;
    }, new Map()),
    [activePosition, activeSelectedSquare, displaySquares, focusedSquare, lastMove, legalTargetSet, previewSquare],
  );

  const positionedPieces = useMemo(
    () => displaySquares
      .map((squareData) => {
        const piece = activePosition[squareData.square];
        return piece ? { squareData, piece } : null;
      })
      .filter(Boolean) as Array<{ squareData: DisplaySquare; piece: ChessPiece }>,
    [activePosition, displaySquares],
  );

  useEffect(() => {
    if (!animationsEnabled || !lastMove) {
      return;
    }

    const piece = activePosition[lastMove.to];

    if (!piece) {
      return;
    }

    const nextKey = `${lastMove.from}-${lastMove.to}-${piece.color}-${piece.kind}`;

    if (lastMoveKeyRef.current === nextKey) {
      return;
    }

    lastMoveKeyRef.current = nextKey;
    const frameId = window.requestAnimationFrame(() => {
      setAnimatedMove({
        piece,
        from: lastMove.from,
        to: lastMove.to,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activePosition, animationsEnabled, lastMove]);

  const emitPositionChange = useCallback((nextPosition: BoardPosition, move?: ChessMove) => {
    onPositionChange?.({
      position: nextPosition,
      fen: serializeFenPosition(nextPosition),
      move,
    });
  }, [onPositionChange]);

  const attemptMove = useCallback((
    from: SquareName,
    to: SquareName,
    input: ChessMoveEvent["input"],
    nativeEvent?: ReactPointerEvent<Element>,
  ) => {
    const piece = activePosition[from];

    if (!piece) {
      return false;
    }

    const move: ChessMove = {
      from,
      to,
      piece,
      captured: activePosition[to] ?? null,
    };
    const accepted = canMove ? canMove(move, {
      position: activePosition,
      selectedSquare: activeSelectedSquare,
      orientation: activeOrientation,
    }) : true;

    if (input === "drag") {
      onPieceDrop?.({
        move,
        accepted,
        position: activePosition,
        nativeEvent,
      });
    }

    if (!accepted) {
      return false;
    }

    const nextPosition = movePiece(activePosition, move);
    const nextFen = serializeFenPosition(nextPosition);
    const nextAnimationKey = `${move.from}-${move.to}-${piece.color}-${piece.kind}`;

    if (position === undefined) {
      setInternalPosition(nextPosition);
    }

    if (animationsEnabled) {
      lastMoveKeyRef.current = nextAnimationKey;
      setAnimatedMove({
        piece,
        from: move.from,
        to: move.to,
      });
    }

    updatePreviewSquare(null);
    setSelectedSquare(null);
    onMove?.({
      move,
      position: activePosition,
      nextPosition,
      nextFen,
      input,
    });
    emitPositionChange(nextPosition, move);
    return true;
  }, [
    activeOrientation,
    activePosition,
    activeSelectedSquare,
    animationsEnabled,
    canMove,
    emitPositionChange,
    onMove,
    onPieceDrop,
    position,
    setSelectedSquare,
    updatePreviewSquare,
  ]);

  const activateSquare = useCallback((
    square: SquareName,
    input: ChessMoveEvent["input"],
    nativeEvent?: ChessSquareClickEvent["nativeEvent"],
  ) => {
    const piece = activePosition[square] ?? null;

    onSquareClick?.({
      square,
      piece,
      selectedSquare: activeSelectedSquare,
      position: activePosition,
      nativeEvent,
    });

    if (
      enableClickToMove
      && activeSelectedSquare
      && activeSelectedSquare !== square
    ) {
      const moved = attemptMove(activeSelectedSquare, square, input);

      if (moved) {
        return;
      }
    }

    setSelectedSquare(piece && activeSelectedSquare !== square ? square : null);
    updatePreviewSquare(null);
  }, [
    activePosition,
    activeSelectedSquare,
    attemptMove,
    enableClickToMove,
    onSquareClick,
    setSelectedSquare,
    updatePreviewSquare,
  ]);

  const handleGridClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false;
      return;
    }

    const square = getSquareFromTarget(event.target);

    if (!square) {
      return;
    }

    activateSquare(square, "click", event as unknown as ChessSquareClickEvent["nativeEvent"]);
  }, [activateSquare]);

  const handleGridContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const square = getSquareFromTarget(event.target);

    if (!square) {
      return;
    }

    event.preventDefault();
    onRightClickSquare?.({
      square,
      piece: activePosition[square] ?? null,
      position: activePosition,
      nativeEvent: event as unknown as MouseEvent<HTMLButtonElement>,
    });
  }, [activePosition, onRightClickSquare]);

  const handleGridPointerOver = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeSelectedSquare) {
      updatePreviewSquare(null);
      return;
    }

    const square = getSquareFromTarget(event.target);

    if (!square) {
      updatePreviewSquare(null);
      return;
    }

    updatePreviewSquare(legalTargetSet.has(square) ? square : null);
  }, [activeSelectedSquare, legalTargetSet, updatePreviewSquare]);

  const handleGridPointerLeave = useCallback(() => {
    updatePreviewSquare(null);
  }, [updatePreviewSquare]);

  const focusSquareElement = useCallback((square: SquareName) => {
    const element = boardRef.current?.querySelector<HTMLButtonElement>(
      `[data-square="${square}"]`,
    );

    element?.focus();
  }, []);

  const handleGridFocus = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const square = getSquareFromTarget(event.target);

    if (square) {
      setFocusedSquare(square);
    }
  }, []);

  const handleGridKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!enableKeyboardNavigation) {
      return;
    }

    const currentSquare = getSquareFromTarget(event.target)
      ?? focusedSquare
      ?? (activeOrientation === "white" ? "e2" : "e7");
    const currentPosition = getSquareDisplayPosition(currentSquare, activeOrientation);
    let nextSquare: SquareName | null = null;

    switch (event.key) {
      case "ArrowUp":
        nextSquare = getSquareAtDisplayPosition(currentPosition.row - 1, currentPosition.col, activeOrientation);
        break;
      case "ArrowDown":
        nextSquare = getSquareAtDisplayPosition(currentPosition.row + 1, currentPosition.col, activeOrientation);
        break;
      case "ArrowLeft":
        nextSquare = getSquareAtDisplayPosition(currentPosition.row, currentPosition.col - 1, activeOrientation);
        break;
      case "ArrowRight":
        nextSquare = getSquareAtDisplayPosition(currentPosition.row, currentPosition.col + 1, activeOrientation);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        activateSquare(currentSquare, "keyboard", event as unknown as ChessSquareClickEvent["nativeEvent"]);
        return;
      case "Escape":
        event.preventDefault();
        setSelectedSquare(null);
        return;
      default:
        return;
    }

    if (nextSquare) {
      event.preventDefault();
      setFocusedSquare(nextSquare);
      focusSquareElement(nextSquare);
    }
  }, [
    activateSquare,
    activeOrientation,
    enableKeyboardNavigation,
    focusSquareElement,
    focusedSquare,
    setSelectedSquare,
  ]);

  const endDragSession = useCallback((commitMove: boolean) => {
    const session = dragSessionRef.current;
    dragSessionRef.current = null;

    if (!session) {
      return;
    }

    if (
      commitMove
      && session.moved
      && session.overSquare
      && session.overSquare !== session.from
    ) {
      skipNextClickRef.current = true;
      attemptMove(session.from, session.overSquare, "drag");
    }

    updatePreviewSquare(null);
    setDragPreview(null);
  }, [attemptMove, updatePreviewSquare]);

  const handlePiecePointerDown = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    square: SquareName,
    piece: ChessPiece,
  ) => {
    if (event.button !== 0 || !enableDragToMove) {
      return;
    }

    if (!enableTouchDrag && isTouchPointer(event.pointerType)) {
      return;
    }

    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.preventDefault();
    setSelectedSquare(square);
    setFocusedSquare(square);

    dragSessionRef.current = {
      from: square,
      piece,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      boardRect: rect,
      squareSize: rect.width / 8,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      overSquare: square,
    };

    const handleWindowPointerMove = (nativeEvent: globalThis.PointerEvent) => {
      const session = dragSessionRef.current;

      if (!session || nativeEvent.pointerId !== session.pointerId) {
        return;
      }

      const nextOverSquare = getSquareFromPoint(
        nativeEvent.clientX,
        nativeEvent.clientY,
        session.boardRect,
        activeOrientation,
      );

      session.overSquare = nextOverSquare;
      updatePreviewSquare(
        nextOverSquare && legalTargetSet.has(nextOverSquare) ? nextOverSquare : null,
      );

      if (!session.moved) {
        const distance = Math.hypot(
          nativeEvent.clientX - session.startX,
          nativeEvent.clientY - session.startY,
        );

        if (distance <= 6) {
          return;
        }

        session.moved = true;
        setDragPreview({
          from: session.from,
          piece: session.piece,
          squareSize: session.squareSize,
        });
      }

      requestAnimationFrame(() => {
        const preview = dragPreviewRef.current;

        if (!preview) {
          return;
        }

        preview.style.transform = `translate(${nativeEvent.clientX - session.squareSize / 2}px, ${nativeEvent.clientY - session.squareSize / 2}px)`;
      });
    };

    const finishDrag = (nativeEvent: globalThis.PointerEvent) => {
      const session = dragSessionRef.current;

      if (!session || nativeEvent.pointerId !== session.pointerId) {
        return;
      }

      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", cancelDrag);

      endDragSession(true);
    };

    const cancelDrag = (nativeEvent: globalThis.PointerEvent) => {
      const session = dragSessionRef.current;

      if (!session || nativeEvent.pointerId !== session.pointerId) {
        return;
      }

      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", cancelDrag);
      endDragSession(false);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", cancelDrag);
  }, [
    activeOrientation,
    enableDragToMove,
    enableTouchDrag,
    endDragSession,
    legalTargetSet,
    setSelectedSquare,
    updatePreviewSquare,
  ]);

  const handlePieceClick = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    square: SquareName,
  ) => {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false;
      return;
    }

    activateSquare(square, "click", event as unknown as ChessSquareClickEvent["nativeEvent"]);
  }, [activateSquare]);

  useEffect(() => () => {
    dragSessionRef.current = null;
  }, []);

  return (
    <div ref={containerRef} className={cx("relative flex w-full justify-center", className)}>
      <div
        ref={boardRef}
        role="grid"
        aria-label={ariaLabel}
        className={cx(
          "relative aspect-square touch-none select-none overflow-hidden border border-black/10 bg-[#f4efe5]",
          boardClassName,
        )}
        style={boardStyle}
        onClick={handleGridClick}
        onPointerOver={handleGridPointerOver}
        onPointerLeave={handleGridPointerLeave}
        onContextMenu={handleGridContextMenu}
        onFocus={handleGridFocus}
        onKeyDown={handleGridKeyDown}
      >
        <div className={cx("grid h-full w-full grid-cols-8 grid-rows-8", gridClassName)}>
          {displaySquares.map((squareData) => {
            const squareProps = squarePropsMap.get(squareData.square);

            if (!squareProps) {
              return null;
            }

            return (
              <SquareCell
                key={squareData.square}
                squareData={squareData}
                squareProps={squareProps}
                tabIndex={focusedSquare === squareData.square || (!focusedSquare && squareData.square === "e2") ? 0 : -1}
                showCoordinates={showCoordinates}
                coordinatesClassName={coordinatesClassName}
                squareClassName={squareClassName}
                lightSquareClassName={lightSquareClassName}
                darkSquareClassName={darkSquareClassName}
                selectedSquareClassName={selectedSquareClassName}
                legalMoveClassName={legalMoveClassName}
                previewSquareClassName={previewSquareClassName}
                lastMoveClassName={lastMoveClassName}
                focusedSquareClassName={focusedSquareClassName}
                getSquareClassName={getSquareClassName}
                getSquareStyle={getSquareStyle}
                renderSquare={renderSquare}
                renderSquareOverlay={renderSquareOverlay}
              />
            );
          })}
        </div>

        <div className="absolute inset-0">
          {positionedPieces.map(({ squareData, piece }) => (
            <PieceSprite
              key={`${squareData.square}-${piece.id ?? `${piece.color}-${piece.kind}`}`}
              square={squareData.square}
              piece={piece}
              row={squareData.row}
              col={squareData.col}
              boardOrientation={activeOrientation}
              squareSize={resolvedSquareSize}
              hidden={
                dragPreview?.from === squareData.square
                || animatedMove?.to === squareData.square
              }
              pieceClassName={pieceClassName}
              whitePieceClassName={whitePieceClassName}
              blackPieceClassName={blackPieceClassName}
              renderPiece={renderPiece}
              pieceComponents={pieceComponents}
              onPiecePointerDown={handlePiecePointerDown}
              onPieceClick={handlePieceClick}
            />
          ))}
        </div>

        {animatedMove ? (
          <AnimatedPieceOverlay
            move={animatedMove}
            boardOrientation={activeOrientation}
            squareSize={resolvedSquareSize}
            durationMs={animationDurationMs}
            easing={animationEasing}
            pieceClassName={pieceClassName}
            whitePieceClassName={whitePieceClassName}
            blackPieceClassName={blackPieceClassName}
            renderPiece={renderPiece}
            pieceComponents={pieceComponents}
            onComplete={() => setAnimatedMove(null)}
          />
        ) : null}
      </div>

      {dragPreview ? (
        <div
          ref={dragPreviewRef}
          className="pointer-events-none fixed left-0 top-0 z-40"
          style={{
            width: dragPreview.squareSize,
            height: dragPreview.squareSize,
          }}
        >
          <div className="flex h-full w-full items-center justify-center p-[11%] drop-shadow-[0_14px_28px_rgba(17,17,20,0.22)]">
            {(getPieceRenderer(renderPiece, pieceComponents, dragPreview.piece)?.({
              piece: dragPreview.piece,
              square: dragPreview.from,
              color: dragPreview.piece.color,
              type: dragPreview.piece.kind,
              isDragging: true,
              isAnimating: false,
              size: dragPreview.squareSize,
              boardOrientation: activeOrientation,
            })) ?? (
              <DefaultPieceSvg
                piece={dragPreview.piece}
                className={cx(
                  "pointer-events-none h-full w-full",
                  pieceClassName,
                  dragPreview.piece.color === "white"
                    ? whitePieceClassName
                    : blackPieceClassName,
                )}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type {
  AnimationConfig,
  BoardOrientation,
  BoardPosition,
  ChessMove,
  ChessPiece,
  ChessPieceRendererProps,
  ChessPositionInput,
  ChessboardProps,
  PieceComponentMap,
  SquareName,
  SquareRenderProps,
} from "@/components/chessboard-system/types";

export {
  START_POSITION_FEN,
  movePiece,
  normalizePositionInput,
  oppositeColor,
  serializeFenPosition,
} from "@/components/chessboard-system/utils";
