import { Tabs } from "antd";
import { lazy, Suspense, type FC } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";

const pages = {
  chat: lazy(() => import("./chat")),
  tpl: lazy(() => import("./tpl")),
  sse: lazy(() => import("./sse")),
  file: lazy(() => import("./file")),
  email: lazy(() => import("./email")),
};
const items=Object.keys(pages).map(key=>({key,label:key}))
const Layout: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Tabs
        activeKey={location.pathname.split("/")[1] || "sse"}
        items={items}
        onChange={key => navigate(`/${key}`)}
        tabPlacement="start"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Suspense>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate replace to="/sse/xyflow" />} />
          <Route path="sse/*" element={<pages.sse />} />
          <Route path="chat" element={<pages.chat />} />
          <Route path="tpl" element={<pages.tpl />} />
          <Route path="file" element={<pages.file />} />
          <Route path="email" element={<pages.email />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
