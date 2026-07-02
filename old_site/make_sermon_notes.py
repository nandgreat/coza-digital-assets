from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
)

NAVY      = colors.HexColor("#0b0f1f")
NAVY_2    = colors.HexColor("#141a33")
GOLD      = colors.HexColor("#d4af37")
GOLD_LIGHT= colors.HexColor("#f1d97a")
MUTED     = colors.HexColor("#5a5f73")
TEXT      = colors.HexColor("#1c1f2e")

LOGO_PATH  = "images/coza_logo.png"
OUTPUT_PATH = "downloads/Sermon_Note_The_Pattern_of_Prayer.pdf"

styles = getSampleStyleSheet()

title_style = ParagraphStyle("SermonTitle", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=26, leading=30,
    textColor=NAVY, alignment=TA_CENTER, spaceAfter=4)

meta_style = ParagraphStyle("Meta", parent=styles["Normal"],
    fontName="Helvetica", fontSize=11, leading=15,
    textColor=MUTED, alignment=TA_CENTER, spaceAfter=2)

minister_style = ParagraphStyle("Minister", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=12, leading=16,
    textColor=colors.HexColor("#8a6d1f"), alignment=TA_CENTER, spaceAfter=2)

ref_style = ParagraphStyle("Reference", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=12.5, leading=16,
    textColor=GOLD, alignment=TA_LEFT, spaceBefore=14, spaceAfter=8)

body_style = ParagraphStyle("Body", parent=styles["Normal"],
    fontName="Helvetica", fontSize=11.5, leading=18,
    textColor=TEXT, alignment=TA_LEFT, spaceAfter=10)

intro_style = ParagraphStyle("Intro", parent=body_style,
    fontName="Helvetica-Oblique", fontSize=12, leading=18,
    textColor=NAVY_2, spaceAfter=14)

subheading_style = ParagraphStyle("Subheading", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=13, leading=17,
    textColor=NAVY, alignment=TA_LEFT, spaceBefore=18, spaceAfter=10)

list_ref_style = ParagraphStyle("ListReference", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=11.5, leading=16,
    textColor=GOLD, alignment=TA_LEFT, spaceBefore=10, spaceAfter=4, leftIndent=14)

list_body_style = ParagraphStyle("ListBody", parent=styles["Normal"],
    fontName="Helvetica", fontSize=11.5, leading=18,
    textColor=TEXT, alignment=TA_LEFT, spaceAfter=8, leftIndent=14)


def header_footer(canvas_obj, doc):
    canvas_obj.saveState()
    width, height = letter
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, height - 0.18 * inch, width, 0.18 * inch, stroke=0, fill=1)
    canvas_obj.setStrokeColor(GOLD)
    canvas_obj.setLineWidth(1)
    canvas_obj.line(0.85 * inch, 0.65 * inch, width - 0.85 * inch, 0.65 * inch)
    canvas_obj.setFont("Helvetica", 8.5)
    canvas_obj.setFillColor(MUTED)
    canvas_obj.drawCentredString(width / 2, 0.48 * inch,
        "© 2026 COZA Digital Service Assets. All rights reserved.")
    canvas_obj.setFont("Helvetica-Bold", 8.5)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.drawRightString(width - 0.85 * inch, 0.48 * inch, f"Page {doc.page}")
    canvas_obj.restoreState()


def build():
    doc = SimpleDocTemplate(OUTPUT_PATH, pagesize=letter,
        topMargin=0.75*inch, bottomMargin=0.9*inch,
        leftMargin=0.85*inch, rightMargin=0.85*inch,
        title="COZA Sermon Notes - The Pattern of Prayer - 30.06.2026",
        author="COZA Digital Service Assets")

    story = []

    # Logo
    try:
        logo = Image(LOGO_PATH, width=0.85*inch, height=0.85*inch)
        logo.hAlign = "CENTER"
        story.append(logo)
        story.append(Spacer(1, 10))
    except Exception:
        pass

    story.append(Paragraph("SERMON NOTES", title_style))
    story.append(Paragraph("Tuesday Service &middot; 30th June, 2026", meta_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Ministering: Pastor Biodun Fatoyinbo", minister_style))
    story.append(Spacer(1, 14))

    # Title / ref card
    card_data = [
        [Paragraph('<font color="#0b0f1f"><b>MESSAGE TITLE:</b></font> '
                   '<font color="#8a6d1f"><b>THE PATTERN OF PRAYER</b></font>',
                   ParagraphStyle("cL", fontName="Helvetica", fontSize=12, leading=16))],
        [Paragraph('<font color="#0b0f1f"><b>BIBLE TEXT:</b></font> '
                   '<font color="#8a6d1f">Psalm 119:32 (NLT)</font>',
                   ParagraphStyle("cL2", fontName="Helvetica", fontSize=12, leading=16))],
    ]
    card = Table(card_data, colWidths=[6.0*inch])
    card.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#fbf6e4")),
        ("BOX",           (0,0),(-1,-1), 1, GOLD),
        ("LEFTPADDING",   (0,0),(-1,-1), 16),
        ("RIGHTPADDING",  (0,0),(-1,-1), 16),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
    ]))
    story.append(card)
    story.append(Spacer(1, 18))

    # Intro
    story.append(Paragraph(
        "Prayer is a major way to build your life according to God's pattern. "
        "A day without prayer is a day without blessings and a life without "
        "prayer is also a life without blessings. Prayer releases the power "
        "of God to go to work in our lives. God's power can be available to "
        "you but it can be inactive in your life. The act of prayer is "
        "communion with God.", intro_style))
    story.append(HRFlowable(width="100%", thickness=0.6,
        color=colors.HexColor("#e6e6e6"), spaceAfter=14))

    # Main scripture sections
    sections = [
        ("Ephesians 3:20, 1:19-20 (NLT)",
         "Prayer is the tool we use to ensure that we connect to God on a high "
         "level. Prayer is what ensures that the power that was made available "
         "as a result of the death, burial, resurrection and ascension of our "
         "Lord Jesus Christ is at work in our lives. Prayer is a machinery and "
         "can bring down any mountain."),
        ("Psalm 107:24, Exodus 34:10 (NLT)",
         "Power is useless when not exercised. Prayer pulls the power of God "
         "into action. No god on earth could ever match God's power. Prayer "
         "is priceless and it's non-negotiable. The presence of God is so "
         "powerful and prayer is what grants you access into that presence."),
        ("Deuteronomy 26:8 (NLT)",
         "Without prayer, the power of God might be available but inactive "
         "in our lives."),
        ("Job 22:28 (NLT)",
         "Without declarations, light can't shine on your path. Prayer "
         "releases a strange dimension of God's power."),
        ("Joel 2:28, Exodus 15:11-12 (NLT)",
         "Prophecy is also a type of prayer. No man could ever take care of "
         "you or love you like God does. He is a friend who sticks closer "
         "than a brother. God is a Performer of wonders!"),
        ("Deuteronomy 6:22, Jeremiah 33:20-21 (NLT)",
         "Prayer is a covenant activator. God would go to any extent to "
         "ensure that you're fine."),
        ("1 Kings 18:42-45 (NLT)",
         "Prayer releases the grace for you to outrun those who have gone "
         "ahead of you. Prayer has a posture and it may not be comfortable, "
         "but it is totally worth it. You may not yet see the full "
         "manifestation of God's promise, but rest assured that He is able."),
        ("John 15:7, Matthew 7:8 (NLT)",
         "Prayer gives you divine privileges to ask for anything in His presence."),
        ("2 Samuel 5:23-24 (NLT)",
         "Prayer gives you the opportunity to ask God for direction, "
         "wisdom, strategies and signals."),
        ("2 Chronicles 7:14, Acts 4:23-27 (NLT)",
         "It takes humility to pray consistently. Prayer releases solutions "
         "to difficult and troubling issues."),
    ]
    for ref, text in sections:
        story.append(Paragraph(f"&#9670;&nbsp; {ref}", ref_style))
        story.append(Paragraph(text, body_style))

    # Isaiah 40:31
    story.append(Paragraph("&#9670;&nbsp; Isaiah 40:31 (AMPC)", ref_style))
    story.append(Paragraph(
        "Prayer releases the supernatural strength of God in every area of "
        "our lives. Don't run from God; run to Him! You'd be weary, "
        "depressed and tired when you don't pray.", body_style))

    # Things that render prayer powerless
    story.append(HRFlowable(width="100%", thickness=0.6,
        color=colors.HexColor("#e6e6e6"), spaceBefore=8, spaceAfter=4))
    story.append(Paragraph("Things That Render Prayer Powerless In Our Lives:", subheading_style))

    powerless_items = [
        ("1. Worry.", "Philippians 4:6, Matthew 6:34",
         "Worry cancels the power of prayer. God takes care of us on a "
         "daily basis, therefore we need not worry about anything."),
        ("2. Doubt.", "Psalm 106:24 (NLT)", None),
        ("3. Anxiety.", "Psalm 139:23", "This is a higher version of worry."),
        ("4. Anger & Controversies.", "1 Timothy 2:8 (NLT)", None),
        ("5. Unforgiveness.", "Matthew 6:12, Job 42:10 (NLT)",
         "Unforgiveness is so poisonous that it kills the power of prayer. "
         "Learn to let people go. God always restores much more than was lost."),
    ]
    for label, ref, text in powerless_items:
        story.append(Paragraph(f"{label} {ref}", list_ref_style))
        if text:
            story.append(Paragraph(text, list_body_style))

    # Things to do to energize prayer
    story.append(HRFlowable(width="100%", thickness=0.6,
        color=colors.HexColor("#e6e6e6"), spaceBefore=8, spaceAfter=4))
    story.append(Paragraph("Things To Do To Energize Your Prayer For Effective Results:", subheading_style))

    energize_items = [
        ("1. Release something.", None,
         "To get something in the place of prayer, you must release "
         "something. Prayer would always need a point of contact. Never "
         "give to God what costs you nothing."),
        ("2. Stay focused on the word.", "Isaiah 26:3, Philippians 4:8, Jeremiah 29:13",
         "A word-less prayer is a powerless prayer."),
        ("3. Study and meditate on the word.", "Colossians 1:9 (NLT)",
         "Don't go into prayer without having a complete knowledge of His "
         "will, through the word. Always study the word."),
        ("4. Fasting.", "Psalm 145:5, Romans 15:13 (NLT)", None),
        ("5. Pray in the Spirit at all times.", "Ephesians 6:18 (NLT)", None),
        ("6. Devotion.", "Colossians 4:2 (NLT)", None),
        ("7. Praying in Isolation.", "Mark 1:35 (NLT)", None),
    ]
    for label, ref, text in energize_items:
        heading = f"{label} {ref}" if ref else label
        story.append(Paragraph(heading, list_ref_style))
        if text:
            story.append(Paragraph(text, list_body_style))

    # Types of Prayer
    story.append(HRFlowable(width="100%", thickness=0.6,
        color=colors.HexColor("#e6e6e6"), spaceBefore=8, spaceAfter=4))
    story.append(Paragraph("Types Of Prayer:", subheading_style))

    types_items = [
        ("1. Prayer of faith", None),
        ("2. Prayer of agreement", None),
        ("3. Prayer of intercession", None),
        ("4. Kingdom advancement prayer", None),
        ("5. One-line prayer.", "Psalm 27:4, Mark 11:13-21 (NLT)"),
    ]
    for label, ref in types_items:
        heading = f"{label} {ref}" if ref else label
        story.append(Paragraph(heading, list_ref_style))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)


if __name__ == "__main__":
    build()
    print("PDF created:", OUTPUT_PATH)
