#!/usr/bin/env bash
# 安装「小游戏总览」前端服务为 launchd 常驻服务（开机/登录自启，挂了自动拉起）。
#
#   ./frontend/install-launchd.sh      # 安装并启动
#   ./frontend/stop.sh                 # 停止（会一并卸载本服务）
#
# 为什么需要它：服务是 DSH 工作台「项目预览」的 iframe 来源，进程一死预览就是空白。
# 之前用 nohup 后台跑，机器睡眠 / 会话结束 / 误杀之后不会自己回来，预览也跟着失效。
# 交给 launchd 之后：登录即起，被杀了 10 秒内自动拉起。
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
PORT="${PORT:-8766}"
LABEL="com.games.catalog"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PY="$(command -v python3)"

cat >"$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PY</string>
    <string>$ROOT/frontend/server.py</string>
    <string>--port</string><string>$PORT</string>
  </array>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$ROOT/frontend/server.log</string>
  <key>StandardErrorPath</key><string>$ROOT/frontend/server.log</string>
</dict>
</plist>
PLIST_EOF

# 先停掉手工起的实例，避免端口冲突
if [ -f "$DIR/.server.pid" ]; then
  OLD="$(cat "$DIR/.server.pid")"
  kill "$OLD" 2>/dev/null || true
  rm -f "$DIR/.server.pid"
  sleep 0.5
fi

# 兜底：杀掉可能占用本端口的残余 python server 进程
pkill -f "frontend/server.py" 2>/dev/null || true
sleep 0.5

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart "gui/$(id -u)/$LABEL" 2>/dev/null || true
sleep 2

if curl -sf -m 5 -o /dev/null "http://127.0.0.1:$PORT/"; then
  echo "已安装并启动（launchd: ${LABEL}）"
  echo "  地址：http://127.0.0.1:$PORT/"
  echo "  日志：$ROOT/frontend/server.log"
  echo "  停止：./frontend/stop.sh（会卸载本服务）"
else
  echo "安装完成但探活失败，请查看日志：$ROOT/frontend/server.log" >&2
  tail -20 "$ROOT/frontend/server.log" >&2 || true
  exit 1
fi
