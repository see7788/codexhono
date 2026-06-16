import { FloatButton } from "antd";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import appStore from "../store";
import AntdTreeRoute from "./antdTree";
import PushDrawer from "./drawer";
import XyflowRoute from "./xyflow";

const routeNames = ["xyflow", "antdTree"] as const;

export default function PushPage() {
    const push = appStore(state => state.sse);
    const location = useLocation();
    const navigate = useNavigate();
    const routeName = location.pathname.split("/")[2] === "antdTree" ? "antdTree" : "xyflow";

    useEffect(() => {
        appStore.getState().sseActions.hookPushReceive();
    }, []);

    return (
        <div style={{ height: "100vh", minWidth: 0, overflow: "hidden", position: "relative" }}>
            <Routes>
                <Route index element={<Navigate replace to="xyflow" />} />
                <Route path="xyflow" element={<XyflowRoute />} />
                <Route path="antdTree" element={<AntdTreeRoute />} />
                <Route path="*" element={<Navigate replace to="xyflow" />} />
            </Routes>
            <PushDrawer />
            {!push.drawer.isOpen && (
                <FloatButton.Group
                    shape="square"
                    style={{ bottom: 24, right: 24 }}
                >
                    <FloatButton
                        content={routeName}
                        style={{ width: 108 }}
                        tooltip="切换路由"
                        onClick={() => {
                            const index = routeNames.indexOf(routeName);
                            navigate(`/sse/${routeNames[(index + 1) % routeNames.length]}`);
                        }}
                    />
                    <FloatButton
                        content="hook"
                        style={{
                            background: push.hookPushReceive ? "#52c41a" : undefined,
                            color: push.hookPushReceive ? "#fff" : undefined,
                            width: 108,
                        }}
                        tooltip="vscode.hook"
                        onClick={() => appStore.setState((state) => {
                            state.sse.hookPushReceive = !state.sse.hookPushReceive;
                        })}
                    />
                </FloatButton.Group>
            )}
        </div>
    );
}
