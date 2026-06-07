import { FloatButton } from "antd";
import { type ReactNode, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import appStore from "../store";
import AntdTreeRoute from "./antdTree";
import ActionDrawer from "./drawer";
import XyflowRoute from "./xyflow";

const routeNames = ["xyflow", "antdTree"] as const;
type RouteName = typeof routeNames[number];
const routeLabels = {
  antdTree: "antdTree",
  xyflow: "xyflow",
} satisfies Record<RouteName, string>;

export default function Page() {
  const sse = appStore(state => state.sse);
  const sseActions = appStore(state => state.sseActions);
  const location = useLocation();
  const navigate = useNavigate();
  const routeName = routeNameGet(location.pathname);

  useEffect(() => {
    const events = new EventSource(`${window.location.origin}/codex/sse`);
    events.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as { text: string; stop?: boolean };
      appStore.getState().sseActions.hookMessageReceive(message);
    });
    events.addEventListener("error", () => {
      events.close();
    });
    return () => {
      events.close();
    };
  }, []);

  function routeNext() {
    const index = routeNames.indexOf(routeName);
    const nextRouteName = routeNames[(index + 1) % routeNames.length];
    navigate(`/sse/${nextRouteName}`);
  }

  return (
    <SseLayout
      drawerOpen={!!sse.drawerNodeId && !!sse.nodesState[sse.drawerNodeId]}
      hookActive={sse.hookPushReceive}
      routeLabel={routeLabels[routeName]}
      onHookToggle={sseActions.hookPushReceiveToggle}
      onRouteNext={routeNext}
    >
      <Routes>
        <Route index element={<Navigate replace to="xyflow" />} />
        <Route path="xyflow" element={<XyflowRoute />} />
        <Route path="antdTree" element={<AntdTreeRoute />} />
        <Route path="*" element={<Navigate replace to="xyflow" />} />
      </Routes>
    </SseLayout>
  );
}

function SseLayout({
  children,
  drawerOpen,
  hookActive,
  routeLabel,
  onHookToggle,
  onRouteNext,
}: {
  children: ReactNode;
  drawerOpen: boolean;
  hookActive: boolean;
  routeLabel: string;
  onHookToggle: () => void;
  onRouteNext: () => void;
}) {
  return (
    <div
      style={{
        height: "100vh",
        minWidth: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {children}
      <ActionDrawer />
      {!drawerOpen && (
        <FloatButton.Group
          shape="square"
          style={{ bottom: 24, right: 24 }}
        >
          <FloatButton
            content={routeLabel}
            style={{ width: 108 }}
            tooltip="切换路由"
            onClick={onRouteNext}
          />
          <FloatButton
            content="hook"
            style={{
              background: hookActive ? "#52c41a" : undefined,
              color: hookActive ? "#fff" : undefined,
              width: 108,
            }}
            tooltip="vscode.hook"
            onClick={onHookToggle}
          />
        </FloatButton.Group>
      )}
    </div>
  );
}

function routeNameGet(pathname: string): RouteName {
  const routeName = pathname.split("/")[2];
  if (routeName === "antdTree") return routeName;
  return "xyflow";
}
