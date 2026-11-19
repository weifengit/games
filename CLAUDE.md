## 新增子游戏时

1. 放入 `subprojects/<YYYYMMDD_游戏名>/`（含 `index.html`）。
2. 在 `frontend/catalog.json` 的 `projects` 数组补一条元数据（`dir`/`title`/`summary`/`category`/`tags`/`entry`/`entryLabel`）。
3. 在子游戏目录放 `preview.svg`（或 `preview.png`）作为卡片封面。
4. 验证：`./frontend/start.sh` 后打开卡片确认能进子游戏，再提交。

## 约定

- 产物/静态资源平铺在子项目目录内；预览图命名 `preview.svg` / `preview.png`。
- 前端服务由 launchd（`com.games.catalog`）常驻，端口 8766：`./frontend/start.sh` 拉起、`./frontend/stop.sh` 停止。
- 不要手改 `frontend/catalog.snapshot.json`（`--dump` 生成物）。
