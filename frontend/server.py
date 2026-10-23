#!/usr/bin/env python3
"""小游戏总览服务（仅标准库）。

端点：
  GET /                    -> 总览页 frontend/index.html
  GET /frontend/<path>     -> 前端静态资源（app.js / styles.css 等）
  GET /api/catalog         -> 子游戏列表（实时扫描 subprojects/ + 合并 frontend/catalog.json 元数据）
  GET /api/catalog/<dir>   -> 单个子游戏详情（subprompt.md、文件树、入口是否存在）
  GET /projects/<dir>/<path> -> 子游戏静态文件（供「进入游戏」直接打开或 iframe 嵌入）
  GET /api/snapshot?dump=1 -> 把合并后的 catalog 写入 catalog.snapshot.json（不入库）

启动：python3 frontend/server.py        # http://127.0.0.1:8766/
      python3 frontend/server.py --dump  # 只生成快照并退出
"""

import argparse
import json
import mimetypes
import posixpath
import re
import stat as statmod
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUBPROJECTS = ROOT / "subprojects"
CATALOG_JSON = ROOT / "frontend" / "catalog.json"
SNAPSHOT_JSON = ROOT / "frontend" / "catalog.snapshot.json"
FRONTEND_DIR = ROOT / "frontend"

PORT = 8766
HOST = "0.0.0.0"

SKIP_DIRS = {".git", "__pycache__", ".venv", "node_modules"}
SKIP_FILES = {".DS_Store"}
TEXT_EXTS = {".md", ".html", ".htm", ".js", ".css", ".json", ".txt", ".py", ".toml", ".env", ".svg", ".csv"}


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat()


def load_manual_catalog() -> dict:
    """返回 {dir: metadata} 映射，缺失文件时返回空。"""
    if not CATALOG_JSON.exists():
        return {}
    try:
        data = json.loads(CATALOG_JSON.read_text(encoding="utf-8"))
        return {p["dir"]: p for p in data.get("projects", []) if p.get("dir")}
    except Exception as exc:  # pragma: no cover - 防御性
        print(f"[catalog] 读取 catalog.json 失败：{exc}")
        return {}


def scan_subprojects() -> list[dict]:
    """实时扫描 subprojects/，返回目录级信息（不含文件内容）。"""
    manual = load_manual_catalog()
    out = []
    if not SUBPROJECTS.exists():
        return out
    for entry in sorted(SUBPROJECTS.iterdir(), key=lambda p: p.name):
        if not entry.is_dir() or entry.name in SKIP_DIRS:
            continue
        meta = manual.get(entry.name, {})
        files = []
        total_lines = 0
        entry_file = None
        try:
            for f in sorted(entry.rglob("*")):
                rel = f.relative_to(entry)
                parts = rel.parts
                if any(part in SKIP_DIRS or part in SKIP_FILES for part in parts):
                    continue
                if f.is_file():
                    size = f.stat().st_size
                    files.append({"name": str(rel), "size": size})
                    if f.suffix.lower() in TEXT_EXTS:
                        try:
                            total_lines += sum(1 for _ in f.open("r", encoding="utf-8", errors="ignore"))
                        except OSError:
                            pass
                    if rel.name == meta.get("entry") or (not meta.get("entry") and rel.name == "index.html"):
                        entry_file = str(rel)
        except OSError:
            pass
        st = entry.stat()
        out.append({
            "dir": entry.name,
            "title": meta.get("title") or entry.name,
            "summary": meta.get("summary") or "",
            "category": meta.get("category") or "未分类",
            "tags": meta.get("tags") or [],
            "entry": meta.get("entry") or entry_file or "index.html",
            "entryLabel": meta.get("entryLabel") or "进入游戏",
            "command": meta.get("command") or "",
            "inputs": meta.get("inputs") or [],
            "outputs": meta.get("outputs") or [],
            "notes": meta.get("notes") or "",
            "files": files,
            "fileCount": len(files),
            "lines": total_lines,
            "updated": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).astimezone().isoformat(),
            "hasEntry": bool(entry_file) and (entry / entry_file).exists(),
            "url": f"/projects/{entry.name}/{meta.get('entry') or entry_file or 'index.html'}",
        })
    return out


def project_detail(dir_name: str) -> dict | None:
    target = SUBPROJECTS / dir_name
    if not target.is_dir():
        return None
    manual = load_manual_catalog().get(dir_name, {})
    subprompt = ""
    sp = target / "subprompt.md"
    if sp.exists():
        try:
            subprompt = sp.read_text(encoding="utf-8")
        except OSError:
            subprompt = ""
    files = []
    try:
        for f in sorted(target.rglob("*")):
            rel = f.relative_to(target)
            parts = rel.parts
            if any(part in SKIP_DIRS or part in SKIP_FILES for part in parts):
                continue
            if f.is_file():
                st = f.stat()
                files.append({
                    "name": str(rel),
                    "size": st.st_size,
                    "updated": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).astimezone().isoformat(),
                    "isText": f.suffix.lower() in TEXT_EXTS,
                })
    except OSError:
        pass
    return {
        "dir": dir_name,
        "title": manual.get("title") or dir_name,
        "summary": manual.get("summary") or "",
        "category": manual.get("category") or "未分类",
        "tags": manual.get("tags") or [],
        "entry": manual.get("entry") or "index.html",
        "entryLabel": manual.get("entryLabel") or "进入游戏",
        "command": manual.get("command") or "",
        "inputs": manual.get("inputs") or [],
        "outputs": manual.get("outputs") or [],
        "notes": manual.get("notes") or "",
        "subprompt": subprompt,
        "files": files,
        "url": f"/projects/{dir_name}/{manual.get('entry') or 'index.html'}",
    }


def write_snapshot() -> str:
    catalog = {"version": 1, "generatedAt": now_iso(), "projects": scan_subprojects()}
    SNAPSHOT_JSON.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(SNAPSHOT_JSON)


def safe_join(base: Path, *parts: str) -> Path | None:
    """拼接并防止目录遍历，越界返回 None。"""
    target = base
    for part in parts:
        target = target / part
    try:
        target.resolve().relative_to(base.resolve())
    except ValueError:
        return None
    return target


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # pragma: no cover - 保持简洁日志
        print("%s - - [%s] %s" % (self.address_string(), self.log_date_time_string(), fmt % args))

    def _send(self, code: int, body: bytes, content_type: str, headers: dict | None = None):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("X-Content-Type-Options", "nosniff")
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, fs_path: Path, content_type: str):
        try:
            st = fs_path.stat()
        except OSError:
            self._send(404, b"not found", "text/plain; charset=utf-8")
            return
        if st.st_mode & statmod.S_IFDIR:
            self._send(404, b"not found", "text/plain; charset=utf-8")
            return
        with fs_path.open("rb") as fh:
            data = fh.read()
        self._send(200, data, content_type, {"Cache-Control": "no-cache"})

    def _api(self, obj, code: int = 200):
        body = json.dumps(obj, ensure_ascii=False, indent=2).encode("utf-8")
        self._send(code, body, "application/json; charset=utf-8")

    def do_GET(self):  # noqa: N802
        path = posixpath.normpath(self.path.split("?", 1)[0])
        query = self.path.split("?", 1)[1] if "?" in self.path else ""

        if path == "/":
            self._send_file(FRONTEND_DIR / "index.html", "text/html; charset=utf-8")
            return
        if path.startswith("/frontend/"):
            rel = path[len("/frontend/"):]
            fs_path = safe_join(FRONTEND_DIR, rel)
            if fs_path is None or not fs_path.is_file():
                self._send(404, b"not found", "text/plain; charset=utf-8")
                return
            ctype, _ = mimetypes.guess_type(str(fs_path))
            self._send_file(fs_path, ctype or "application/octet-stream")
            return
        if path == "/api/catalog":
            self._api({"version": 1, "generatedAt": now_iso(), "projects": scan_subprojects()})
            return
        m = re.match(r"^/api/catalog/([^/]+)/?$", path)
        if m:
            detail = project_detail(m.group(1))
            if detail is None:
                self._api({"error": "not found"}, 404)
            else:
                self._api(detail)
            return
        if path == "/api/snapshot" and ("dump=1" in query or "dump" in query):
            try:
                p = write_snapshot()
                self._api({"ok": True, "snapshot": p})
            except Exception as exc:  # pragma: no cover
                self._api({"ok": False, "error": str(exc)}, 500)
            return
        m = re.match(r"^/projects/([^/]+)/(.+)$", path)
        if m:
            dir_name, rel = m.group(1), m.group(2)
            fs_path = safe_join(SUBPROJECTS / dir_name, rel)
            if fs_path is None or not fs_path.is_file():
                self._send(404, b"not found", "text/plain; charset=utf-8")
                return
            # HTML/JS/CSS 需允许被 iframe 嵌入与跨来源资源共享（游戏直接打开/预览都可用）
            ctype, _ = mimetypes.guess_type(str(fs_path))
            self._send_file(fs_path, ctype or "application/octet-stream")
            return
        self._send(404, b"not found", "text/plain; charset=utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description="小游戏总览前端服务")
    ap.add_argument("--host", default=HOST)
    ap.add_argument("--port", type=int, default=PORT)
    ap.add_argument("--dump", action="store_true", help="只生成 catalog.snapshot.json 快照后退出")
    args = ap.parse_args()

    if args.dump:
        p = write_snapshot()
        print(f"snapshot written: {p}")
        return

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"[games] frontend serving at http://{args.host}:{args.port}/  (root={ROOT})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
