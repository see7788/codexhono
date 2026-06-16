import type { CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";

const styles = {
  shell: { alignItems: "center", display: "flex", height: "100%", justifyContent: "center", width: "100%" },
  card: { background: "#fff", border: "1px solid #d8deea", borderRadius: 8, padding: 16, width: "min(760px, calc(100% - 48px))" },
  meta: { color: "#5d667a", fontSize: 12 },
  title: { color: "#1f2937", fontSize: 18, margin: "0 0 12px" },
} satisfies Record<string, CSSProperties>;

export default function FileNodePage() {
  const [searchParams] = useSearchParams();
  const filepath = searchParams.get("file") ?? "";
  const filenode = searchParams.get("filenode") ?? "";

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <h2 style={styles.title}>当前文件节点</h2>
        {filepath ? (
          <div style={styles.meta}>
            <div>已选择文件：{filepath}</div>
            {filenode ? <div>已选择节点：{filenode}</div> : null}
          </div>
        ) : (
          <div style={styles.meta}>请先从文件树中选择一个入口文件。</div>
        )}
      </div>
    </div>
  );
}
