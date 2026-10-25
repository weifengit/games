# 会话结束自动提交（参考 info_report 的收尾流程）

每次改完代码，收尾必须按顺序做，**不要攒着**：

1. **验证**：`./frontend/stop.sh >/dev/null 2>&1; ./frontend/start.sh` 后 `curl -sf -m 3 -o /dev/null http://127.0.0.1:8766/` 确认 200；
   改了 `frontend/app.js` 时顺手看浏览器 Console 是否报错。
2. **提交**：`./scripts/auto-commit.sh`（或手动 `git add -A && git commit -m "<动词> ...>"`）。
   - 一次改动一个提交，建议前缀：`feat:` 新功能 / `fix:` 修 bug / `chore:` 杂务 / `refactor:` 重构 / `docs:` 文档。
3. **回复里告诉用户本次改了什么、提交了哪些文件**。

## 自动提交（已配置）

- `scripts/auto-commit.sh`：检查改动 → 全部暂存 → 提交（消息 `chore(auto): 会话结束自动提交（时间，N 个文件）`）；
  没改动安静退出；存在 `.no-auto-commit` 时跳过；日志在 `.git/auto-commit.log`。
- DSH 的 `Stop` 钩子（`~/.claude/hooks/dsh-auto-commit.sh`）会在每轮会话结束时，
  对带 `.auto-commit` 标记的仓库自动调用上面的脚本——**不需要模型主动提交**。
- 临时关闭：`touch .no-auto-commit`；恢复：`rm .no-auto-commit`。

## 新增子游戏时

1. 放入 `subprojects/<YYYYMMDD_游戏名>/`（含 `index.html`）。
2. 在 `frontend/catalog.json` 的 `projects` 数组补一条元数据（`dir`/`title`/`summary`/`category`/`tags`/`entry`/`entryLabel`）。
3. 在子游戏目录放 `preview.svg`（或 `preview.png`）作为卡片封面。
4. 按上面的收尾流程验证并提交。

## 约定

- 产物/静态资源平铺在子项目目录内；预览图命名 `preview.svg` / `preview.png`。
- 前端服务由 launchd（`com.games.catalog`）常驻，端口 8766：`./frontend/start.sh` 拉起、`./frontend/stop.sh` 停止。
- 不要手改 `frontend/catalog.snapshot.json`（`--dump` 生成物）。
