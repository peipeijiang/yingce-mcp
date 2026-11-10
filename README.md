# yingce-mcp

影策（Yingce / open-ai-canvas）的 MCP 客户端插件。通过一个自托管的网关把图片、视频、短剧分镜、画布这些能力暴露成 MCP 工具，任何支持 MCP 的客户端（Codex、Claude Desktop、Cursor 等）都能直接调用。

## 前置条件

你的影策部署需要启用网关（服务端 `yingce-mcp` + nginx 的 `/mcp` 路由），并且你有一个属于自己账号的令牌。

服务器上签发令牌：

```bash
/opt/yingce-mcp/issue-token.sh <用户名> <令牌名> '["read","image","video","drama","canvas"]'
```

它会打印一次明文令牌，之后只存哈希。吊销：

```sql
update mcp_tokens set revoked_at = now() where id = 'MCP_xxxxxxxx';
```

## 安装

```bash
npx yingce-mcp --check     # 发布到 npm 后
# 或直接从仓库安装
npx github:<owner>/yingce-mcp --check
```

## 配置

两个环境变量：

| 变量 | 说明 |
| :--- | :--- |
| `YINGCE_BASE_URL` | 你的影策地址，例如 `http://152.136.42.128:3000` |
| `YINGCE_TOKEN` | 你的 MCP 令牌（`mcp_` 开头） |

以 Codex 为例（`~/.codex/config.toml`）：

```toml
[mcp_servers.yingce]
command = "npx"
args = ["-y", "yingce-mcp"]
env = { YINGCE_BASE_URL = "http://152.136.42.128:3000", YINGCE_TOKEN = "mcp_xxx" }
```

## 工具

| 工具 | 说明 | 作用域 |
| :--- | :--- | :--- |
| `yingce_list_projects` | 列出账号下的项目 | read |
| `yingce_get_task` | 查询生成任务状态与产物 | read |
| `yingce_submit_image` | 提交出图任务，支持参考图与 `dryRun` 预演 | image |
| `yingce_submit_video` | 提交出片任务，支持首帧/尾帧锚点、参考视频音频与 `dryRun` 预演 | video |
| `yingce_retry_task` | 重试失败任务（会重新预占积分） | task |
| `yingce_cancel_task` | 取消排队或运行中的任务 | task |
| `yingce_drama_get` | 读短剧结构（集、镜头数、阶段） | read |
| `yingce_drama_episode` | 读某一集的镜头细节 | read |
| `yingce_drama_update_shot` | 改镜头字段（台词/动作/提示词/时长等） | drama |
| `yingce_canvas_list` | 列画布 | read |
| `yingce_canvas_get` | 读画布节点与连线 | read |
| `yingce_canvas_sync_status` | 读版本号与编辑租约 | read |
| `yingce_canvas_apply` | 应用画布变更（自动补字段基线、租约冲突保护） | canvas |
| `yingce_canvas_add_image` | 把生成资源回填成画布图片节点（自动注册资产） | canvas |
| `yingce_assets_list` | 列项目资产 | read |
| `yingce_resources_list` | 列最近生成的资源，拿 id 当参考图 | read |
| `yingce_drama_cast_list` | 列短剧角色与当前形象资源 | read |
| `yingce_drama_set_cast_image` | 把图片设为角色形象（短剧回填的正确入口） | drama |
| `yingce_canvas_share` | 查看 / 创建 / 撤销画布分享链接 | canvas |
| `yingce_canvas_arrange` | 按网格重排画布节点 | canvas |

## 安全说明

- 令牌只属于一个账号，服务端按令牌解析身份，工具参数里没有 userId，无法跨账号访问。
- 服务端把令牌换成两小时的短会话，过期自动续。
- 付费操作有上限与预演：单次出图最多 8 张、视频参考图最多 3 张，`dryRun: true` 只算不提交。
- 首尾帧锚点与参考图互斥：同时传会被直接拒绝，避免上游 400。

## 许可证

MIT

