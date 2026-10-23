#!/usr/bin/env bash
# 启动「小游戏总览」前端服务。
#
#   ./frontend/start.sh          # 默认 8766 端口
#   PORT=9000 ./frontend/start.sh
#
# 优先交给 launchd 托管（登录自启 + 挂了自动拉起）；launchd 不可用时退回 nohup 后台常驻。
# 为什么要它：DSH 插件 dsh-tokensave 的项目中心靠**真实探端口**判断「● 已启动」，
# 探不到就是「○ 未启动」，工作台的项目预览也就不会出现。服务跑起来，端口就在听。
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-8766}"
LABEL="com.games.catalog"

if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  launchctl kickstart -k "gui/$(id -u)/$LABEL" 2>/dev/null || true
  sleep 1.5
  echo "已由 launchd 托管，重新拉起：http://127.0.0.1:$PORT/"
  echo "停止：./frontend/stop.sh"
  exit 0
fi

# 没交给 launchd（或上次被 stop.sh 卸载）→ 交给安装脚本
exec "$DIR/install-launchd.sh"
