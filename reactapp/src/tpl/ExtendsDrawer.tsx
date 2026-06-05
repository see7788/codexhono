import { Drawer } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DrawerProps } from "antd";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

type ExtendsDrawerProps = Omit<DrawerProps, "size"> & {
  children?: ReactNode;
  maxSize?: number;
  minSize?: number;
  size?: number | string;
};

const resolveSize = (value: number | string | undefined, fallback: number) => {
  if (typeof value === "number") return value;
  if (!value) return fallback;
  const match = /^([\d.]+)\s*vw$/.exec(value);
  if (match) return Math.round(window.innerWidth * Number(match[1]) / 100);
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampSize = (value: number, minSize: number, maxSize: number) => Math.min(maxSize, Math.max(minSize, value));

export default function ExtendsDrawer({
  children,
  maxSize,
  minSize = 320,
  placement = "right",
  size = "46vw",
  ...props
}: ExtendsDrawerProps) {
  const initialSize = useMemo(() => resolveSize(size, Math.round(window.innerWidth * 0.46)), [size]);
  const [drawerSize, setDrawerSize] = useState(initialSize);
  const dragRef = useRef<{ pointerId: number; pointerX: number; size: number } | null>(null);
  const resolvedMaxSize = maxSize ?? Math.max(minSize, window.innerWidth - 160);
  const canResize = placement === "left" || placement === "right";
  const handlePosition: CSSProperties = placement === "left"
    ? { right: -3 }
    : { left: -3 };

  useEffect(() => {
    setDrawerSize(value => clampSize(value, minSize, resolvedMaxSize));
  }, [minSize, resolvedMaxSize]);

  useEffect(() => () => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canResize) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, pointerX: event.clientX, size: drawerSize };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  const resize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const delta = placement === "left"
      ? event.clientX - start.pointerX
      : start.pointerX - event.clientX;
    setDrawerSize(clampSize(start.size + delta, minSize, resolvedMaxSize));
  };

  const stopResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  return (
    <Drawer
      {...props}
      placement={placement}
      size={drawerSize}
      styles={{ section: { position: "relative" } }}
    >
      {canResize && (
        <div
          aria-hidden="true"
          onPointerDown={startResize}
          onPointerMove={resize}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
          onLostPointerCapture={stopResize}
          style={{
            bottom: 0,
            cursor: "ew-resize",
            position: "absolute",
            touchAction: "none",
            top: 0,
            width: 6,
            zIndex: 10,
            ...handlePosition,
          }}
        />
      )}
      {children}
    </Drawer>
  );
}
