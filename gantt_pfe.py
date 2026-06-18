import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.patches as mpatches
import matplotlib.ticker as ticker
from datetime import datetime, timedelta

# ============================================================
#  GANTT PFE — Format A4 Paysage (297 x 210 mm)
#  LEMNAIZI Walid — Master IISE 2025/2026
#  Periode : 03 Fevrier -> 22 Juin 2026
# ============================================================

# A4 paysage en pouces : 11.69 x 8.27
A4_W, A4_H = 11.69, 8.27

sprints = [
    {
        "name": "S0 — Initialisation & Cadrage",
        "start": "2026-02-03", "end": "2026-02-13",
        "color": "#004B8D",
        "tasks": [
            ("Etude contexte HPS / PowerCARD",     "2026-02-03", "2026-02-08"),
            ("Choix & justification technologies", "2026-02-06", "2026-02-11"),
            ("Setup environnement & Git",           "2026-02-09", "2026-02-13"),
        ]
    },
    {
        "name": "S1 — Conception & Architecture",
        "start": "2026-02-14", "end": "2026-02-28",
        "color": "#6B2F9E",
        "tasks": [
            ("Architecture Edge-to-Core (5 couches)", "2026-02-14", "2026-02-19"),
            ("Diagrammes UML (UC, Sequence)",         "2026-02-18", "2026-02-24"),
            ("Modelisation BD Oracle (3 tables)",     "2026-02-23", "2026-02-28"),
        ]
    },
    {
        "name": "S2 — Terminal Smart-POS (Arduino Uno Q)",
        "start": "2026-03-01", "end": "2026-03-21",
        "color": "#0077B6",
        "tasks": [
            ("Module NFC PN532 (SPI Bit-Bang)",    "2026-03-01", "2026-03-09"),
            ("Interface TFT + Scanner code-barre", "2026-03-08", "2026-03-16"),
            ("Firmware : machine a etats POS",     "2026-03-15", "2026-03-21"),
        ]
    },
    {
        "name": "S3 — Bridge Python & Base Oracle",
        "start": "2026-03-22", "end": "2026-04-11",
        "color": "#0096C7",
        "tasks": [
            ("Connexion Oracle (oracledb, ACID)",    "2026-03-22", "2026-03-29"),
            ("Logique autorisation & debit Oracle",  "2026-03-28", "2026-04-05"),
            ("Tests integration NFC -> Oracle",      "2026-04-04", "2026-04-11"),
        ]
    },
    {
        "name": "S4 — Pipeline MQTT -> Avro -> Kafka",
        "start": "2026-04-12", "end": "2026-04-30",
        "color": "#00A8A8",
        "tasks": [
            ("Broker Mosquitto & topic POS/paiement", "2026-04-12", "2026-04-18"),
            ("Schema Avro + Proxy Kafka (KRaft)",     "2026-04-17", "2026-04-25"),
            ("Validation topic HPOS (prod/conso)",    "2026-04-24", "2026-04-30"),
        ]
    },
    {
        "name": "S5 — API REST Flask (pwc_api)",
        "start": "2026-05-01", "end": "2026-05-15",
        "color": "#27AE60",
        "tasks": [
            ("Endpoints CRUD cartes (PWC + External)", "2026-05-01", "2026-05-07"),
            ("Endpoints transactions & virements",     "2026-05-06", "2026-05-12"),
            ("Tests API : paiement, refus, virement",  "2026-05-11", "2026-05-15"),
        ]
    },
    {
        "name": "S6 — Dashboards React (Supervision)",
        "start": "2026-05-16", "end": "2026-05-31",
        "color": "#E67E22",
        "tasks": [
            ("Dashboard PowerCard System (CRUD)",    "2026-05-16", "2026-05-22"),
            ("Dashboard External System (audit)",    "2026-05-21", "2026-05-27"),
            ("Supervision temps reel via Kafka",     "2026-05-26", "2026-05-31"),
        ]
    },
    {
        "name": "S7 — Tests, Validation & Performance",
        "start": "2026-06-01", "end": "2026-06-14",
        "color": "#C0392B",
        "tasks": [
            ("Scenarios bout en bout NFC->Dashboard", "2026-06-01", "2026-06-07"),
            ("Mesures latence par etape (ms)",         "2026-06-06", "2026-06-11"),
            ("Correction bugs & optimisation",         "2026-06-10", "2026-06-14"),
        ]
    },
    {
        "name": "S8 — Redaction Rapport & Soutenance",
        "start": "2026-06-15", "end": "2026-06-22",
        "color": "#8E44AD",
        "tasks": [
            ("Rapport final LaTeX + figures HD", "2026-06-15", "2026-06-19"),
            ("Presentation & repetition oral",   "2026-06-18", "2026-06-22"),
        ]
    },
]

# ============================================================
#  CONSTRUCTION DES LIGNES (sans lignes vides entre sprints)
# ============================================================
y_labels   = []
bars       = []
y          = 0
sprint_sep = []   # positions de separation inter-sprint

for sp in sprints:
    sc = sp["color"]
    s  = datetime.strptime(sp["start"], "%Y-%m-%d")
    e  = datetime.strptime(sp["end"],   "%Y-%m-%d")

    # Barre principale Sprint
    y_labels.append(sp["name"])
    bars.append((s, e, "#1C2B4B", y, 0.62, True))
    y += 1

    # Sous-taches
    for tname, ts, te in sp["tasks"]:
        ts_d = datetime.strptime(ts, "%Y-%m-%d")
        te_d = datetime.strptime(te, "%Y-%m-%d")
        y_labels.append("  " + tname)
        bars.append((ts_d, te_d, sc, y, 0.40, False))
        y += 1

    sprint_sep.append(y - 0.5)   # ligne separatrice apres chaque sprint

total_rows = y

# ============================================================
#  FIGURE A4 PAYSAGE
# ============================================================
fig, ax = plt.subplots(figsize=(A4_W, A4_H))
fig.patch.set_facecolor("white")
ax.set_facecolor("#F7F8FC")

# Bandes alternees sprint (fond)
zone_y = 0
for i, sp in enumerate(sprints):
    n = len(sp["tasks"]) + 1
    if i % 2 == 0:
        ax.axhspan(zone_y - 0.5, zone_y + n - 0.5,
                   facecolor="#E9EDF8", alpha=0.55, zorder=0)
    zone_y += n

# Lignes de separation fines entre sprints
for sep_y in sprint_sep[:-1]:
    ax.axhline(sep_y, color="#C5CBD8", linewidth=0.6,
               linestyle="-", alpha=0.7, zorder=1)

# ============================================================
#  DESSIN DES BARRES
# ============================================================
for start, end, color, ypos, height, is_sprint in bars:
    dur = max(1, (end - start).days)
    ax.barh(ypos, dur, left=start, height=height, zorder=3,
            color=color, edgecolor="white", linewidth=0.7, alpha=0.95)

    # Dates a droite de la barre du Sprint (en bleu fonce pour eviter le decalage/debordement)
    if is_sprint:
        date_txt = f"{start.strftime('%d %b')} — {end.strftime('%d %b')}"
        ax.text(end + timedelta(days=1.5), ypos, date_txt,
                ha="left", va="center", fontsize=7.5,
                color="#1C2B4B", fontweight="bold", zorder=5)

# ============================================================
#  AXE Y — ETIQUETTES
# ============================================================
ax.invert_yaxis()
ax.set_yticks(range(total_rows))
ax.set_yticklabels(y_labels, fontsize=7.5)
ax.set_ylim(total_rows - 0.5, -0.5)

for lbl in ax.get_yticklabels():
    t = lbl.get_text()
    if not t.startswith("  "):
        lbl.set_fontweight("bold")
        lbl.set_fontsize(8.0)
        lbl.set_color("#1C2B4B")
    else:
        lbl.set_color("#3A4A6B")
        lbl.set_fontsize(7.2)

ax.tick_params(axis="y", length=0, pad=4)

# ============================================================
#  AXE X — CHRONOLOGIE
# ============================================================
proj_start = datetime(2026, 2, 1)
proj_end   = datetime(2026, 7, 8)
ax.set_xlim(proj_start, proj_end)

ax.xaxis.set_major_locator(mdates.MonthLocator())
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
ax.xaxis.set_minor_locator(mdates.WeekdayLocator(byweekday=0, interval=2))
plt.xticks(fontsize=8.5, color="#1C2B4B", fontweight="bold")

# Separateurs de mois
for mo in range(2, 8):
    try:
        ax.axvline(datetime(2026, mo, 1), color="#B0B8CC",
                   linewidth=0.7, linestyle="--", alpha=0.7, zorder=1)
    except ValueError:
        pass

ax.xaxis.grid(True, which="minor", linestyle=":",
              alpha=0.2, color="#A0AEC0", zorder=1)

# ============================================================
#  LEGENDE COMPACTE (interieur haut droit)
# ============================================================
patches = [
    mpatches.Patch(facecolor=sp["color"], edgecolor="white",
                   label=f"S{i} — {sp['name'].split('—')[1].strip()}")
    for i, sp in enumerate(sprints)
]
leg = ax.legend(
    handles=patches,
    loc="upper right",
    fontsize=6.5,
    framealpha=0.92,
    edgecolor="#C5CBD8",
    ncol=2,
    title="Sprints Agile",
    title_fontsize=7.5,
    handlelength=1.2,
    handleheight=0.9,
    borderpad=0.6,
    labelspacing=0.4,
)
leg.get_title().set_color("#1C2B4B")
leg.get_title().set_fontweight("bold")

# ============================================================
#  TITRES ET BORDURES
# ============================================================
fig.suptitle(
    "Diagramme de Gantt — Planification du Projet de Fin d'Etudes",
    fontsize=11, fontweight="bold", color="#1C2B4B", y=0.99
)
ax.set_title(
    "Conception d'un Ecosysteme de Paiement IoT de Bout en Bout  •  "
    "LEMNAIZI Walid  •  Master IISE 2025/2026  •  03 Fev → 22 Juin 2026",
    fontsize=7.8, color="#555F7A", pad=5
)
ax.set_xlabel("Chronologie du Projet  (Fevrier 2026 → Juin 2026)",
              fontsize=8.5, labelpad=7, color="#1C2B4B", fontweight="medium")

for sp in ["top", "right"]:
    ax.spines[sp].set_visible(False)
ax.spines["left"].set_color("#C5CBD8")
ax.spines["bottom"].set_color("#C5CBD8")

# Marges tres serrees pour tenir sur A4
plt.subplots_adjust(left=0.22, right=0.99, top=0.93, bottom=0.09)

# ============================================================
#  SAUVEGARDE — 300 DPI pour impression A4
# ============================================================
plt.savefig(
    "diagramme_gantt_pfe.png",
    dpi=300,
    bbox_inches="tight",
    facecolor="white",
    format="png"
)
print("[OK] Diagramme sauvegarde : diagramme_gantt_pfe.png  (A4 paysage, 300 DPI)")
# plt.show()

