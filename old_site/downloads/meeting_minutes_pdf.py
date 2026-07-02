from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

NAVY = colors.HexColor("#1B2A4A")
GOLD = colors.HexColor("#C9A227")
LIGHT = colors.HexColor("#F4F1E8")
GREY = colors.HexColor("#555555")

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title2", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=24, textColor=NAVY, alignment=TA_CENTER, spaceAfter=2
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"], fontName="Helvetica-Oblique",
    fontSize=12, textColor=GOLD, alignment=TA_CENTER, spaceAfter=18
)
section_style = ParagraphStyle(
    "Section", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=14, textColor=colors.white, spaceBefore=14, spaceAfter=8,
    backColor=NAVY, borderPadding=(6, 8, 6, 8), leading=18
)
name_style = ParagraphStyle(
    "Name", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=10.5, textColor=NAVY
)
role_style = ParagraphStyle(
    "Role", parent=styles["Normal"], fontName="Helvetica",
    fontSize=10.5, textColor=colors.black, leading=14
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"], fontName="Helvetica",
    fontSize=10.5, textColor=colors.black, leading=15, spaceAfter=6
)
bullet_style = ParagraphStyle(
    "Bullet", parent=body_style, leftIndent=14, bulletIndent=2
)
footer_style = ParagraphStyle(
    "Footer", parent=styles["Normal"], fontName="Helvetica-Oblique",
    fontSize=8.5, textColor=GREY, alignment=TA_CENTER
)

doc = SimpleDocTemplate(
    "/Users/NANDOM.K_SYDANI/Documents/DigitalResources/downloads/Witty_Meeting_Minutes.pdf",
    pagesize=A4,
    topMargin=2 * cm, bottomMargin=2 * cm,
    leftMargin=2 * cm, rightMargin=2 * cm,
    title="Witty Meeting Minutes"
)

story = []

story.append(Paragraph("📋 Witty Meeting Minutes", title_style))
story.append(Paragraph("Where service runs smooth and nobody drops the stream", subtitle_style))
story.append(HRFlowable(width="100%", thickness=1.2, color=GOLD, spaceAfter=12))

# Section 1: Who Does What
story.append(Paragraph("Who Does What During Service", section_style))

duty_rows = [
    ("Bro Timmy", "Keeps an ear on the Facebook sound — silence is not an option."),
    ("Sis Ada", "Hard at work on the website, building while the Word is being broken."),
    ("Bro Mike", "Captain of the stream — the eyes and hands behind the broadcast."),
    ("Bro Nandom", "Bro Mike's stream wingman, and the architect of the Digital Resources landing page (built and published, no excuses)."),
    ("Bro Sam", "COZA TV's watchdog for sound, posts, and comments — nothing slips past him."),
    ("Sis Gold", "Referees the YouTube and Facebook live chats — moderation with grace."),
    ("Bro Humble", "A triple threat: live chat, stream sound, and stream handling."),
    ("Sis Jarvis", "YouTube's sound-and-chat guardian, plus the heroic transcriber of the entire message — every word, captured."),
    ("Sis Tonia", "Curator of quotes and sermon notes, and Facebook page live chat moderator."),
    ("Sis Tito", "Moderates COZA TV's YouTube live chat and doubles as a sermon-quote scribe."),
    ("Bro Nejo", "Monitors and occasionally designs graphics for Baba's quotes during the Word."),
    ("Bro Chibuzor", "On monitoring duty for one of the social media platforms."),
    ("Bro Nnamdi", "Monitors a platform and steps in to moderate when the main moderators are away."),
    ("Sis Tolu", "Moderates a platform, with monitoring duties on the side."),
    ("Sis Divine", "Keeps watch over one of the platforms."),
    ("Bro Bright", "Monitors one of the platforms."),
    ("Sis Naomi", "Monitors one of the platforms."),
    ("Sis Maureen", "Monitors one of the platforms."),
    ("Bro Taiwo", "Monitors, and sometimes designs graphics for Baba's quotes."),
    ("Bro Leo", "Keeps an eye on Facebook."),
    ("Bro Muyiwa", "Monitors a platform and assists Bro Mike with internet connectivity troubleshooting."),
    ("Bro Johnson", "On general monitoring duty."),
    ("Bro Ezra", "On general monitoring duty."),
]

table_data = [[Paragraph(n, name_style), Paragraph(r, role_style)] for n, r in duty_rows]
duty_table = Table(table_data, colWidths=[4.2 * cm, 11.3 * cm], hAlign="LEFT")
duty_table.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT]),
    ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#DDDDDD")),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
]))
story.append(duty_table)
story.append(Spacer(1, 10))

# Section 2: Other Discussions
story.append(Paragraph("Other Discussions", section_style))
story.append(Paragraph("•  Everyone will be assigned a task for the 7-Day Glory (7DG) — no spectators allowed.", bullet_style))
story.append(Paragraph("•  New workers should bring their laptops — bring your tools, not just your enthusiasm.", bullet_style))
story.append(Spacer(1, 6))

# Section 3: Suggestions
story.append(Paragraph("Suggestions", section_style))
story.append(Paragraph("•  Team leads should be transferred to HQ.", bullet_style))
story.append(Spacer(1, 6))

# Section 4: To-Do List
story.append(Paragraph("To-Do List", section_style))
story.append(Paragraph("•  Prepare Mentimeter questions for all 7DGs — start displaying from 5:00 PM.", bullet_style))
story.append(Paragraph("•  Sort out something for praise and expectations for the 7DG.", bullet_style))
story.append(Spacer(1, 16))

story.append(HRFlowable(width="100%", thickness=0.8, color=GOLD, spaceAfter=8))
story.append(Paragraph("Minuted with love, sound checks, and zero buffering issues.", footer_style))

doc.build(story)
print("done")
