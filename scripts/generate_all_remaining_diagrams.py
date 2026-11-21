# -*- coding: utf-8 -*-
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

out_dir = r"d:\MINIPROJECT EVNTRA\EVENTRA_phase1_starter\report_images"
os.makedirs(out_dir, exist_ok=True)

plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 9.5

def save_fig(fig, filename):
    filepath = os.path.join(out_dir, filename)
    fig.savefig(filepath, dpi=250, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {filename}")

# ==============================================================================
# Fig 4.3: Level 1 Subsystem DFD
# ==============================================================================
def gen_fig_4_3():
    fig, ax = plt.subplots(figsize=(10.5, 7))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 96, "Figure 4.3: Level 1 Subsystem Data Flow Diagram (DFD)", 
            ha='center', va='center', fontsize=12, fontweight='bold', color='#0F172A')

    # Subsystems (Circles)
    subsystems = [
        ("1.0 Event Authoring\n& Scheduling", (22, 70), "#1D4ED8"),
        ("2.0 Registration &\nPass Generator", (50, 70), "#15803D"),
        ("3.0 Gate Check-In\n& Attendance", (78, 70), "#D97706"),
        ("4.0 Smart Closure\n& Survey Dispatch", (22, 28), "#DC2626"),
        ("5.0 Certificate\nStudio & Delivery", (50, 28), "#7E22CE"),
        ("6.0 Post-Event\nDossier Compiler", (78, 28), "#0369A1")
    ]

    for label, (x, y), col in subsystems:
        c = patches.Circle((x, y), 10.5, fc='#F8FAFC', ec=col, lw=2)
        ax.add_patch(c)
        ax.text(x, y, label, ha='center', va='center', fontsize=8, fontweight='bold', color=col)

    # Database Stores (Double-bar cylinders represented as open rectangles)
    stores = [
        ("D1: Events Store", (36, 49), "#1D4ED8"),
        ("D2: Registrations", (64, 49), "#15803D"),
        ("D3: AttendanceLogs", (90, 49), "#D97706"),
        ("D4: FeedbackSurveys", (10, 49), "#DC2626")
    ]

    for label, (x, y), col in stores:
        r = patches.Rectangle((x-10, y-3.5), 20, 7, fc='#EFF6FF', ec=col, lw=1.5)
        ax.add_patch(r)
        ax.text(x, y, label, ha='center', va='center', fontsize=7.5, fontweight='bold', color=col)

    # Connections
    ax.annotate("", xy=(36, 52.5), xytext=(22, 60), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))
    ax.annotate("", xy=(50, 60), xytext=(36, 52.5), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))
    ax.annotate("", xy=(64, 52.5), xytext=(50, 60), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))
    ax.annotate("", xy=(78, 60), xytext=(64, 52.5), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))
    ax.annotate("", xy=(90, 52.5), xytext=(78, 60), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))
    ax.annotate("", xy=(22, 38.5), xytext=(36, 45.5), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))
    ax.annotate("", xy=(10, 45.5), xytext=(22, 38.5), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))
    ax.annotate("", xy=(50, 38.5), xytext=(10, 45.5), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))
    ax.annotate("", xy=(78, 38.5), xytext=(50, 38.5), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))

    save_fig(fig, "fig_4_3_dfd_lvl1.png")

# ==============================================================================
# Fig 4.4: Level 2 Sub-Second QR Check-In DFD
# ==============================================================================
def gen_fig_4_4():
    fig, ax = plt.subplots(figsize=(10, 6.5))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 96, "Figure 4.4: Level 2 Sub-Second QR Check-In & Gate Verification DFD", 
            ha='center', va='center', fontsize=11.5, fontweight='bold', color='#0F172A')

    steps = [
        ("3.1 Token Capture & Extraction (jsQR Video Loop)", 84, "#EFF6FF", "#1D4ED8"),
        ("3.2 Token Sanitation & 32-Byte Format Verification", 70, "#EFF6FF", "#1D4ED8"),
        ("3.3 Event Context & Active State Guard (Status IN_PROGRESS)", 56, "#FEF3C7", "#D97706"),
        ("3.4 Atomic Mutation: findOneAndUpdate({ qrCode, checkedIn: false })", 42, "#FEE2E2", "#DC2626"),
        ("3.5 Append Audit Record to AttendanceLogs with Verifier ID", 28, "#FAF5FF", "#7E22CE"),
        ("3.6 Return 200 OK + Green Badge + 880Hz Audio Chime (<340ms)", 14, "#F0FDF4", "#15803D")
    ]

    for label, y, bg, border in steps:
        p = patches.FancyBboxPatch((12, y-4.5), 76, 9, boxstyle="round,pad=0.5", fc=bg, ec=border, lw=1.5)
        ax.add_patch(p)
        ax.text(50, y, label, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#1E293B')

    for i in range(len(steps)-1):
        y_c = steps[i][1] - 4.5
        y_n = steps[i+1][1] + 4.5
        ax.annotate("", xy=(50, y_n), xytext=(50, y_c), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.6))

    save_fig(fig, "fig_4_4_dfd_lvl2.png")

# ==============================================================================
# Fig 4.8: EASAP Flowchart
# ==============================================================================
def gen_fig_4_8():
    fig, ax = plt.subplots(figsize=(9, 6.5))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 96, "Figure 4.8: EASAP (Event-Aware Sentiment Analysis and Prioritization) Pipeline", 
            ha='center', va='center', fontsize=11, fontweight='bold', color='#0F172A')

    steps = [
        ("Raw Qualitative Feedback Reviews (Free-Text Comments)", 84, "#F8FAFC", "#475569"),
        ("Preprocessing: Lemmatization, Tokenization & Stopword Pruning", 70, "#EFF6FF", "#1D4ED8"),
        ("Aspect Decomposition: [Venue, Speakers, Schedule, Sound, Hospitality]", 56, "#FEF3C7", "#D97706"),
        ("Aspect Sentiment Polarity Classification (BERT / Sentiment Lexicon)", 42, "#FAF5FF", "#7E22CE"),
        ("Compute Priority Score: P(a) = 100 * [wf*Fa + wn*Na + ws*Sa + wc*Ca]", 28, "#FEE2E2", "#DC2626"),
        ("Rank Critical Operational Issues on Organizer Executive Dashboard", 14, "#F0FDF4", "#15803D")
    ]

    for label, y, bg, border in steps:
        p = patches.FancyBboxPatch((12, y-4.5), 76, 9, boxstyle="round,pad=0.5", fc=bg, ec=border, lw=1.5)
        ax.add_patch(p)
        ax.text(50, y, label, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#1E293B')

    for i in range(len(steps)-1):
        y_c = steps[i][1] - 4.5
        y_n = steps[i+1][1] + 4.5
        ax.annotate("", xy=(50, y_n), xytext=(50, y_c), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.6))

    save_fig(fig, "fig_4_8_easap_flowchart.png")

# ==============================================================================
# Fig 4.10: UML Use Case Diagram
# ==============================================================================
def gen_fig_4_10():
    fig, ax = plt.subplots(figsize=(10.5, 7.5))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 97, "Figure 4.10: UML Use Case Diagram for Primary Platform Actors", 
            ha='center', va='center', fontsize=12, fontweight='bold', color='#0F172A')

    # Actors (Left and Right)
    actors = [
        ("EVENT ORGANIZER", (12, 68), "#1D4ED8"),
        ("SUPER ADMIN", (12, 28), "#7E22CE"),
        ("PARTICIPANT / ATTENDEE", (88, 68), "#15803D"),
        ("GATE VOLUNTEER", (88, 28), "#D97706")
    ]

    for name, (x, y), col in actors:
        r = patches.FancyBboxPatch((x-10, y-6), 20, 12, boxstyle="round,pad=0.5", fc='#F8FAFC', ec=col, lw=2)
        ax.add_patch(r)
        ax.text(x, y, name, ha='center', va='center', fontsize=8, fontweight='bold', color=col)

    # Use Cases (Center Ovals)
    use_cases = [
        ("UC01: Create & Schedule Multi-Day Events", 85),
        ("UC02: Generate Parametric Posters (16:9 & 4:5)", 74),
        ("UC03: Browse Landing & Public Self-Registration", 63),
        ("UC04: Download Opaque Vector Ticket Pass", 52),
        ("UC05: Sub-Second QR Gate Check-In & Audio Chime", 41),
        ("UC06: Execute Smart Closure & Survey Dispatch", 30),
        ("UC07: Submit Feedback & Auto-Receive Certificate", 19),
        ("UC08: Compile 12-Section Executive PDF Dossier", 8)
    ]

    for label, y in use_cases:
        e = patches.Ellipse((50, y), 38, 7.5, fc='#F0FDF4', ec='#15803D', lw=1.2)
        ax.add_patch(e)
        ax.text(50, y, label, ha='center', va='center', fontsize=8, fontweight='medium', color='#1E293B')

    # Connecting lines from actors to use cases
    # Organizer -> UC01, UC02, UC06, UC08
    for y_uc in [85, 74, 30, 8]:
        ax.plot([22, 31], [68, y_uc], color="#1D4ED8", lw=1.2, linestyle='--')

    # Participant -> UC03, UC04, UC07
    for y_uc in [63, 52, 19]:
        ax.plot([78, 69], [68, y_uc], color="#15803D", lw=1.2, linestyle='--')

    # Volunteer -> UC05
    ax.plot([78, 69], [28, 41], color="#D97706", lw=1.2, linestyle='--')

    # Admin -> All / UC08
    ax.plot([22, 31], [28, 8], color="#7E22CE", lw=1.2, linestyle='--')

    save_fig(fig, "fig_4_10_use_case.png")

# ==============================================================================
# Fig 4.15: Finite State Machine (FSM)
# ==============================================================================
def gen_fig_4_15():
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 96, "Figure 4.15: Finite State Machine (FSM) Diagram for Event Lifecycle Transitions", 
            ha='center', va='center', fontsize=11.5, fontweight='bold', color='#0F172A')

    states = [
        ("DRAFT\n(Event Authoring)", (12, 50), "#64748B"),
        ("PUBLISHED\n(Live on Web)", (32, 50), "#0284C7"),
        ("REGISTRATION_OPEN\n(Booking Active)", (52, 50), "#059669"),
        ("IN_PROGRESS\n(Gate Scanner Live)", (72, 50), "#D97706"),
        ("COMPLETED\n(Gates Locked, Survey Sent)", (92, 50), "#DC2626"),
        ("FINALIZED\n(Report Locked)", (52, 18), "#7C3AED")
    ]

    for label, (x, y), col in states:
        r = patches.FancyBboxPatch((x-8.5, y-8), 17, 16, boxstyle="round,pad=0.5", fc='#F8FAFC', ec=col, lw=2)
        ax.add_patch(r)
        ax.text(x, y, label, ha='center', va='center', fontsize=7.5, fontweight='bold', color=col)

    # Transitions
    ax.annotate("", xy=(23.5, 50), xytext=(20.5, 50), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.8))
    ax.annotate("", xy=(43.5, 50), xytext=(40.5, 50), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.8))
    ax.annotate("", xy=(63.5, 50), xytext=(60.5, 50), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.8))
    ax.annotate("", xy=(83.5, 50), xytext=(80.5, 50), arrowprops=dict(arrowstyle="->", color="#334155", lw=1.8))

    # Curve from COMPLETED to FINALIZED
    ax.annotate("", xy=(60.5, 18), xytext=(92, 42), arrowprops=dict(arrowstyle="->", color="#7C3AED", lw=1.8, connectionstyle="arc3,rad=0.25"))
    ax.text(80, 26, "Compile 12-Section Report", fontsize=8, color='#6D28D9', fontweight='bold')

    save_fig(fig, "fig_4_15_fsm.png")

# ==============================================================================
# Fig 4.16: Entity-Relationship (ER) Diagram
# ==============================================================================
def gen_fig_4_16():
    fig, ax = plt.subplots(figsize=(10.5, 7.5))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 97, "Figure 4.16: Entity-Relationship (ER) Diagram of EVENTRA Database", 
            ha='center', va='center', fontsize=12, fontweight='bold', color='#0F172A')

    entities = [
        ("USER\n• _id (PK)\n• email (UK)\n• passwordHash\n• role", (18, 76), "#1D4ED8"),
        ("EVENT\n• _id (PK)\n• organizer (FK)\n• title, slug (UK)\n• status, capacity\n• multiDaySchedule", (50, 76), "#059669"),
        ("REGISTRATION\n• _id (PK)\n• event (FK)\n• email, qrCode (UK)\n• checkedIn, checkedInAt\n• feedbackToken", (82, 76), "#0284C7"),
        ("ATTENDANCE_LOG\n• _id (PK)\n• event (FK)\n• registration (FK)\n• scannedAt, verifierId", (82, 28), "#D97706"),
        ("FEEDBACK\n• _id (PK)\n• event (FK)\n• registration (FK)\n• 4-tier ratings\n• qualitative reviews", (50, 28), "#DC2626"),
        ("CERTIFICATE\n• _id (PK)\n• event (FK)\n• registration (FK)\n• certificateId (UK)\n• verificationHash", (18, 28), "#7C3AED")
    ]

    for label, (x, y), col in entities:
        r = patches.FancyBboxPatch((x-12, y-12), 24, 24, boxstyle="round,pad=0.5", fc='#F8FAFC', ec=col, lw=2)
        ax.add_patch(r)
        ax.text(x, y, label, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#1E293B')

    # Relationships
    ax.plot([30, 38], [76, 76], color="#334155", lw=1.5, linestyle='-')
    ax.text(34, 78, "1 : N", fontsize=8, ha='center', fontweight='bold', color='#334155')

    ax.plot([62, 70], [76, 76], color="#334155", lw=1.5, linestyle='-')
    ax.text(66, 78, "1 : N", fontsize=8, ha='center', fontweight='bold', color='#334155')

    ax.plot([82, 82], [64, 40], color="#334155", lw=1.5, linestyle='-')
    ax.text(85, 52, "1 : 1", fontsize=8, ha='center', fontweight='bold', color='#334155')

    ax.plot([50, 50], [64, 40], color="#334155", lw=1.5, linestyle='-')
    ax.text(53, 52, "1 : N", fontsize=8, ha='center', fontweight='bold', color='#334155')

    ax.plot([18, 18], [64, 40], color="#334155", lw=1.5, linestyle='-')
    ax.text(21, 52, "1 : N", fontsize=8, ha='center', fontweight='bold', color='#334155')

    save_fig(fig, "fig_4_16_er_diagram.png")

if __name__ == '__main__':
    gen_fig_4_3()
    gen_fig_4_4()
    gen_fig_4_8()
    gen_fig_4_10()
    gen_fig_4_15()
    gen_fig_4_16()
    print("All remaining diagram images generated successfully!")
