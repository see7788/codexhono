import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  FileOutlined,
  FolderOutlined,
  FunctionOutlined,
  ReloadOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { Button, Tree } from "antd";
import type { CSSProperties, Key } from "react";
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import appStore from "../store";

const { DirectoryTree } = Tree;

type FileTreeNode = ReturnType<typeof appStore.getState>["file"]["tree"][number];

const styles = {
  shell: { alignItems: "center", display: "flex", height: "100%", justifyContent: "center", width: "100%" },
  workspace: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0, width: "100%" },
  header: { alignItems: "center", borderBottom: "1px solid #d8deea", display: "flex", gap: 12, minHeight: 48, padding: "0 16px" },
  path: { color: "#1f2937", flex: 1, fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  tree: { background: "#fff", border: "1px solid #d8deea", borderRadius: 8, maxHeight: "calc(100% - 48px)", overflow: "auto", padding: 12, width: "min(720px, calc(100% - 48px))" },
  treeBody: { minWidth: 420, width: "100%" },
  treeWrap: { alignItems: "center", display: "flex", flex: 1, justifyContent: "center", minHeight: 0 },
  title: { alignItems: "center", display: "inline-flex", gap: 8, minWidth: 0 },
  relation: { color: "#1677ff", display: "inline-flex", fontSize: 12 },
  kind: { color: "#7b8494", display: "inline-flex", fontSize: 12 },
  confirm: { background: "transparent", border: 0, color: "#1677ff", cursor: "pointer", height: 22, opacity: 0.72, padding: 0, width: 22 },
} satisfies Record<string, CSSProperties>;

function FileOpenButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button icon={<FileOutlined />} size="large" type="primary" onClick={onOpen}>
      加载代码地图
    </Button>
  );
}

function FileHeader({ filepath, onReselect }: { filepath: string; onReselect: () => void }) {
  return (
    <div style={styles.header}>
      <Button icon={<FileOutlined />} onClick={onReselect}>
        重新加载
      </Button>
      <span style={styles.path} title={filepath}>{filepath}</span>
    </div>
  );
}

function FileTree({ loadedKeys, loadedKeysChange, loadNode, selectFile, tree }: {
  loadedKeys: Key[];
  loadedKeysChange: (keys: Key[]) => void;
  loadNode: (node: FileTreeNode) => Promise<void>;
  selectFile: (path: string) => void;
  tree: FileTreeNode[];
}) {
  const relationIcon = (relation: FileTreeNode["relation"]) => {
    if (relation === "in") return <ArrowLeftOutlined title="被使用" />;
    if (relation === "out") return <ArrowRightOutlined title="使用" />;
    if (relation === "cycle") return <ReloadOutlined title="循环" />;
    return null;
  };
  const kindIcon = (node: FileTreeNode) => {
    if (node.kind === "directory") return <FolderOutlined />;
    if (node.kind === "file") return <FileOutlined />;
    if (node.nodeKind === "function" || node.nodeKind === "method") return <FunctionOutlined />;
    if (node.nodeKind === "type_alias" || node.nodeKind === "interface") return <ApartmentOutlined />;
    if (node.nodeKind === "constant" || node.nodeKind === "variable" || node.nodeKind === "property") return <TagOutlined />;
    if (node.kind === "info") return null;
    return <CodeOutlined />;
  };

  return (
    <div style={styles.tree}>
      <DirectoryTree
        expandAction="click"
        loadedKeys={loadedKeys}
        loadData={node => loadNode(node as FileTreeNode)}
        onLoad={loadedKeysChange}
        selectable={false}
        style={styles.treeBody}
        titleRender={node => (
          <span style={styles.title}>
            {relationIcon(node.relation) ? <span style={styles.relation}>{relationIcon(node.relation)}</span> : null}
            {kindIcon(node) ? <span style={styles.kind}>{kindIcon(node)}</span> : null}
            <span>{node.title}</span>
            {node.kind === "file" ? (
              <button style={styles.confirm} type="button" onClick={event => {
                event.stopPropagation();
                selectFile(node.key);
              }}>
                <CheckCircleOutlined />
              </button>
            ) : null}
          </span>
        )}
        treeData={tree}
      />
    </div>
  );
}

export default function FilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const file = appStore(state => state.file);
  const fileActions = appStore(state => state.fileActions);
  const filepath = searchParams.get("file") ?? "";

  useEffect(() => {
    void fileActions.treeOpen();
  }, [fileActions]);

  const reselectFile = useCallback(async () => {
    setSearchParams(currentParams => {
      currentParams.delete("file");
      currentParams.delete("filenode");
      return currentParams;
    });
    await fileActions.treeOpen();
  }, [fileActions, setSearchParams]);

  const selectFile = useCallback((path: string) => {
    setSearchParams(currentParams => {
      currentParams.set("file", path);
      currentParams.delete("filenode");
      return currentParams;
    });
  }, [setSearchParams]);

  if (filepath) {
    return (
      <div style={styles.workspace}>
        <FileHeader filepath={filepath} onReselect={() => void reselectFile()} />
        <div style={styles.treeWrap}>
          <FileTree
            loadedKeys={file.loadedKeys}
            loadedKeysChange={fileActions.loadedKeysChange}
            loadNode={fileActions.nodeLoad}
            selectFile={selectFile}
            tree={file.tree}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      {file.opened ? (
        <FileTree
          loadedKeys={file.loadedKeys}
          loadedKeysChange={fileActions.loadedKeysChange}
          loadNode={fileActions.nodeLoad}
          selectFile={selectFile}
          tree={file.tree}
        />
      ) : (
        <FileOpenButton onOpen={() => void fileActions.treeOpen()} />
      )}
    </div>
  );
}
