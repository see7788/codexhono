import { Drawer as AntdDrawer } from "antd";
import type { DrawerProps as AntdDrawerProps } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";

type ResizePlacement = "left" | "right" | "top" | "bottom";

type ResizeState = {
  axis: "x" | "y";
  placement: ResizePlacement;
  startSize: number;
  startValue: number;
};

export type DrawerProps = AntdDrawerProps & {
  onResizeSizeChange?: (size: number) => void;
  resizeSize?: number;
};

export function Drawer(props: DrawerProps) {
  const {
    children,
    height,
    onResizeSizeChange,
    open,
    placement = "right",
    resizeSize,
    size,
    styles,
    width,
    ...rest
  } = props;
  const resizeState = useRef<ResizeState | undefined>(undefined);
  const [dragSize, setDragSize] = useState<number>();
  const resizePlacement = placement === "left" || placement === "top" || placement === "bottom"
    ? placement
    : "right";
  const baseSize = resizePlacement === "top" || resizePlacement === "bottom"
    ? height ?? size
    : width ?? size;
  const currentSize = resizeSize ?? dragSize ?? baseSize;
  const stylesObject = typeof styles === "function"
    ? undefined
    : styles as Record<string, CSSProperties> | undefined;
  const sectionStyle = useMemo<CSSProperties>(() => ({
    ...stylesObject?.section,
    position: "relative",
  }), [stylesObject?.section]);

  useEffect(() => {
    if (open) return;
    setDragSize(undefined);
  }, [open]);

  useEffect(() => {
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const state = resizeState.current;
      if (!state) return;
      const delta = state.axis === "x"
        ? event.clientX - state.startValue
        : event.clientY - state.startValue;
      const signedDelta = state.placement === "right" || state.placement === "bottom"
        ? -delta
        : delta;
      const nextSize = Math.max(240, state.startSize + signedDelta);
      setDragSize(nextSize);
      onResizeSizeChange?.(nextSize);
    };
    const onPointerUp = () => {
      resizeState.current = undefined;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onResizeSizeChange]);

  function resizeStart(event: PointerEvent<HTMLDivElement>) {
    const element = event.currentTarget.closest(".ant-drawer-content-wrapper");
    const rect = element?.getBoundingClientRect();
    const vertical = resizePlacement === "top" || resizePlacement === "bottom";
    const startSize = vertical ? rect?.height : rect?.width;
    if (!startSize) return;
    event.preventDefault();
    resizeState.current = {
      axis: vertical ? "y" : "x",
      placement: resizePlacement,
      startSize,
      startValue: vertical ? event.clientY : event.clientX,
    };
  }

  return (
    <AntdDrawer
      {...rest}
      open={open}
      placement={placement}
      size={currentSize ?? size}
      styles={(typeof styles === "function"
        ? styles
        : {
          ...stylesObject,
          section: sectionStyle,
        }) as DrawerProps["styles"]}
    >
      {children}
      <ResizeHandle placement={resizePlacement} onPointerDown={resizeStart} />
    </AntdDrawer>
  );
}

function ResizeHandle({
  onPointerDown,
  placement,
}: {
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  placement: ResizePlacement;
}) {
  const vertical = placement === "top" || placement === "bottom";
  const style: CSSProperties = vertical
    ? {
      cursor: "ns-resize",
      height: 8,
      left: 0,
      position: "absolute",
      right: 0,
      top: placement === "bottom" ? 0 : undefined,
      bottom: placement === "top" ? 0 : undefined,
      zIndex: 1,
    }
    : {
      bottom: 0,
      cursor: "ew-resize",
      position: "absolute",
      top: 0,
      width: 8,
      left: placement === "right" ? 0 : undefined,
      right: placement === "left" ? 0 : undefined,
      zIndex: 1,
    };

  return (
    <div
      aria-hidden
      data-extendsantd-resize={placement}
      onPointerDown={onPointerDown}
      style={style}
    />
  );
}
