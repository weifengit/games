# 小游戏仓库工作清单

## 已完成
- [x] 参考 /Users/sonoma/code/analyseprojects 模式搭建框架：subprojects/ + frontend/ + 根 package.json(previewUrl)
- [x] 将 /Users/sonoma/code/dsh/playground/snake/index.html 迁入 subprojects/snake/index.html
- [x] frontend/catalog.json 登记 snake 元数据
- [x] frontend/server.py：实时扫描子项目 + /api/catalog + /projects/* 静态托管
- [x] frontend/index.html/app.js/styles.css：卡片列表、详情抽屉、「进入游戏」按钮
- [x] 根 package.json 声明 previewUrl（供 dsh-tokensave 项目中心 / 项目预览识别）

- [x] 前端常驻：frontend/{start,stop,install-launchd}.sh，launchd label `com.games.catalog`，端口 8766，开机/登录自启 + 挂了自动拉起（KeepAlive，ThrottleInterval 10s）
## 待办 / 可继续
- [ ] 启动前端：python3 frontend/server.py，验证 http://127.0.0.1:8766/ 卡片与进入游戏
- [ ] 陆续将更多小游戏放入 subprojects/<YYYYMMDD_游戏名>/，并在 frontend/catalog.json 补元数据
- [x] 如需常驻：frontend/{start,stop,install-launchd}.sh（launchd com.games.catalog，端口 8766）已安装并运行
