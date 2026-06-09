import { useEffect, useMemo } from "react"
import store from "../../store"
import { useAsyncFn } from "react-use"
export default () => {
    //抽屉内容分成可改变高度的三栏，上栏显示promptHead；中栏显示state.reqtemp;下栏state.reqtemp
    const nodeId = useMemo(() => store.getState().sse.targetId, [])
    const state = store(s => s.sse.nodesState[nodeId])
    const reqtempSet = (str: string) => store.setState(s => {
        s.sse.nodesState[nodeId].reqtemp = str
    })
    useEffect(()=>{reqtempSet(state.data)},[])
    const promptHead = useMemo(() => "store.sse.node递归获取", [])
    const chatSubmit = useAsyncFn(async () => { }, [])//结合参数实现对ai提问
}