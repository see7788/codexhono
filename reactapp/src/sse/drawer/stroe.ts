import immerStateCreator from "extendszustand-lib/src/immerStateCreator";
//../store：
// 其中chat和 drawer相关状态改存到这里；
// nodeChatSubmit 放到./useHook.ts里实现
// xyflow/store.ts加一个，看上去只有positions极少的几个状态，edge的方法大部分通过xyflow/useHook.ts即可实现
// 如此之后../store只留下targetId、nodesState、hookPushReceive状态，方法只留下关于节点的增改删查//删除|递归删除，递归获取，添加，修改xx等等的外部用到的增改删，并处理好ui方面的响应

//如此之后，如此复杂的组件各自有各自的切片仓库，简单取数据从主仓库取，复杂的数据方法有各自的useHook提供
interface Store {
    sseDrawer: {
        list: {
            label: string;
            target: "llm.openai.chat" | "llm.openai.draw" | "agent.codexcli.chat";
        }[];
        targetIndex: number;
    }
}
export default immerStateCreator<Store>((set, get) => {
    return {
        sseDrawer: {
            list: [
                { label: "llm.openai 对话", target: "llm.openai.chat" },
                { label: "llm.openai 画图", target: "llm.openai.draw" },
                { label: "agent.codexcli 对话", target: "agent.codexcli.chat" },
            ],
            targetIndex: 0,
        }
    }
})