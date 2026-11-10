"""Build the worksheet sans font (Euclid Sans) from GNU FreeFont FreeSans.

Euclid Sans is FreeSans with three changes:
  1. The degree sign is tightened. FreeSans draws ° with a wide right side
     bearing, so "38° angle" printed as "38 ° angle". The glyph is moved left
     and its advance cut so it sits against the number.
  2. Glyphs the bold faces lack (✓ ⟨ ⟩) are copied in from the regular face.
  3. The fonts are subset to the scripts and symbols worksheets use (Latin,
     Greek, math operators, arrows, super/subscripts, combining marks), which
     keeps each file small. Anything outside the subset falls back to
     DejaVu Sans in the PDF (see src/components/pdfFonts.ts).

FreeSans is GPLv3 with the font exception, so embedding it in a PDF puts no
license on the document. See public/fonts/FREEFONT-LICENSE.txt.

Usage: python3 scripts/build-worksheet-fonts.py <freefont dir> <out dir>
       (Debian/Ubuntu: /usr/share/fonts/truetype/freefont, package fonts-freefont-ttf)
Needs: pip install fonttools
"""
import copy
import os
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

FACES = {
    "FreeSans.ttf": "EuclidSans-Regular.ttf",
    "FreeSansBold.ttf": "EuclidSans-Bold.ttf",
    "FreeSansOblique.ttf": "EuclidSans-Oblique.ttf",
    "FreeSansBoldOblique.ttf": "EuclidSans-BoldOblique.ttf",
}
STYLE = {
    "EuclidSans-Regular.ttf": "Regular",
    "EuclidSans-Bold.ttf": "Bold",
    "EuclidSans-Oblique.ttf": "Oblique",
    "EuclidSans-BoldOblique.ttf": "Bold Oblique",
}

UNICODES = (
    list(range(0x20, 0x7F))        # ASCII
    + list(range(0xA0, 0x180))     # Latin-1, Latin Extended A
    + list(range(0x2B0, 0x370))    # spacing modifiers, combining marks
    + [0x233]                      # ȳ (Latin Extended B, used for "y bar")
    + list(range(0x370, 0x400))    # Greek
    + list(range(0x1D00, 0x1DC0))  # phonetic extensions (superscript letters)
    + list(range(0x2000, 0x2070))  # punctuation (– … ′ ⁄)
    + list(range(0x2070, 0x20A0))  # super- and subscripts
    + list(range(0x2100, 0x2150))  # letterlike (ℓ)
    + list(range(0x2150, 0x2190))  # number forms (⅓)
    + list(range(0x2190, 0x2200))  # arrows
    + list(range(0x2200, 0x2300))  # math operators
    + list(range(0x2300, 0x2400))  # misc technical
    + list(range(0x25A0, 0x2600))  # geometric shapes (△)
    + list(range(0x2700, 0x27C0))  # dingbats (✓)
    + list(range(0x27C0, 0x2800))  # misc math A (⟨ ⟩)
)

COPY_FROM_REGULAR = [0x2713, 0x27E8, 0x27E9]  # ✓ ⟨ ⟩


def tighten_degree(font: TTFont) -> None:
    upm = font["head"].unitsPerEm
    name = font.getBestCmap()[0xB0]
    glyph = font["glyf"][name]
    glyph.recalcBounds(font["glyf"])
    adv, _lsb = font["hmtx"][name]
    target_lsb = round(0.05 * upm)  # same small gap on both sides
    dx = target_lsb - glyph.xMin
    coords = glyph.getCoordinates(font["glyf"])[0]
    coords.translate((dx, 0))
    glyph.recalcBounds(font["glyf"])
    font["hmtx"][name] = (glyph.xMax + target_lsb, glyph.xMin)


def copy_glyphs(dst: TTFont, src: TTFont, codepoints) -> None:
    dcmap, scmap = dst.getBestCmap(), src.getBestCmap()
    order = dst.getGlyphOrder()
    for cp in codepoints:
        if cp in dcmap or cp not in scmap:
            continue
        sname = scmap[cp]
        g = src["glyf"][sname]
        if g.isComposite():
            continue
        name = f"uni{cp:04X}"
        order.append(name)
        dst["glyf"].glyphOrder = order
        dst["glyf"][name] = copy.deepcopy(g)
        dst["hmtx"][name] = src["hmtx"][sname]
        for table in dst["cmap"].tables:
            if table.isUnicode():
                table.cmap[cp] = name
    dst.setGlyphOrder(order)
    dst["maxp"].numGlyphs = len(order)


def rename(font: TTFont, style: str) -> None:
    family = "Euclid Sans"
    full = f"{family} {style}" if style != "Regular" else family
    ps = f"EuclidSans-{style.replace(' ', '')}"
    for rec in font["name"].names:
        if rec.nameID in (1, 16):
            rec.string = family
        elif rec.nameID == 4:
            rec.string = full
        elif rec.nameID == 6:
            rec.string = ps
        elif rec.nameID == 3:
            rec.string = f"{ps} (derived from GNU FreeFont FreeSans)"


def main(src_dir: str, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    regular = TTFont(os.path.join(src_dir, "FreeSans.ttf"))
    for src, out in FACES.items():
        font = TTFont(os.path.join(src_dir, src))
        copy_glyphs(font, regular, COPY_FROM_REGULAR)
        tighten_degree(font)
        opts = Options()
        opts.layout_features = ["kern", "mark", "mkmk", "ccmp"]
        opts.name_IDs = ["*"]
        opts.name_languages = ["*"]
        opts.notdef_outline = True
        opts.glyph_names = True
        sub = Subsetter(opts)
        sub.populate(unicodes=UNICODES)
        sub.subset(font)
        rename(font, STYLE[out])
        font.save(os.path.join(out_dir, out))
        print(out, os.path.getsize(os.path.join(out_dir, out)), "bytes")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
