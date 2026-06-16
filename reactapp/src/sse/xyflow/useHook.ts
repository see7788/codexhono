import {
    MarkerType,
    Position,
    type Edge,
    type IsValidConnection,
    type Node,
    type OnConnect,
    type OnEdgesChange,
    type OnEdgesDelete,
    type OnReconnect,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { useCallback, useMemo, useState } from "react";
import appStore from "../../store";

type LayoutDirection = "horizontal" | "vertical";
type NodePosition = { x: number; y: number };
type NodesObj = Record<string, { parentId?: string; string: string }>;
const childHandle = "child";
const parentHandle = "parent";
const flowDash = 8;
const flowLineWidth = 2;
const nodeTextLineHeight = 20;
const nodeHeight = nodeTextLineHeight * 2;
const nodeWidth = 178;
const layoutPadding = {
    x: 24,
    y: 56,
};
const layoutOptions: Record<LayoutDirection, {
    childHandlePosition: Position;
    nodesep: number;
    parentHandlePosition: Position;
    rankdir: "LR" | "TB";
    ranksep: number;
}> = {
    horizontal: {
        childHandlePosition: Position.Left,
        nodesep: 30,
        parentHandlePosition: Position.Right,
        rankdir: "LR",
        ranksep: 80,
    },
    vertical: {
        childHandlePosition: Position.Top,
        nodesep: 30,
        parentHandlePosition: Position.Bottom,
        rankdir: "TB",
        ranksep: 100,
    },
};

function positionsGet(
    layoutDirection: LayoutDirection,
    nodesObj: NodesObj,
) {
    const graph = new dagre.graphlib.Graph();
    const layout = layoutOptions[layoutDirection];
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
        nodesep: layout.nodesep,
        rankdir: layout.rankdir,
        ranksep: layout.ranksep,
    });
    for (const id of Object.keys(nodesObj)) {
        graph.setNode(id, {
            height: nodeHeight,
            width: nodeWidth,
        });
    }
    for (const [id, node] of Object.entries(nodesObj)) {
        if (node.parentId && nodesObj[node.parentId]) graph.setEdge(node.parentId, id);
    }
    dagre.layout(graph);
    const positions = Object.fromEntries(Object.keys(nodesObj).map(id => {
        const node = graph.node(id);
        return [id, {
            x: node.x - nodeWidth / 2,
            y: node.y - nodeHeight / 2,
        }];
    }));
    const values = Object.values(positions);
    const minX = Math.min(...values.map(pos => pos.x));
    const minY = Math.min(...values.map(pos => pos.y));
    return Object.fromEntries(Object.entries(positions).map(([id, pos]) => [id, {
        x: pos.x - minX + layoutPadding.x,
        y: pos.y - minY + layoutPadding.y,
    }]));
}

export default () => {
    const push = appStore(state => state.sse);
    const pushActions = appStore(state => state.sseActions);
    const [layoutDirectionIndex, layoutDirectionSet] = useState(0);
    const [selectedEdgeIds, selectedEdgeIdsChange] = useState<Record<string, true>>({});
    const layoutDirection: LayoutDirection = layoutDirectionIndex === 1 ? "vertical" : "horizontal";

    const connectionGet = useCallback((connection: {
        source?: string | null;
        sourceHandle?: string | null;
        target?: string | null;
        targetHandle?: string | null;
    }) => {
        if (!connection.source || !connection.target || connection.source === connection.target) return undefined;
        if (connection.sourceHandle === parentHandle && connection.targetHandle === childHandle) {
            return { childId: connection.target, parentId: connection.source };
        }
        if (connection.sourceHandle === childHandle && connection.targetHandle === parentHandle) {
            return { childId: connection.source, parentId: connection.target };
        }
        return undefined;
    }, []);

    const connectionCan = useCallback((parentId: string, childId: string) => {
        const nodesObj = appStore.getState().sse.nodesObj;
        if (childId === parentId) return false;
        if (!nodesObj[parentId]) return false;
        const child = nodesObj[childId];
        if (!child || child.parentId) return false;
        for (let id: string | undefined = parentId; id !== undefined;) {
            if (id === childId) return false;
            id = nodesObj[id]?.parentId;
        }
        return true;
    }, []);

    const positions = useMemo(() => {
        return positionsGet(layoutDirection, push.nodesObj);
    }, [layoutDirection, push.nodesObj]);

    const pathState = useMemo(() => {
        const pathEdgeIds: Record<string, true> = {};
        const pathNodeIds: Record<string, true> = {};
        for (let id: string | undefined = push.nodesObj[push.targetId] ? push.targetId : undefined; id !== undefined;) {
            pathNodeIds[id] = true;
            const parentId = push.nodesObj[id]?.parentId;
            if (parentId) pathEdgeIds[`${parentId}-${id}`] = true;
            id = parentId;
        }
        return { pathEdgeIds, pathNodeIds };
    }, [push.nodesObj, push.targetId]);

    const nodes = useMemo<Node<{
        childHandle: string;
        childHandlePosition: Position;
        hasParent: boolean;
        parentHandle: string;
        parentHandlePosition: Position;
        text: string;
    }, "context">[]>(() => {
        const layout = layoutOptions[layoutDirection];
        const selectedEdge = Object.keys(selectedEdgeIds).length > 0;
        return Object.entries(push.nodesObj).map(([id, node]) => ({
            className: [
                id === push.targetId ? "context-node-target" : "",
                node.parentId ? "context-node-has-parent" : "",
                pathState.pathNodeIds[id] ? `context-node-flow context-node-flow-${layoutDirection}` : "",
            ].filter(Boolean).join(" "),
            data: {
                childHandle,
                childHandlePosition: layout.childHandlePosition,
                hasParent: !!node.parentId,
                parentHandle,
                parentHandlePosition: layout.parentHandlePosition,
                text: node.string,
            },
            height: nodeHeight,
            id,
            position: positions[id] ?? { x: 0, y: 0 },
            selected: !selectedEdge && id === push.targetId,
            style: {
                height: nodeHeight,
                width: nodeWidth,
            },
            type: "context",
            width: nodeWidth,
        }));
    }, [layoutDirection, pathState.pathNodeIds, positions, selectedEdgeIds, push.nodesObj, push.targetId]);

    const edges = useMemo<Edge[]>(() => {
        return Object.entries(push.nodesObj).flatMap(([id, node]) => {
            if (!node.parentId || !push.nodesObj[node.parentId]) return [];
            const edgeId = `${node.parentId}-${id}`;
            const flowing = !!pathState.pathEdgeIds[edgeId];
            return [{
                animated: flowing,
                className: flowing ? "context-edge-flow" : "context-edge-default",
                id: edgeId,
                markerEnd: {
                    color: flowing ? "var(--context-flow)" : "var(--context-edge)",
                    type: MarkerType.ArrowClosed,
                },
                reconnectable: "target",
                selected: !!selectedEdgeIds[edgeId],
                source: node.parentId,
                sourceHandle: parentHandle,
                style: {
                    stroke: flowing ? "var(--context-flow)" : "var(--context-edge)",
                    strokeDasharray: `${flowDash} ${flowDash}`,
                    strokeWidth: flowLineWidth,
                },
                target: id,
                targetHandle: childHandle,
                type: "smoothstep",
            }];
        });
    }, [pathState.pathEdgeIds, selectedEdgeIds, push.nodesObj]);

    const edgeSelectionChange = useCallback((changes: Parameters<OnEdgesChange<Edge>>[0]) => {
        const selects = changes.filter(change => change.type === "select");
        if (!selects.length) return;
        selectedEdgeIdsChange(state => {
            const next = { ...state };
            for (const change of selects) {
                if (change.selected) next[change.id] = true;
                else delete next[change.id];
            }
            return next;
        });
    }, []);

    const connectionValid = useCallback<IsValidConnection>((connection) => {
        const conn = connectionGet(connection);
        return !!conn && connectionCan(conn.parentId, conn.childId);
    }, [connectionCan, connectionGet]);

    const parentClear = useCallback((id: string) => {
        pushActions.node.parentClear(id);
    }, [pushActions]);

    const parentChange = useCallback((childId: string, parentId: string) => {
        pushActions.node.parentSet(childId, parentId);
        pushActions.node.targetIdSet(childId);
    }, [pushActions]);

    const edgeReconnect = useCallback<OnReconnect<Edge>>((oldEdge, connection) => {
        const conn = connectionGet(connection);
        if (!conn) return;
        parentClear(oldEdge.target);
        if (connectionCan(conn.parentId, conn.childId)) parentChange(conn.childId, conn.parentId);
        selectedEdgeIdsChange(state => {
            const next = { ...state };
            delete next[oldEdge.id];
            return next;
        });
    }, [connectionCan, connectionGet, parentChange, parentClear]);

    const edgesDelete = useCallback<OnEdgesDelete<Edge>>((deletedEdges) => {
        for (const edge of deletedEdges) {
            parentClear(edge.target);
            selectedEdgeIdsChange(state => {
                const next = { ...state };
                delete next[edge.id];
                return next;
            });
        }
    }, [parentClear]);

    const nodeConnect = useCallback<OnConnect>((connection) => {
        const conn = connectionGet(connection);
        if (!conn && connection.target) {
            parentClear(connection.target);
            return;
        }
        if (!conn) return;
        if (connectionCan(conn.parentId, conn.childId)) parentChange(conn.childId, conn.parentId);
    }, [connectionCan, connectionGet, parentChange, parentClear]);

    const targetIdSet = useCallback((id: string) => {
        pushActions.node.targetIdSet(id);
        selectedEdgeIdsChange({});
    }, [pushActions]);

    return {
        connectionValid,
        edgeReconnect,
        edgeSelectionChange,
        edges,
        edgesDelete,
        layoutDirectionIndex,
        layoutDirectionSet,
        nodeConnect,
        targetIdSet,
        nodes,
    };
};
