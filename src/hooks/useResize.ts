import { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizeOptions {
  direction: 'horizontal' | 'vertical';
  initialSize: number;
  minSize?: number;
  maxSize?: number;
  collapsed?: boolean;
  collapsedSize?: number;
}

export const useResize = (options: UseResizeOptions) => {
  const {
    direction,
    initialSize,
    minSize = 100,
    maxSize = 800,
    collapsed = false,
    collapsedSize = 0,
  } = options;

  const [size, setSize] = useState(initialSize);
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      startSize.current = size;
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction, size]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const diff = currentPos - startPos.current;
      // For right-side panels (AI chat), diff is negative when dragging left (growing)
      const newSize = Math.min(maxSize, Math.max(minSize, startSize.current + diff));
      setSize(newSize);
    };

    const handleUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing, direction, minSize, maxSize]);

  const actualSize = collapsed ? collapsedSize : size;

  return {
    size: actualSize,
    isResizing,
    startResize,
    setSize,
    fullSize: size, // size when not collapsed
  };
};
