#!/usr/bin/env bash
set -euo pipefail
BASE="https://garudhub.com/assets"
ROOT="$(cd "$(dirname "$0")/.." && pwd)/public/assets"
mkdir -p "$ROOT/css/header" "$ROOT/js" "$ROOT/images"

curl -fsSL "$BASE/css/bootstrap.min.css" -o "$ROOT/css/bootstrap.min.css"
curl -fsSL "$BASE/css/style.css" -o "$ROOT/css/style.css"
curl -fsSL "$BASE/css/hero-slider.css" -o "$ROOT/css/hero-slider.css"
curl -fsSL "$BASE/css/subscription-plans.css" -o "$ROOT/css/subscription-plans.css"
curl -fsSL "$BASE/css/header/header-core.css" -o "$ROOT/css/header/header-core.css"
curl -fsSL "$BASE/css/header/header-mega.css" -o "$ROOT/css/header/header-mega.css"
curl -fsSL "$BASE/css/header/header-mobile.css" -o "$ROOT/css/header/header-mobile.css"
curl -fsSL "$BASE/js/bootstrap.bundle.min.js" -o "$ROOT/js/bootstrap.bundle.min.js"
curl -fsSL "$BASE/js/main.js" -o "$ROOT/js/main.js"
curl -fsSL "$BASE/js/header-desktop.js" -o "$ROOT/js/header-desktop.js"
curl -fsSL "$BASE/js/header-mobile.js" -o "$ROOT/js/header-mobile.js"
curl -fsSL "$BASE/images/favicon.ico" -o "$ROOT/images/favicon.ico"

echo "Mirrored garudhub assets to public/assets"
