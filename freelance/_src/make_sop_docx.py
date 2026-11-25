"""Build the Word sample: Inbox and Calendar Management SOP (python-docx).

Usage: python3 freelance/_src/make_sop_docx.py [--toc-pages "3,3,4,..."]
Then convert to PDF for the preview:  soffice --headless --convert-to pdf --outdir freelance/samples/docx freelance/samples/docx/Inbox_and_Calendar_Management_SOP.docx
The table of contents is a real Word TOC field (press F9 in Word to refresh); the cached
entries let it display correctly before the first refresh.
"""
import os
import sys

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Inches, Cm

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "samples", "docx", "Inbox_and_Calendar_Management_SOP.docx")

INK = RGBColor(0x1A, 0x17, 0x14)
MUTED = RGBColor(0x6E, 0x66, 0x5D)
ACCENT = RGBColor(0x1F, 0x4E, 0x79)
HEAD_FONT = "Cambria"
BODY_FONT = "Calibri"


def set_cell_bg(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_table_borders(table, color="D9D2C7"):
    tblPr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "bottom", "insideH"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "6")
        el.set(qn("w:color"), color)
        borders.append(el)
    for edge in ("left", "right", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "nil")
        borders.append(el)
    tblPr.append(borders)


def fix_widths(t, widths):
    t.autofit = False
    for i, w in enumerate(widths):
        t.columns[i].width = Inches(w)
    for row in t.rows:
        trPr = row._tr.get_or_add_trPr()
        cs = OxmlElement("w:cantSplit")
        cs.set(qn("w:val"), "true")
        trPr.append(cs)
        for i, w in enumerate(widths):
            row.cells[i].width = Inches(w)


def add_field(run, instr):
    for kind, text in (("begin", None), ("instr", instr), ("separate", None), ("text", "1"), ("end", None)):
        if kind == "instr":
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = text
        elif kind == "text":
            el = OxmlElement("w:t")
            el.text = text
        else:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), kind)
        run._r.append(el)


def para_border_bottom(p, color="1A1714", sz="8"):
    pPr = p._p.get_or_add_pPr()
    bdr = OxmlElement("w:pBdr")
    b = OxmlElement("w:bottom")
    b.set(qn("w:val"), "single")
    b.set(qn("w:sz"), sz)
    b.set(qn("w:space"), "6")
    b.set(qn("w:color"), color)
    bdr.append(b)
    pPr.append(bdr)


def setup_styles(doc):
    st = doc.styles
    normal = st["Normal"]
    normal.font.name = BODY_FONT
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = INK
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), BODY_FONT)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.2

    for name, size, before, after, color in (("Title", 30, 0, 6, INK), ("Heading 1", 17, 18, 6, INK), ("Heading 2", 12.5, 12, 4, ACCENT)):
        s = st[name]
        s.font.name = HEAD_FONT
        s.element.rPr.rFonts.set(qn("w:asciiTheme"), "") if False else None
        rFonts = s.element.rPr.rFonts
        for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            rFonts.set(qn(attr), HEAD_FONT)
        for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
            if rFonts.get(qn(attr)) is not None:
                del rFonts.attrib[qn(attr)]
        s.font.size = Pt(size)
        s.font.bold = name != "Title"
        s.font.color.rgb = color
        s.paragraph_format.space_before = Pt(before)
        s.paragraph_format.space_after = Pt(after)
        s.paragraph_format.keep_with_next = True
    st["Title"].font.bold = False

    sub = st["Subtitle"]
    sub.font.name = BODY_FONT
    sub.font.size = Pt(12)
    sub.font.italic = False
    sub.font.color.rgb = MUTED

    for name in ("List Number", "List Bullet"):
        st[name].font.name = BODY_FONT
        st[name].font.size = Pt(10.5)
        st[name].paragraph_format.space_after = Pt(3)


def kicker(doc, text):
    p = doc.add_paragraph()
    r = p.add_run(text.upper())
    r.font.size = Pt(8)
    r.font.bold = True
    r.font.color.rgb = ACCENT
    r.font.name = BODY_FONT
    rPr = r._r.get_or_add_rPr()
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:val"), "30")
    rPr.append(sp)
    p.paragraph_format.space_after = Pt(2)
    return p


def table(doc, header, rows, widths):
    t = doc.add_table(rows=1, cols=len(header))
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    set_table_borders(t)
    for i, h in enumerate(header):
        c = t.rows[0].cells[i]
        set_cell_bg(c, "1A1714")
        c.text = ""
        r = c.paragraphs[0].add_run(h)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0xFB, 0xF8, 0xF3)
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ""
            r = cells[i].paragraphs[0].add_run(v)
            r.font.size = Pt(9.5)
            if i == 0:
                r.font.bold = True
    fix_widths(t, widths)
    # mark header row to repeat
    trPr = t.rows[0]._tr.get_or_add_trPr()
    th = OxmlElement("w:tblHeader")
    th.set(qn("w:val"), "true")
    trPr.append(th)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


def callout(doc, label, text):
    t = doc.add_table(rows=1, cols=1)
    c = t.rows[0].cells[0]
    set_cell_bg(c, "EAF0F6")
    tcPr = c._tc.get_or_add_tcPr()
    b = OxmlElement("w:tcBorders")
    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), "24")
    left.set(qn("w:color"), "1F4E79")
    b.append(left)
    tcPr.append(b)
    fix_widths(t, [6.5])
    p = c.paragraphs[0]
    r = p.add_run(label.upper() + "   ")
    r.font.bold = True
    r.font.size = Pt(8)
    r.font.color.rgb = ACCENT
    p.add_run(text).font.size = Pt(10)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


TOC = [
    ("1", "Purpose and scope"),
    ("2", "Roles"),
    ("3", "Daily inbox routine"),
    ("4", "Labels and folders"),
    ("5", "Reply templates"),
    ("6", "Calendar rules"),
    ("7", "When to contact the client right away"),
    ("8", "Weekly review"),
    ("", "Revision history"),
]


def add_toc(doc, pages):
    p = doc.add_paragraph()
    tab_stops = p.paragraph_format.tab_stops
    r = p.add_run()
    fld = OxmlElement("w:fldChar"); fld.set(qn("w:fldCharType"), "begin"); r._r.append(fld)
    instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve"); instr.text = 'TOC \\o "1-1" \\h \\z \\u'; r._r.append(instr)
    sep = OxmlElement("w:fldChar"); sep.set(qn("w:fldCharType"), "separate"); r._r.append(sep)
    first = True
    for (num, title), pg in zip(TOC, pages):
        q = p if first else doc.add_paragraph()
        first = False
        q.paragraph_format.tab_stops.add_tab_stop(Inches(6.0), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
        q.paragraph_format.space_after = Pt(5)
        label = f"{num}.  {title}" if num else title
        q.add_run(label + "\t" + str(pg)).font.size = Pt(11)
    end = OxmlElement("w:fldChar"); end.set(qn("w:fldCharType"), "end")
    q.runs[-1]._r.append(end)


def main(pages):
    doc = Document()
    setup_styles(doc)
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Inches(8.5), Inches(11)
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Inches(1))
    sec.top_margin, sec.bottom_margin = Inches(0.9), Inches(0.9)
    sec.different_first_page_header_footer = True

    # Header / footer for following pages
    hp = sec.header.paragraphs[0]
    hp.text = ""
    hr = hp.add_run("INBOX AND CALENDAR MANAGEMENT SOP  ·  VERSION 1.0")
    hr.font.size = Pt(7.5); hr.font.color.rgb = MUTED; hr.font.bold = True
    para_border_bottom(hp, "D9D2C7", "4")
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    fr = fp.add_run("Page "); fr.font.size = Pt(8); fr.font.color.rgb = MUTED
    r = fp.add_run(); r.font.size = Pt(8); add_field(r, "PAGE")
    fr = fp.add_run(" of "); fr.font.size = Pt(8); fr.font.color.rgb = MUTED
    r = fp.add_run(); r.font.size = Pt(8); add_field(r, "NUMPAGES")

    # Cover
    for _ in range(5):
        doc.add_paragraph()
    kicker(doc, "Standard operating procedure · Virtual assistant")
    t = doc.add_paragraph("Inbox and Calendar Management", style="Title")
    para_border_bottom(t)
    doc.add_paragraph("How the assistant keeps the client's inbox at zero-pending and the calendar conflict-free, every working day.", style="Subtitle")
    for _ in range(6):
        doc.add_paragraph()
    ctl = [("Document type", "Standard operating procedure (template)"), ("Version", "1.0"),
           ("Applies to", "Gmail or Outlook inbox, Google or Outlook calendar"), ("Review cycle", "Monthly, at the client review call")]
    tt = doc.add_table(rows=0, cols=2)
    set_table_borders(tt)
    for k, v in ctl:
        cells = tt.add_row().cells
        cells[0].text = ""; cells[1].text = ""
        rk = cells[0].paragraphs[0].add_run(k.upper()); rk.font.size = Pt(8); rk.font.bold = True; rk.font.color.rgb = MUTED
        cells[1].paragraphs[0].add_run(v).font.size = Pt(10)
    fix_widths(tt, [1.8, 4.7])
    p = doc.add_paragraph(); p.add_run().add_break(WD_BREAK.PAGE)

    # Contents
    kicker(doc, "Contents")
    doc.add_paragraph("In this procedure", style="Heading 1")
    add_toc(doc, pages)
    p = doc.add_paragraph(); p.add_run().add_break(WD_BREAK.PAGE)

    H1 = lambda n, s: doc.add_paragraph(f"{n}.  {s}" if n else s, style="Heading 1")
    H2 = lambda s: doc.add_paragraph(s, style="Heading 2")
    P = lambda s: doc.add_paragraph(s)

    def L(items, style="List Bullet"):
        for it in items:
            doc.add_paragraph(it, style=style)

    H1(1, "Purpose and scope")
    P("This procedure describes how the virtual assistant manages the client's email inbox and calendar on each working day. It keeps important messages visible, routine messages handled, and the calendar free of conflicts.")
    P("It covers the primary business inbox and the main calendar. Personal accounts, payments and legal correspondence are out of scope unless the client adds them in writing.")
    callout(doc, "Outcome", "At the end of each working day every message is labelled, answered, scheduled or waiting on the client, and tomorrow's calendar has been checked.")

    H1(2, "Roles")
    table(doc, ["Role", "Responsible for"], [
        ("Client", "Sets priorities, approves reply templates, decides on anything flagged “Needs decision”."),
        ("Assistant", "Runs the daily routine, drafts and sends approved replies, manages bookings within the calendar rules, reports weekly."),
    ], [1.4, 5.1])

    H1(3, "Daily inbox routine")
    P("Run the routine at the start of the overlap window and again one hour before it ends.")
    L([
        "Open the inbox in the client's browser profile and sort by newest first.",
        "Scan for priority senders and anything mentioning dates, money or deadlines. Flag these first.",
        "Work top to bottom. For each message choose one action: reply, schedule, label, or escalate.",
        "Reply using an approved template where one fits. Save new replies the client approves as templates.",
        "Move handled messages out of the inbox with the right label.",
        "Add anything that needs the client to the “Needs decision” label and the daily check-in.",
        "Finish by checking tomorrow's calendar against new messages.",
    ], "List Number")

    H1(4, "Labels and folders")
    P("Use the same small set of labels so nothing is filed in two places.")
    table(doc, ["Label", "What goes there", "Action"], [
        ("Needs decision", "Anything only the client can answer", "List in daily check-in"),
        ("Waiting", "Sent by the assistant, reply expected", "Follow up after 2 working days"),
        ("Scheduling", "Meeting requests and changes", "Handle per calendar rules"),
        ("Finance", "Invoices, receipts, payment notices", "File; never pay or change details"),
        ("Reference", "Information to keep, no action", "Archive"),
    ], [1.5, 2.8, 2.2])

    H1(5, "Reply templates")
    P("Templates keep the client's voice consistent. Adjust names and dates; keep the rest as approved.")
    H2("Meeting request received")
    P("Thank you for reaching out. [Client] is available on [two options]. Please reply with the time that suits you and I will send a calendar invitation.")
    H2("Acknowledgement while the client decides")
    P("Thank you, this has been received. [Client] will review it and reply by [day]. I'll follow up if anything else is needed in the meantime.")

    H1(6, "Calendar rules")
    table(doc, ["Rule", "Detail"], [
        ("Buffers", "Keep 15 minutes free between external meetings."),
        ("Focus time", "Protect the blocks the client marks as focus time; do not book over them."),
        ("Time zones", "Write every proposed time in the guest's time zone and the client's."),
        ("Links", "Every online meeting has a video link and an agenda line in the invitation."),
        ("Changes", "Reschedule only within the same week without asking; otherwise escalate."),
    ], [1.4, 5.1])

    H1(7, "When to contact the client right away")
    L([
        "A message about a payment, bank detail change or contract.",
        "A complaint from a customer or partner.",
        "Anything that looks like phishing or a security alert.",
        "A same-day meeting change from a priority sender.",
    ])
    callout(doc, "Rule", "When unsure, escalate. A quick question costs less than a wrong reply.")

    H1(8, "Weekly review")
    L([
        "Inbox has no unlabelled messages older than one day.",
        "“Waiting” items older than five days have been followed up.",
        "Next week's calendar has no conflicts or missing links.",
        "New templates are saved and listed in this document.",
        "The weekly report has been sent.",
    ])

    H1("", "Revision history")
    table(doc, ["Version", "Change", "Approved by"], [("1.0", "First issue of the template", "Client")], [1.0, 3.8, 1.7])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    doc.save(OUT)
    print("docx", os.path.relpath(OUT))


if __name__ == "__main__":
    pages = [3, 3, 3, 4, 4, 5, 5, 5, 6]
    if "--toc-pages" in sys.argv:
        pages = [int(x) for x in sys.argv[sys.argv.index("--toc-pages") + 1].split(",")]
    main(pages)
