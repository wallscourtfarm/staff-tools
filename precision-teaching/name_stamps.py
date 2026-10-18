"""Name stamps (privacy plan, 18.10.26): printed sheets are drawn with each child's INITIALS; every place a real name
could be written is logged and embedded in the PDF's /Keywords ("WFASTAMPS2:" + JSON). The teacher's own browser
(staff-tools "Name Stamper") then writes the real names over the initials, so a names file never reaches this server.

Usage:  name_stamps.begin();  ...draw with name_stamps.log(...)...;  pdf = name_stamps.finish(pdf_bytes)
"""
import io
import json

_LOG = None


def begin():
    global _LOG
    _LOG = []


def log(c, x, y, label, size, pupil_code, *, post="", bold=True, align="l", cover=(1, 1, 1), color=(0, 0, 0)):
    """x is the left edge (align 'l'), the centre ('c') or the right edge ('r') of the WHOLE string label+post.
    The browser draws  <full name><post>  in the same place, covering the original with the `cover` colour."""
    if _LOG is None or not pupil_code:
        return
    font = "Helvetica-Bold" if bold else "Helvetica"
    rec = {"pg": c.getPageNumber() - 1, "id": pupil_code, "x": round(x, 2), "y": round(y, 2),
           "w": round(c.stringWidth((label or "") + post, font, size), 2), "s": size, "m": "n", "a": align,
           "b": 1 if bold else 0, "cv": [round(v, 3) for v in cover], "tc": [round(v, 3) for v in color]}
    if post:
        rec["pst"] = post
    _LOG.append(rec)


def finish(pdf_bytes):
    """Embed the log in the PDF and stop logging. Returns the PDF bytes."""
    global _LOG
    stamps, _LOG = _LOG or [], None
    from pypdf import PdfReader, PdfWriter
    w = PdfWriter(clone_from=PdfReader(io.BytesIO(pdf_bytes)))
    w.add_metadata({"/Keywords": "WFASTAMPS2:" + json.dumps(stamps, separators=(",", ":"))})
    out = io.BytesIO()
    w.write(out)
    return out.getvalue()
