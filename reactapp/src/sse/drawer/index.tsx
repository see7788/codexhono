import { ApartmentOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Input, Popover, Select, Space } from "antd";
import { Drawer } from "extendsantd/src/Drawer";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import appStore from "../../store";

export default function ActionDrawer() {
  const sse = appStore(state => state.sse);
  const sseActions = appStore(state => state.sseActions);
  const navigate = useNavigate();
  const splitRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const [contextRatio, contextRatioSet] = useState(0.5);
  const [targetTip, setTargetTip] = useState<"del">();
  const nodeId = sse.drawerNodeId;
  const node = nodeId ? sse.nodesState[nodeId] : undefined;
  const open = !!node;
  const contextText = node ? [node.reqtemp, node.ssetemp].filter(Boolean).join("\n\n") : "";
  const chatOptions = sse.chatList.map((chat, index) => ({
    label: chat.label,
    value: index,
  }));

  function chatRouteOpen() {
    navigate("/chat");
  }

  function targetNodeSet() {
    if (!nodeId) return;
    sseActions.nodeSelect(nodeId);
  }

  function nodeAdd() {
    targetNodeSet();
    sseActions.nodeAdd();
  }

  function nodeTextSet() {
    if (!nodeId) return;
    sseActions.nodeTextChange(sse.drawerText, nodeId);
  }

  function nodeTextChat() {
    if (!nodeId) return;
    targetNodeSet();
    sseActions.nodeTextChange(sse.drawerText, nodeId);
    void sseActions.nodeChatSubmit();
  }

  function nodeDelCurrent() {
    if (!nodeId) return;
    sseActions.nodeDelete(nodeId);
    setTargetTip(undefined);
  }

  function nodeDelBranch() {
    if (!nodeId) return;
    sseActions.nodeBranchDelete(nodeId);
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
      onClose={sseActions.drawerClose}
      onResizeSizeChange={sseActions.drawerSizeChange}
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
            value={sse.chatTargetIndex}
            onChange={sseActions.chatTargetIndexChange}
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
          onChange={event => sseActions.drawerTextChange(event.target.value)}
        />
      </div>
    </Drawer>
  );
}
