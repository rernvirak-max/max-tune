import json
from pathlib import Path

reg = Path("src-pwa/register-service-worker.js").read_text(encoding="utf-8")
auth = Path("src/stores/auth-store.js").read_text(encoding="utf-8")
conn = Path("src/composables/useConnectivity.js").read_text(encoding="utf-8")
mani = Path("src-pwa/manifest.json").read_text(encoding="utf-8")
reexport = (
    "// Deprecated: Quasar default is register-service-worker.js\n"
    "import './register-service-worker.js'\n"
)
svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="MaxTune">
  <rect width="512" height="512" rx="96" fill="#07080c"/>
  <g fill="none" stroke="#3dffb5" stroke-width="28" stroke-linecap="round">
    <path d="M156 280v-48"/>
    <path d="M220 320V192"/>
    <path d="M284 340V172"/>
    <path d="M348 300V212"/>
  </g>
  <circle cx="256" cy="256" r="18" fill="#3dffb5"/>
</svg>
"""
m = json.loads(mani)
srcs = {i.get("src") for i in m["icons"]}
if "icons/icon.svg" not in srcs:
    m["icons"].insert(
        0,
        {
            "src": "icons/icon.svg",
            "sizes": "any",
            "type": "image/svg+xml",
            "purpose": "any",
        },
    )
mani2 = json.dumps(m, indent=2) + "\n"
Path("src-pwa/manifest.json").write_text(mani2, encoding="utf-8", newline="\n")
files = [
    {"path": "src-pwa/register-service-worker.js", "content": reg},
    {"path": "src-pwa/register-sw.js", "content": reexport},
    {"path": "src/stores/auth-store.js", "content": auth},
    {"path": "src/composables/useConnectivity.js", "content": conn},
    {"path": "src-pwa/manifest.json", "content": mani2},
    {"path": "public/icons/icon.svg", "content": svg},
]
out = {
    "owner": "rernvirak-max",
    "repo": "max-tune",
    "branch": "feature/phase-1.5-offline",
    "message": "fix(pwa): register-service-worker + real app icons",
    "files": files,
}
Path("_mcp_text_push.json").write_text(json.dumps(out), encoding="utf-8")
print("ok", Path("_mcp_text_push.json").stat().st_size)
for f in files:
    print(f["path"], len(f["content"]))
