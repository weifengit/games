# 小游戏仓库工作清单

## 已完成
- [x] 参考 /Users/sonoma/code/analyseprojects 模式搭建框架：subprojects/ + frontend/ + 根 package.json(previewUrl)
- [x] 将 /Users/sonoma/code/dsh/playground/snake/index.html 迁入 subprojects/snake/index.html
- [x] frontend/catalog.json 登记 snake 元数据
- [x] frontend/server.py：实时扫描子项目 + /api/catalog + /projects/* 静态托管
- [x] frontend/index.html/app.js/styles.css：卡片列表、详情抽屉、「进入游戏」按钮
- [x] 根 package.json 声明 previewUrl（供 dsh-tokensave 项目中心 / 项目预览识别）
- [x] 前端常驻：frontend/{start,stop,install-launchd}.sh，launchd label `com.games.catalog`，端口 8766，开机/登录自启 + 挂了自动拉起（KeepAlive，ThrottleInterval 10s）
- [x] 现代游戏平台风格 UI + 6 套主题色 × 跟随系统/浅色/深色（localStorage + URL 参数）
- [x] 游戏卡片 preview.svg 截图封面 + 「进入游戏」按钮；详情页按需显示字段 + Markdown 渲染 subprompt.md
- [x] 自动提交（参考 info_report 收尾流程）：
      - `scripts/auto-commit.sh`：有改动 → `git add -A && git commit`，没改动安静退出，`.no-auto-commit` 可临时关闭，日志 `.git/auto-commit.log`
      - DSH `Stop` 钩子：`~/.claude/dsh-hooks.json` + `~/.claude/hooks/dsh-auto-commit.sh`，经 `@deepseek-ai/dsh-hooks-claude-code` 桥接挂载在 `~/.dsh/profiles/web/cordis.patch.yml`
      - 仓库 opt-in 标记：`.auto-commit`（无标记的仓库不会被自动提交）
      - 每轮会话结束自动提交，无需模型主动提醒

## 待办 / 可继续
- [ ] 陆续将更多小游戏放入 subprojects/<YYYYMMDD_游戏名>/，并在 frontend/catalog.json 补元数据 + preview.svg
- [ ] 如需临时关闭自动提交：`touch .no-auto-commit`；恢复：`rm .no-auto-commit`
