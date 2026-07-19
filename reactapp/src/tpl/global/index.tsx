import Editor from "@monaco-editor/react";
import { DeploymentUnitOutlined, SaveOutlined, SwapOutlined } from "@ant-design/icons";
import { Alert, Button, FloatButton, message, Tag, Tooltip } from "antd";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { editor } from "monaco-editor";
import initTplMonaco from "../monaco";
import globalTplStore from "./store";

initTplMonaco();

const editorOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  mouseWheelZoom: false,
  scrollBeyondLastLine: false,
  tabSize: 2,
} satisfies editor.IStandaloneEditorConstructionOptions;

export default function GlobalTplPage() {
  const navigate = useNavigate();
  const dirtyTargets = globalTplStore(state => state.dirtyTargets);
  const existingTargets = globalTplStore(state => state.existingTargets);
  const loading = globalTplStore(state => state.loading);
  const source = globalTplStore(state => state.source);
  const sourceSaveStatus = globalTplStore(state => state.sourceSaveStatus);
  const outputMaterialize = globalTplStore(state => state.outputMaterialize);
  const sourceChange = globalTplStore(state => state.sourceChange);
  const sourceLoad = globalTplStore(state => state.sourceLoad);
  const sourceSave = globalTplStore(state => state.sourceSave);
  const sourceSaveStatusChange = globalTplStore(state => state.sourceSaveStatusChange);

  useEffect(() => {
    void sourceLoad().catch(error => {
      console.error(error);
      message.error(error instanceof Error ? error.message : "全局模板加载失败");
    });
  }, [sourceLoad]);

  useEffect(() => {
    if (sourceSaveStatus !== "pending") return;
    const timer = window.setTimeout(() => {
      sourceSaveStatusChange("saving");
      void sourceSave(source).catch(error => {
        console.error(error);
        sourceSaveStatusChange("failed");
        message.error(error instanceof Error ? error.message : "全局模板保存失败");
      });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [source, sourceSave, sourceSaveStatus, sourceSaveStatusChange]);

  const sourceEdit = (value: string) => {
    sourceChange(value);
    sourceSaveStatusChange("pending");
  };
  const materialize = async () => {
    try {
      if (sourceSaveStatus !== "saved") {
        sourceSaveStatusChange("saving");
        await sourceSave(source);
      }
      await outputMaterialize();
      message.success("全局模板已物化");
    } catch (error) {
      console.error(error);
      sourceSaveStatusChange("failed");
      message.error(error instanceof Error ? error.message : "全局模板物化失败");
    }
  };
  const sourceSaveLabel = {
    idle: "源码未加载",
    pending: "等待防抖保存",
    saving: "保存中",
    saved: "已由服务端持久化",
    failed: "持久化失败",
  }[sourceSaveStatus];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", minWidth: 0, overflow: "hidden", position: "relative" }}>
      <div style={{ alignItems: "center", borderBottom: "1px solid #d9d9d9", display: "flex", gap: 8, minHeight: 44, padding: "0 16px" }}>
        <strong>用户级全局模板</strong>
        <Tag color={dirtyTargets.length ? "gold" : "green"}>{dirtyTargets.length ? `${dirtyTargets.length} 项待物化` : "已同步"}</Tag>
        <span style={{ color: "#8c8c8c", fontSize: 12 }}>{sourceSaveLabel} · {existingTargets.length} 个现有目标</span>
        <Button icon={<DeploymentUnitOutlined />} loading={loading} style={{ marginLeft: "auto" }} type="primary" onClick={() => void materialize()}>
          物化到用户级 .codex
        </Button>
      </div>
      <Alert banner message="agents 是当前生效的工作者配置；legacy 仅用于旧产物迁移，不作为工作者展示或配置入口。" type="info" />
      {dirtyTargets.length > 0 && <Alert banner message={`待物化：${dirtyTargets.join("、")}`} type="warning" />}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          language="typescript"
          options={editorOptions}
          path="global-source.ts"
          theme="hono-green"
          value={source}
          onChange={value => sourceEdit(value ?? "")}
        />
      </div>
      <FloatButton.Group shape="square">
        <FloatButton icon={<SwapOutlined />} tooltip="切换到项目模板" onClick={() => navigate("/tpl")} />
        <Tooltip title="立即物化">
          <FloatButton icon={<SaveOutlined />} onClick={() => void materialize()} />
        </Tooltip>
      </FloatButton.Group>
    </div>
  );
}
