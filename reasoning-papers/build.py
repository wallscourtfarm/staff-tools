#!/usr/bin/env python3
"""Build reasoning-papers/index.html (one self-contained page) from src/.

Usage: python3 build.py <version e.g. 26.11.26a>
Topic lists: src/topics.json, made from the agreed RTP statements (rtp_final.json) and the extra
National Curriculum topics (curriculum_extra.json) by `python3 build.py --topics <dir with both files>`.
"""
import json, pathlib, sys, glob, re

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"

if len(sys.argv) > 2 and sys.argv[1] == "--topics":
    d = pathlib.Path(sys.argv[2])
    rtp = json.loads((d / "rtp_final.json").read_text())
    nc = json.loads((d / "curriculum_extra.json").read_text())
    out = {}
    for y in ["Y1", "Y2", "Y3", "Y4", "Y5", "Y6"]:
        rows = [s for s in rtp.get(y, []) if not s["nn"]]   # non-negotiables are listed under the year below
        out[y] = [{"id": s["id"], "year": y, "area": s["area"], "text": s["text"],
                   "code": None if s["new"] else s.get("code")} for s in rows]
        out[y] += [{"id": s["id"], "year": y, "area": s["area"], "text": s["text"], "nc": True} for s in nc.get(y, [])]
    (SRC / "topics.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print({y: len(v) for y, v in out.items()})
    sys.exit()

VERSION = sys.argv[1]
assert re.fullmatch(r"\d\d\.\d\d\.\d\d[a-z]?", VERSION), "version like 26.11.26a"
topics = json.loads((SRC / "topics.json").read_text())
js = [(SRC / "engine.js").read_text(), (SRC / "draw.js").read_text()]
js += [pathlib.Path(f).read_text() for f in sorted(glob.glob(str(SRC / "gens" / "*.js")))]
js.append(f"RP.TOPICS = {json.dumps(topics, ensure_ascii=False)};\nRP.VERSION = '{VERSION}';")
js.append((SRC / "app.js").read_text())
js = "\n".join(js).replace("</script", "<\\/script")
page = (SRC / "template.html").read_text().replace("/*CSS*/", (SRC / "app.css").read_text()).replace("/*JS*/", js)
(HERE / "index.html").write_text(page)
print("index.html", len(page), "bytes, version", VERSION)
