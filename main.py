#!/usr/bin/env python3
"""小游戏仓库入口。

交互式选择并启动子游戏；主要用于本地开发调试。
日常使用请启动前端总览：python3 frontend/server.py  （http://127.0.0.1:8766/）
"""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
SUBPROJECTS = ROOT / "subprojects"


def list_projects():
    if not SUBPROJECTS.exists():
        return []
    return sorted(p for p in SUBPROJECTS.iterdir() if p.is_dir() and not p.name.startswith("."))


def main():
    projects = list_projects()
    if not projects:
        print("暂无子游戏，在 subprojects/ 下新增子项目目录即可。")
        return

    print("=== 小游戏仓库 · 子游戏列表 ===")
    for i, p in enumerate(projects, 1):
        print(f"{i}. {p.name}")
    print("0. 退出")
    print("启动前端总览：python3 frontend/server.py （http://127.0.0.1:8766/）")

    choice = input("\n请输入子游戏序号（直接打开 index.html）：").strip()
    if choice == "0":
        return
    try:
        idx = int(choice) - 1
        target = projects[idx]
    except (ValueError, IndexError):
        print("输入不合法。")
        return

    entry = target / "index.html"
    if not entry.exists():
        print(f"{target.name} 下没有 index.html，无法直接打开。")
        return

    if sys.platform == "darwin":
        subprocess.run(["open", str(entry)])
    elif sys.platform.startswith("linux"):
        subprocess.run(["xdg-open", str(entry)])
    else:
        os_startfile = getattr(__import__("os"), "startfile", None)
        if os_startfile:
            os_startfile(str(entry))
        else:
            print(f"请手动打开：{entry}")


if __name__ == "__main__":
    main()
