import { ConfigProvider } from "antd";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <ConfigProvider theme={{
    token: {
      colorPrimary: "#52c41a",
      colorPrimaryHover: "#73d13d",
      colorPrimaryActive: "#389e0d",
    },
  }}>
    <App />
  </ConfigProvider>,
);
