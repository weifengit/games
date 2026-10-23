#!/usr/bin/env bash
# 停掉「小游戏总览」前端服务（与 start.sh 配对）。
#
# 服务由 launchd 托管时，光 kill 进程会被自动拉起，所以这里要**卸载**服务：
#   停止 + 取消登录自启；下次 ./frontend/start.sh 会重新安装并启动。
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDFILE="$DIR/.server.pid"
LABEL="com.games.catalog"

stopped=0
if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  stopped=1
fi
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -f "$PIDFILE" ]; then
  PID="$(cat "$PIDFILE")"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    sleep 0.5
    kill -9 "$PID" 2>/dev/null || true
    stopped=1
  fi
  rm -f "$PIDFILE"
fi

if [ "$stopped" = "1" ]; then
  echo "已停止（并取消登录自启）"
else
  echo "没有在运行。"
fi
