---
name: "net-styleskill"
description: "处理 Hono 服务端接口、页面 API 调用、外部 HTTP、SSE、WebSocket 和同进程 Hono 调用时使用。统一网络边界、协议形态、状态入口和响应类型规则。"
---

# 网络调用风格


## 分流规则

- 前端页面请求本项目 Hono API 时按「前端网络 - 页面 API」规则。
- 前端页面消费 SSE 或连接 WebSocket 时按「前端网络 - SSE/WebSocket」规则。
- 后端实现 Hono 服务端接口时按「后端网络 - Hono API」规则。
- 后端请求第三方或远端普通 HTTP API 时按「后端网络 - 外部 HTTP」规则。
- 后端同进程复用 Hono 子路由时按「后端网络 - 同进程 Hono」规则。
- 后端实现 SSE/WebSocket 或消费第三方 SSE/WebSocket 时按对应后端网络协议规则。
- 纯业务逻辑复用优先仓库 action 或业务对象方法，不为复用请求形态绕过业务边界。
- 发起网络、SSE、WebSocket、RPC 或同进程 Hono 调用前，必须确认地址、协议、方法、认证方式和数据结构来自用户输入、仓库已有配置、官方文档或可验证运行时环境；未确认来源时不得自行推断默认地址、默认端口、默认 token、默认路径或默认请求体。
- 禁止把模拟响应、硬编码成功、轮询假数据或本地 echo 结果声明为接口已接通。

## 后端网络 - Hono API

- 每个 Hono 模块目录的 index.ts 必须自己声明 `new Hono().basePath("/模块路径")`，并默认导出完整 router。
- Hono 托管型项目中，web 私有对象 router 自己声明完整 basePath：`/{web项目}/api/{对象名}`；聚合入口只按 `/` 组合，不重新分配业务路径。
- src/routers.ts 只导入各模块默认 router 并 `.route("/", router)` 汇总；不要在 routers.ts 或 src/index.ts 手写模块内部路径。
- Hono 聚合入口只实现托管和组合，业务逻辑必须留在对象目录的 router/ipc 或 store action 内。
- Hono 托管型项目中，Vite web 项目托管到 Hono 时使用 web package.name 作为 basePath；不要手写 /admin、/user 这类与包名不一致的路径。
- Hono 托管型项目中，web 项目托管根路径必须等于 web 项目的 package.name，例如 admin-web -> /admin-web、user-web -> /user-web；非 Hono 托管项目按项目既有部署入口处理。
- Hono 托管型项目中，托管 web 子项目时先建立路径一致性表：web package.name、Hono 托管 basePath、Vite middleware 挂载路径、私有 API 根路径必须使用同一个 URL path segment；任一项不一致时先阻塞并指出冲突项，禁止临时转发、别名路径、兼容入口或双 basePath。
- web 项目的 package.name 必须是可直接作为 URL path segment 的非 scoped 名称；不接受 @scope/admin-web 这类不能直接等价为 basePath 的名称。
- 同一个 web 项目的私有 API router 和 Vite 静态托管 router 使用同一个 basePath；API router 先挂载并使用 /basePath/api/... 子路径，Vite router 后挂载。
- Vite 静态托管 router 必须最后挂载，只处理静态资源和 SPA fallback；SPA fallback 只允许处理该 basePath 下的 GET/HEAD 页面请求，不得吞掉 API、SSE、WebSocket、POST、PUT、PATCH、DELETE 等业务请求。
- 同一 Hono 进程托管多个 web 项目时，每个 Vite middleware 必须只匹配自己的 /package-name 与 /package-name/*；进入 Vite 前必须保持或转换为该项目自己的 basePath 语义，禁止第一个 SPA fallback 吞掉后续 web 项目。
- src/routers.ts 挂载 Vite 项目时只读取 web 项目的 package.name 和项目 root；web 项目不暴露 host、port、origin、basePath 环境变量桥接。
- 模块 router 的类型来自真实 Hono router；web 侧使用 `hc<typeof router>` 推导接口类型，禁止为 web 手搓 contract 或倒贴类型文件。
- Hono 聚合入口运行值默认导出 app/router；命名导出只允许 `export type XxxApi = typeof app` 这类 API 类型，禁止 `export type { ... }` 转发 DTO、SSE event、view state、store 类型或对象类型。
- 路由路径按业务层级组织，避免把领域压扁成难读路径；路由和 action 层级命名使用 variable-style。
- handler 只负责读取请求、校验输入、调用业务对象或 store action、返回响应；复杂业务流程不要堆在 route handler 里，业务边界不存在时按 scope-styleskill「后端作用域」或 zustand-store-styleskill「后端仓库」建最小业务对象或 action。
- 服务端接口禁止 `ctx.json() as ...`；响应类型写在 `ctx.json<T>(...)` 的泛型参数里。
- 普通无数据 JSON 响应写 `ctx.json(null, 200)`，无 body 响应用 `ctx.body(null, 204)`；流式、SSE 和 WebSocket 响应按对应协议规则。
- 错误要明确 throw 或返回明确错误结构；禁止空 catch、静默兜底和隐藏失败原因的兼容逻辑。

## 前端网络 - 页面 API

- React 组件不直接请求服务端接口；页面交互触发 zustand action，action 负责请求和写业务状态。
- 页面交互、组件职责和 UI 临时态使用 scope-styleskill「前端作用域」；业务状态流转使用 zustand-store-styleskill「前端仓库」。
- 页面请求本项目 Hono API 时优先使用项目统一的 Hono `hc` 客户端类型推导，不在组件里散写裸 `fetch`。
- 页面 API 类型必须来自服务端真实导出的 Hono router 类型；不要在 web 项目或 contract 包里手写一份平行接口类型。
- 页面请求本项目 Hono API 时，唯一允许从服务端包导入的类型是 `typeof Hono app` 这类 `*Api` 类型，例如 `AdminWebApi`、`UserWebApi`。
- 页面必须通过 `hc<Api>` 推导请求参数、响应结构和路径；禁止从服务端包导入 DTO、SSE event、view state、request body、response body、store type 或对象类型。
- 页面需要展示状态类型时，在页面 store 或视图本地定义；不要把服务端响应类型当共享 contract。
- web 项目被 Hono 托管后，前端不写 host、port、origin；API basePath 使用当前托管 basePath 下的相对入口，或从 window.location.pathname 第一段推导出 /package-name/api。
- window.location.pathname 只允许读取 Hono 托管 basePath，禁止用于前端页面路由判断、页面切换或条件渲染。
- 同一个 web 项目的页面、store action 和 API client 只访问该项目 basePath 下的私有 API，例如 /admin-web/api/...；禁止请求 /admin-api、/api/admin、硬编码另一个 web 项目的 basePath、独立 API 前缀、host、port、origin 或跨项目私有 API。
- 页面不要直接请求第三方或远端 API；第三方 API 由服务端 Hono 接口封装，再由页面请求本项目 API。
- 页面请求的 loading、error、data 等业务状态进入 store；组件只响应状态变化并触发 action。
- 页面订阅 SSE 或 WebSocket 时，连接生命周期和消息处理进入 store action。

## 后端网络 - 外部 HTTP

- 第三方或远端普通 HTTP API 使用 Hono `hc` 风格，禁止在业务代码里散写裸 `fetch`。
- 第三方没有 Hono 类型时，创建最小 typed wrapper 模拟 hc 调用形态；响应类型在调用点内联，不为单点请求抽顶层 type/schema。
- 同进程 Hono 子路由复用不是外部 HTTP 调用，应使用 `app.request()`。
- 单调用点响应类型内联写在临近 route 或 `ctx.json<T>(...)` 泛型里，禁止为了单点请求抽顶层 type/schema。
- 服务端接口禁止 `ctx.json() as ...`；响应类型写进 `ctx.json<T>(...)` 泛型参数。

## 后端网络 - 外部 HTTP 示例

```ts
const route = new Hono().post("/chat/completions", (ctx) => ctx.json<{
  choices: { message?: { content?: string } }[];
} | {
  error: { code?: string; message: string; type?: string };
}>({ choices: [] });
const response = await hc<typeof route>("https://api.example.com/v1").chat.completions.$post({
  json: input,
});
const body = await response.json();
return ctx.json(body);
```

## 前端/后端网络 - SSE

- SSE 不伪装成普通 JSON 请求；Hono 服务端按事件流输出，页面或服务端消费者使用 `EventSource` 或明确的流式 reader 消费。
- Hono 实现 SSE 接口时，route 只负责建立事件流、写事件和处理关闭；业务事件来源放在业务对象或 store action 边界内。
- SSE 数据进入仓库 action 的事件入口，由仓库按事件增量更新业务状态。
- SSE 数据写入业务状态时，前端使用 zustand-store-styleskill「前端仓库」，后端使用 zustand-store-styleskill「后端仓库」。
- 错误和关闭必须显式处理；至少关闭连接、清理订阅、释放 loading 或 streaming 状态、写入错误状态或错误事件，不要用空 catch 或静默兜底隐藏连接失败。

## 前端网络 - SSE 示例

```ts
const events = new EventSource(`${origin}/events`);
events.addEventListener("message", (event) => {
  const data = JSON.parse(event.data) as { text: string };
  messageReceive(data.text);
});
events.addEventListener("error", () => {
  events.close();
});
```

## 前端/后端网络 - WebSocket

- Hono 实现 WebSocket 接口时使用明确的 WebSocket 升级入口，不伪装成普通 HTTP JSON 接口。
- 页面或服务端连接 WebSocket 时优先使用 Hono `hc` 的 `$ws()` 获取连接；第三方非 Hono WebSocket 按对方协议建立连接。
- WebSocket 消息进入仓库 action 的事件入口，由仓库分发到具体业务状态。
- WebSocket 消息写入业务状态时，前端使用 zustand-store-styleskill「前端仓库」，后端使用 zustand-store-styleskill「后端仓库」。
- 连接 open、message、error、close 行为必须显式表达，不写隐藏失败的兼容逻辑。

## 前端/后端网络 - WebSocket 示例

```ts
const route = new Hono().get("/ws", upgradeWebSocket(() => ({
  onMessage: () => undefined,
})));
const socket = hc<typeof route>(origin).ws.$ws();
socket.addEventListener("open", () => {
  socket.send(JSON.stringify({ type: "hello" }));
});
socket.addEventListener("message", (event) => {
  const data = JSON.parse(String(event.data)) as { type: string };
  messageReceive(data.type);
});
socket.addEventListener("error", () => {
  socket.close();
});
```

## 后端网络 - 同进程 Hono

- 同进程 Hono 子路由复用优先 `app.request()`，不要绕到网络层。
- 只在复用 HTTP 路由语义时使用同进程请求；纯业务逻辑复用优先仓库 action 或业务对象方法。
- 响应透传时保持 `ctx.json<T>(...)` 类型约束，不使用 `ctx.json() as ...`。

## 后端网络 - 同进程 Hono 示例

```ts
const response = await codextplRouter.request("/tpl/source");
const body = await response.json();
return ctx.json(body);
```
