# StreamForge — Vercel-ready MPD Inspector

This project is intentionally packaged for the repository root. There is NO package.json and NO public/ wrapper folder, which avoids Vercel trying to detect a Node entrypoint for a static site.

## Repository structure

index.html
vercel.json
api/inspect.js
api/convert.js

Deploy the contents of this folder directly to the root of your GitHub repository.

The app can inspect MPD manifests and identify common DRM markers. It does not bypass, extract, or decrypt DRM.
