"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clamp } from "@/components/chessboard-system/utils";

type UseBoardSizeOptions = {
  size?: number | string;
  squareSize?: number;
  responsive?: boolean;
  fitContainer?: boolean;
  minSize?: number;
  maxSize?: number;
};

export function useBoardSize({
  size,
  squareSize,
  responsive = true,
  fitContainer = true,
  minSize = 280,
  maxSize,
}: UseBoardSizeOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerBounds, setContainerBounds] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;

    if (!element || !responsive || !fitContainer || size !== undefined || squareSize !== undefined) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerBounds({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [fitContainer, responsive, size, squareSize]);

  const boardStyle = useMemo(() => {
    if (typeof size === "number") {
      return { width: `${size}px`, height: `${size}px` };
    }

    if (typeof size === "string") {
      return { width: size, height: size };
    }

    if (squareSize !== undefined) {
      const px = squareSize * 8;
      return { width: `${px}px`, height: `${px}px` };
    }

    if (!responsive || !fitContainer) {
      return undefined;
    }

    const nextSize = clamp(
      Math.min(containerBounds.width || minSize, containerBounds.height || minSize),
      minSize,
      maxSize ?? Number.POSITIVE_INFINITY,
    );

    return { width: `${nextSize}px`, height: `${nextSize}px` };
  }, [containerBounds.height, containerBounds.width, fitContainer, maxSize, minSize, responsive, size, squareSize]);

  return {
    containerRef,
    boardStyle,
  };
}
