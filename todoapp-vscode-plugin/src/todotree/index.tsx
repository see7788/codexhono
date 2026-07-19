import { Button, Input, Typography } from "antd";
import { useState } from "react";

import { useTodoAppStore } from "../store";

export function App() {
  const todotree = useTodoAppStore((state) => state.todotree);
  const todotreeActions = useTodoAppStore((state) => state.todotreeActions);
  const [rootTitle, rootTitleSet] = useState("");
  const rootNodes = Object.values(todotree.nodesById).filter((node) => node.id_parent === null);

  const nodeRender = (id: string) => {
    const node = todotree.nodesById[id];

    if (!node) {
      return null;
    }

    const childNodes = Object.values(todotree.nodesById).filter(
      (childNode) => childNode.id_parent === node.id,
    );

    return (
      <li key={node.id}>
        <Input
          aria-label="任务标题"
          defaultValue={node.title}
          onBlur={(event) =>
            todotreeActions.nodeTitleSet({ id: node.id, title: event.target.value })
          }
        />
        <Typography.Text>
          {todotreeActions.nodeStatusLabelByStatus[node.status]}
        </Typography.Text>
        <select
          aria-label="任务状态"
          value={node.status}
          onChange={(event) => {
            const status = Number(event.target.value);

            if (status >= 1 && status <= 9) {
              todotreeActions.nodeStatusSet({
                id: node.id,
                status: status as typeof node.status,
              });
            }
          }}
        >
          {Object.entries(todotreeActions.nodeStatusLabelByStatus).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        <Typography.Text>{todotreeActions.nodeAgentLabelByAgent[node.agent]}</Typography.Text>
        <select
          aria-label="执行者"
          value={node.agent}
          onChange={(event) => {
            const agent = Number(event.target.value);

            if (agent >= 1 && agent <= 4) {
              todotreeActions.nodeAgentSet({ id: node.id, agent: agent as typeof node.agent });
            }
          }}
        >
          {Object.entries(todotreeActions.nodeAgentLabelByAgent).map(([agent, label]) => (
            <option key={agent} value={agent}>
              {label}
            </option>
          ))}
        </select>
        <Button
          onClick={() => {
            const childTitle = window.prompt("子任务标题");

            if (childTitle) {
              todotreeActions.nodeAdd({ id_parent: node.id, title: childTitle });
            }
          }}
        >
          添加子任务
        </Button>
        {childNodes.length > 0 && <ul>{childNodes.map((childNode) => nodeRender(childNode.id))}</ul>}
      </li>
    );
  };

  return (
    <main>
      <Typography.Title level={1}>任务树</Typography.Title>
      <Input
        aria-label="根任务标题"
        value={rootTitle}
        onChange={(event) => rootTitleSet(event.target.value)}
      />
      <Button
        onClick={() => {
          if (todotreeActions.nodeAdd({ title: rootTitle })) {
            rootTitleSet("");
          }
        }}
      >
        添加任务
      </Button>
      {rootNodes.length === 0 ? (
        <Typography.Paragraph>暂无任务</Typography.Paragraph>
      ) : (
        <ul>{rootNodes.map((node) => nodeRender(node.id))}</ul>
      )}
    </main>
  );
}

export default App;
