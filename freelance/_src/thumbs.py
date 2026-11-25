"""Compose preview PNGs for the studio sample PDFs.

Usage: python3 freelance/_src/thumbs.py [doc-name ...]
Writes freelance/previews/<slug>.png (1600x1000, modal), <slug>-card.png (800x500, cards)
and <slug>-cover.png (first page, 640 px tall, hero).
Needs pdftoppm (poppler) on PATH and Pillow.
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # freelance/
PDF_DIR = os.path.join(ROOT, "samples", "pdf")
OUT = os.path.join(ROOT, "previews")

# doc-name: (pdf path relative to freelance/, preview slug, background, [interior pages to show])
DOCS = {
    "studio-services-guide": ("samples/pdf/Paulo_Creative_Studio_Services_Guide.pdf", "studio-services-guide", "#E9E1D5", [2, 4]),
    "apa7-formatting-guide": ("samples/pdf/APA_7_Formatting_Quick_Reference.pdf", "apa7-formatting-guide", "#DCE7E4", [3, 4]),
    "remote-security-checklist": ("samples/pdf/Remote_Work_Security_Checklist.pdf", "remote-security-checklist", "#DDE2EA", [2, 4]),
    "va-onboarding-kit": ("samples/pdf/Virtual_Assistant_Client_Onboarding_Kit.pdf", "va-onboarding-kit", "#EBDDDD", [2, 3]),
    "resume-template-pack": ("samples/pdf/Resume_and_Cover_Letter_Template_Pack.pdf", "resume-template-pack", "#E6E0D6", [2, 3]),
    "va-inbox-sop": ("samples/docx/Inbox_and_Calendar_Management_SOP.pdf", "va-inbox-sop", "#DCE3EC", [2, 3]),
}


def render(pdf, page, height):
    with tempfile.TemporaryDirectory() as tmp:
        base = os.path.join(tmp, "p")
        subprocess.run(["pdftoppm", "-f", str(page), "-l", str(page), "-scale-to-y", str(height), "-scale-to-x", "-1",
                        "-png", "-singlefile", pdf, base], check=True)
        return Image.open(base + ".png").convert("RGB")


def shadowed(canvas, img, xy, blur=18, offset=(0, 14), alpha=70):
    x, y = xy
    sh = Image.new("RGBA", (img.width + blur * 4, img.height + blur * 4), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([blur * 2, blur * 2, blur * 2 + img.width, blur * 2 + img.height], fill=(20, 16, 12, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(sh, (x - blur * 2 + offset[0], y - blur * 2 + offset[1]))
    canvas.paste(img, (x, y))


def compose(name):
    rel, slug, bg, inner = DOCS[name]
    pdf = os.path.join(ROOT, rel)
    if not os.path.exists(pdf):
        print("skip", name)
        return
    W, H = 1600, 1000
    canvas = Image.new("RGBA", (W, H), bg)
    ph = 820
    cover = render(pdf, 1, ph)
    a = render(pdf, inner[0], ph - 90)
    b = render(pdf, inner[1], ph - 90)
    top = (H - ph) // 2
    shadowed(canvas, b, (W - b.width - 90, top + 70))
    shadowed(canvas, a, (W - b.width - a.width + 40, top + 45))
    shadowed(canvas, cover, (110, top), blur=22, alpha=90)
    os.makedirs(OUT, exist_ok=True)
    full = canvas.convert("RGB")
    p1 = os.path.join(OUT, f"{slug}.png")
    full.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(p1, optimize=True)
    card = full.resize((800, 500), Image.LANCZOS)
    p2 = os.path.join(OUT, f"{slug}-card.png")
    card.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(p2, optimize=True)
    cov = render(pdf, 1, 640)
    p3 = os.path.join(OUT, f"{slug}-cover.png")
    cov.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(p3, optimize=True)
    print("png", os.path.relpath(p1), f"{os.path.getsize(p1)//1024} KB,", os.path.relpath(p2), f"{os.path.getsize(p2)//1024} KB")


if __name__ == "__main__":
    for n in (sys.argv[1:] or list(DOCS)):
        if n in DOCS:
            compose(n)
