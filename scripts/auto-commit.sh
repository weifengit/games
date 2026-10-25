#!/usr/bin/env bash
# 会话结束自动提交（参考 /Users/sonoma/code/info_report 的收尾流程）
#
# 行为：
#   1. 有改动 → git add -A && git commit（一次改动一个提交，攒着不提交）
#   2. 没改动 → 安静退出
#   3. 存在 .no-auto-commit → 本次跳过（临时关掉自动提交用）
#   4. 记录到 .git/auto-commit.log，任何失败都不阻塞会话
#
# 手动执行：./scripts/auto-commit.sh
# 自定义消息：AUTO_COMMIT_MESSAGE="fix: xxx" ./scripts/auto-commit.sh
#
# 由 DSH Stop 钩子调用（~/.claude/hooks/dsh-auto-commit.sh 检测到 .auto-commit 标记后转交本脚本）。
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$ROOT/.git/auto-commit.log"
log() { mkdir -p "$(dirname "$LOG")" 2>/dev/null; printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"$LOG" 2>/dev/null || true; }

cd "$ROOT" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# 临时关闭开关
if [ -f "$ROOT/.no-auto-commit" ]; then
  log "跳过：存在 .no-auto-commit"
  exit 0
fi

# 没改动就退出
if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  exit 0
fi

git add -A || { log "git add 失败"; exit 0; }

# 统计本次改动
CHANGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
FILES=$(git diff --cached --name-only | head -8 | paste -sd ', ' - 2>/dev/null || true)
[ "$CHANGED" -gt 8 ] 2>/dev/null && FILES="$FILES …"

MSG="${AUTO_COMMIT_MESSAGE:-chore(auto): 会话结束自动提交（$(date '+%Y-%m-%d %H:%M')，${CHANGED} 个文件）}"

if git commit -m "$MSG" -m "changed: ${FILES:-$CHANGED files}" >>"$LOG" 2>&1; then
  log "已提交：$MSG"
else
  log "提交失败（保留暂存）：$MSG"
fi
exit 0
