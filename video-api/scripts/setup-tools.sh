#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${ROOT_DIR}/bin"
YTDLP_BIN="${BIN_DIR}/yt-dlp"

mkdir -p "${BIN_DIR}"

case "$(uname -s)" in
  Darwin)
    YTDLP_ASSET="yt-dlp_macos"
    ;;
  Linux)
    YTDLP_ASSET="yt-dlp_linux"
    ;;
  *)
    YTDLP_ASSET="yt-dlp"
    ;;
esac

YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/${YTDLP_ASSET}"

echo "Downloading ${YTDLP_ASSET} (standalone, no system Python required)..."
curl -fsSL "${YTDLP_URL}" -o "${YTDLP_BIN}"
chmod +x "${YTDLP_BIN}"

echo "yt-dlp installed: $("${YTDLP_BIN}" --version)"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo ""
  echo "ffmpeg is not installed. Install it with:"
  echo "  macOS:  brew install ffmpeg"
  echo "  Linux:  sudo apt install -y ffmpeg"
  echo ""
  echo "Then set FFMPEG_PATH in .env.development if needed."
else
  echo "ffmpeg found: $(command -v ffmpeg)"
fi

echo ""
echo "Set in .env.development:"
echo "  YTDLP_PATH=./bin/yt-dlp"
