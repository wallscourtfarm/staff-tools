"""Stand-in for precision-teaching/name_stamps.py: this page draws the names itself, so nothing is logged."""
def begin():
    pass


def log(*a, **k):
    pass


def finish(pdf_bytes):
    return pdf_bytes
