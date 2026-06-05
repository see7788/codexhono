import { ApartmentOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Input, Popover, Select, Space } from "antd";
import { Drawer } from "extendsantd/src/Drawer";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import appStore from "../store";

type ChatTarget = ReturnType<typeof appStore.getState>["sse"]["drawerChatTarget"];

const chatOptions: { label: string; value: ChatTarget }[] = [
  { label: "llm.openai", value: "llm.openai" },
  { label: "agent.draw", value: "agent.draw" },
  { label: "agent.codexcli", value: "agent.codexcli" },
];

export default function ActionDrawer() {
  const sse = appStore(state => state.sse);
  const navigate = useNavigate();
  const splitRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const [contextRatio, contextRatioSet] = useState(0.5);
  const [targetTip, setTargetTip] = useState<"del">();
  const nodeId = sse.drawerNodeId;
  const open = !!nodeId && !!sse.nodesState[nodeId];
  const contextText = contextTextGet(sse);

  function chatRouteOpen() {
    navigate("/chat");
  }

  function targetNodeSet() {
    if (!nodeId) return;
    sse.nodeSelect(nodeId);
  }

  function nodeAdd() {
    targetNodeSet();
    sse.nodeAdd();
  }

  function nodeTextSet() {
    if (!nodeId) return;
    sse.nodeTextChange(sse.drawerText, nodeId);
  }

  function nodeTextChat() {
    if (!nodeId) return;
    targetNodeSet();
    sse.nodeTextChange(sse.drawerText, nodeId);
    void sse.nodeChat([contextText, sse.drawerText].filter(Boolean).join("\n\n"));
  }

  function nodeDelCurrent() {
    if (!nodeId) return;
    sse.nodeDelete(nodeId);
    setTargetTip(undefined);
  }

  function nodeDelBranch() {
    if (!nodeId) return;
    sse.nodeBranchDelete(nodeId);
    setTargetTip(undefined);
  }

  function splitMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const rect = splitRef.current?.getBoundingClientRect();
    if (!rect?.height) return;
    const nextRatio = (event.clientY - rect.top) / rect.height;
    contextRatioSet(Math.min(0.8, Math.max(0.2, nextRatio)));
  }

  return (
    <Drawer
      autoFocus={false}
      destroyOnHidden
      getContainer={false}
      mask={false}
      onClose={sse.drawerClose}
      onResizeSizeChange={sse.drawerSizeChange}
      open={open}
      placement="right"
      push={false}
      resizeSize={sse.drawerSize}
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 16,
        },
        footer: {
          padding: "10px 12px",
        },
        section: {
          borderLeft: "1px solid rgba(127, 133, 128, .24)",
          boxShadow: "-8px 0 22px rgba(32, 48, 32, .12)",
        },
      }}
      size="min(520px, calc(100vw - 72px))"
      title={(
        <Space size={8}>
          <span>{nodeId ? `node ${nodeId}` : ""}</span>
          <Select
            options={chatOptions}
            size="small"
            style={{ width: 150 }}
            value={sse.drawerChatTarget}
            onChange={sse.drawerChatTargetChange}
          />
          <Button size="small" onClick={chatRouteOpen}>设置</Button>
          <Button size="small" onClick={chatRouteOpen}>chat</Button>
        </Space>
      )}
      footer={(
        <Space size={8} wrap>
          <Button size="small" onClick={nodeAdd}>addNode</Button>
          <Button size="small" onClick={nodeTextSet}>setNode</Button>
          <Button size="small" onClick={nodeTextChat}>chat</Button>
          <Popover
            content={(
              <Space size={6}>
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  title="current node"
                  onClick={nodeDelCurrent}
                >
                  current
                </Button>
                <Button
                  icon={<ApartmentOutlined />}
                  size="small"
                  title="current node and child nodes"
                  onClick={nodeDelBranch}
                >
                  branch
                </Button>
              </Space>
            )}
            destroyOnHidden
            fresh
            onOpenChange={open => setTargetTip(open ? "del" : undefined)}
            open={targetTip === "del"}
            placement="topLeft"
            trigger="click"
          >
            <Button
              type={targetTip === "del" ? "primary" : "default"}
              size="small"
            >
              del
            </Button>
          </Popover>
        </Space>
      )}
    >
      <div
        ref={splitRef}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Input.TextArea
          readOnly
          style={{
            flex: `${contextRatio} 1 0`,
            minHeight: 0,
            resize: "none",
          }}
          value={contextText}
        />
        <div
          style={{
            cursor: "row-resize",
            flex: "0 0 12px",
            padding: "5px 0",
          }}
          onPointerDown={(event) => {
            dragRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={splitMove}
          onPointerUp={(event) => {
            dragRef.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragRef.current = false;
          }}
        >
          <div
            style={{
              background: "rgba(127, 133, 128, .28)",
              height: 2,
            }}
          />
        </div>
        <Input.TextArea
          style={{
            flex: `${1 - contextRatio} 1 0`,
            minHeight: 0,
            resize: "none",
          }}
          value={sse.drawerText}
          onChange={event => sse.drawerTextChange(event.target.value)}
        />
      </div>
    </Drawer>
  );
}

function contextTextGet(sse: ReturnType<typeof appStore.getState>["sse"]) {
  const parentContext = parentContextGet(sse);
  if (sse.drawerChatTarget === "agent.draw") {
    return [
      "You are an AI assistant that edits a project node tree.",
      "Return newline-delimited JSON only. Do not wrap it in Markdown.",
      "Each line must be one compact JSON event. Do not return a JSON array or wrapper object.",
      "Allowed event shapes:",
      "{\"type\":\"message\",\"text\":\"short progress text\"}",
      "{\"type\":\"operation\",\"operation\":{\"type\":\"node.text\",\"id\":\"existing node id\",\"text\":\"new full node text\"}}",
      "{\"type\":\"operation\",\"operation\":{\"type\":\"node.replace\",\"id\":\"existing node id\",\"text\":\"replacement node text\"}}",
      "{\"type\":\"operation\",\"operation\":{\"type\":\"node.add\",\"parentId\":\"existing parent id or omitted for root\",\"text\":\"new node text\"}}",
      "{\"type\":\"operation\",\"operation\":{\"type\":\"node.move\",\"id\":\"existing node id\",\"parentId\":\"existing parent id or omitted for root\"}}",
      "{\"type\":\"operation\",\"operation\":{\"type\":\"node.delete\",\"id\":\"existing node id\"}}",
      "{\"type\":\"done\"}",
      "Do not delete every node. Prefer small, concrete edits.",
      "Use operations instead of returning the full graph.",
      "Target node id:",
      sse.drawerNodeId ?? sse.targetId,
      "Existing nodes:",
      JSON.stringify(sse.nodesState),
      "User request:",
    ].join("\n\n");
  }
  if (sse.drawerChatTarget === "agent.codexcli") {
    return [
      "Use the project context and answer for the current node.",
      "Parent context:",
      parentContext || "(none)",
      "Current node:",
    ].join("\n\n");
  }
  return [
    "Answer for the current node.",
    "Parent context:",
    parentContext || "(none)",
    "Current node:",
  ].join("\n\n");
}

function parentContextGet(sse: ReturnType<typeof appStore.getState>["sse"]) {
  const texts: string[] = [];
  const target = sse.drawerNodeId ? sse.nodesState[sse.drawerNodeId] : undefined;
  for (let id = target?.parentId; id !== undefined;) {
    const node = sse.nodesState[id];
    if (!node) break;
    texts.unshift([`node ${id}:`, node.data.trim()].filter(Boolean).join("\n"));
    id = node.parentId;
  }
  return texts.join("\n\n");
}
