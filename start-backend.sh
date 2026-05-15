#!/usr/bin/env bash
# 只启动 FastAPI 后端（默认端口见 .env 的 API_PORT，一般为 13555）。
#
# 适用场景：已安装「桌面客户端 .exe / AppImage」时——你自己双击打开客户端，
# 在本机先运行本脚本（或保持终端不关），客户端即可连上本机 API。
#
# 与 ./start-dev-desktop.sh 区别：本脚本不会启动 Vite、也不会打开 Electron 开发窗口。
# 依赖：uv；npm 仅用于执行 package.json 里的 dev:api（需已 npm install、uv sync）

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

for cmd in npm uv; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "未找到命令: $cmd，请先安装后再运行本脚本。" >&2
    exit 1
  fi
done

if [[ ! -d node_modules ]]; then
  echo "正在安装前端依赖 (npm install)..."
  npm install
fi

if [[ ! -d .venv ]]; then
  echo "正在创建 Python 虚拟环境并安装依赖 (uv sync)..."
  uv sync
fi

echo "仅启动后端：uvicorn（.env 中 API_PORT，默认 13555）。桌面安装版请另手动打开客户端。"
exec npm run dev:api
