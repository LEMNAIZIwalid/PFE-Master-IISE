#include "TFT_eSPI.h"
#include "Arduino_RouterBridge.h"

TFT_eSPI tft = TFT_eSPI();

// --- Données Bridge ---
String g_timeStr = "09:41";
String g_dateStr = "mercredi : 1/4/2026";
String g_wifiStr = "Connected";
String g_battStr = "84%";

// --- État montant ---
long g_amount = 0;   // centimes

// --- Couleurs ─────────────────────────────────────────────────
#define COLOR_NAVY    0x018C
#define COLOR_GREY_LT 0xDEFB
#define COLOR_GREY_NK 0xD6BA
#define COLOR_BTN_BG  0xEF7D   // gris clair boutons numpad
#define COLOR_BTN_SHD 0xBDD7   // ombre boutons
#define COLOR_PAYER   0x2D05   // vert
#define COLOR_SCANNER 0xEF00   // jaune

// --- Dessins d'Icônes ─────────────────────────────────────────
void drawWiFiIcon(int x, int y, uint16_t color) {
    if (g_wifiStr != "Connected") {
        tft.fillRect(x, y + 12, 3, 4, color);
        tft.fillRect(x + 5, y + 8, 3, 8, color);
        tft.fillRect(x + 10, y + 4, 3, 12, color);
        tft.fillRect(x + 15, y, 3, 16, color);
        return;
    }
    int cx = x + 9, cy = y + 15;
    tft.fillCircle(cx, cy, 2, color);
    tft.drawCircle(cx, cy, 6, color);
    tft.drawCircle(cx, cy, 12, color);
    tft.drawCircle(cx, cy, 18, color);
    tft.fillRect(x - 5, y + 16, 30, 10, TFT_WHITE);
    tft.fillTriangle(cx, cy, x - 10, y - 10, x + 30, y - 10, TFT_WHITE);
}

// --- Calibration du Tactile (ORIGINAL) ────────────────────────
void touch_calibrate() {
    uint16_t calData[5];
    tft.fillScreen(TFT_BLACK);
    tft.setCursor(20, 0);
    tft.setTextFont(2);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.println("Calibration...");
    tft.calibrateTouch(calData, TFT_MAGENTA, TFT_BLACK, 15);
    tft.fillScreen(TFT_WHITE);
}

// --- Mise à jour de la barre de statut ────────────────────────
void updateHeader() {
    tft.fillRect(0, 0, 320, 45, TFT_WHITE);

    // Heure (haut gauche)
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(TL_DATUM);
    tft.drawString(g_timeStr, 15, 12, 2);

    // Batterie icône (haut droite)
    int bx = 280, by = 13;
    tft.drawRoundRect(bx, by, 25, 13, 3, COLOR_NAVY);
    tft.drawRoundRect(bx + 1, by + 1, 23, 11, 2, COLOR_NAVY);
    tft.fillRect(bx + 25, by + 4, 3, 5, COLOR_NAVY);
    int battVal = constrain(g_battStr.toInt(), 0, 100);
    int fillW = map(battVal, 0, 100, 0, 19);
    tft.fillRect(bx + 3, by + 3, fillW, 7, TFT_GREEN);

    // Batterie pourcentage
    tft.setTextDatum(TR_DATUM);
    tft.setTextColor(COLOR_NAVY);
    tft.drawString(g_battStr, bx - 6, 12, 2);

    // WiFi
    drawWiFiIcon(bx - 58, 11, COLOR_NAVY);

    // Ligne séparatrice
    tft.drawFastHLine(0, 44, 320, COLOR_GREY_NK);
}

// --- Montant → String ─────────────────────────────────────────
String amountStr() {
    long v = max(g_amount, 0L);
    String s = String(v / 100) + ".";
    if ((v % 100) < 10) s += "0";
    s += String(v % 100);
    // Symbole Euro
    s += " EUR";
    return s;
}

// --- Rafraîchir zone montant ──────────────────────────────────
void refreshAmount() {
    tft.fillRect(0, 46, 320, 74, TFT_WHITE);
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(amountStr(), 160, 83, 6);
}

// --- Dessiner un bouton numpad ────────────────────────────────
void drawBtn(int x, int y, int w, int h, const char* label,
             uint16_t fillColor, uint16_t textColor) {
    // Ombre
    tft.fillRoundRect(x + 2, y + 2, w, h, 10, COLOR_BTN_SHD);
    // Fond
    tft.fillRoundRect(x, y, w, h, 10, fillColor);
    // Bordure
    tft.drawRoundRect(x, y, w, h, 10, COLOR_GREY_NK);
    // Texte
    tft.setTextColor(textColor);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(String(label), x + w / 2, y + h / 2, 4);
}

// --- Dessiner l'écran CAISSE ──────────────────────────────────
void drawScreen() {
    tft.fillScreen(TFT_WHITE);

    // Header (heure, wifi, batterie)
    updateHeader();

    // Montant
    refreshAmount();

    // Ligne sous montant
    tft.drawFastHLine(0, 120, 320, COLOR_GREY_NK);

    // ── Numpad 4×4 ──
    const int X0    = 2;
    const int Y0    = 122;
    const int COL_W = 78;
    const int ROW_H = 70;
    const int GAP   = 2;

    const char* ROWS[4][4] = {
        {"1", "2", "3", "<"},
        {"4", "5", "6", "C"},
        {"7", "8", "9", "+"},
        {"",  "0", "*", "="}
    };

    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 4; c++) {
            if (ROWS[r][c][0] == '\0') continue;
            int bx = X0 + c * (COL_W + GAP);
            int by = Y0 + r * (ROW_H + GAP);
            drawBtn(bx, by, COL_W, ROW_H, ROWS[r][c], TFT_WHITE, COLOR_NAVY);
        }
    }

    // ── PAYER (vert) ──
    tft.fillRoundRect(4, 416, 152, 58, 14, COLOR_PAYER);
    tft.drawRoundRect(4, 416, 152, 58, 14, 0x0B80);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("PAYER", 80, 445, 4);

    // ── SCANNER (jaune) ──
    tft.fillRoundRect(162, 416, 154, 58, 14, COLOR_SCANNER);
    tft.drawRoundRect(162, 416, 154, 58, 14, 0xC500);
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("SCANNER", 239, 445, 4);
}

// --- Bridge callback ──────────────────────────────────────────
void update_status_cb(String t, String d, String w, String b) {
    g_timeStr = t;
    g_dateStr = d;
    g_wifiStr = w;
    g_battStr = b;
}

// --- Setup ────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(500);

    tft.init();
    tft.setRotation(0);
    delay(200);

    // 1. Calibration (interactif — attend vos touches aux 4 coins)
    touch_calibrate();

    // 2. Bridge après calibration
    Bridge.begin();
    Bridge.provide("update_status", update_status_cb);

    // 3. Afficher l'écran caisse
    drawScreen();
}

// --- Loop ─────────────────────────────────────────────────────
void loop() {
    uint16_t tx, ty;
    static String lastT = "";

    // Rafraîchir header si l'heure change
    if (g_timeStr != lastT) {
        lastT = g_timeStr;
        updateHeader();
    }

    if (!tft.getTouch(&tx, &ty)) {
        Bridge.update();
        return;
    }

    // ── Numpad ──
    const int X0    = 2;
    const int Y0    = 122;
    const int COL_W = 78;
    const int ROW_H = 70;
    const int GAP   = 2;

    if (ty >= Y0 && ty < Y0 + 4 * (ROW_H + GAP)) {
        int col = (tx - X0) / (COL_W + GAP);
        int row = (ty - Y0) / (ROW_H + GAP);
        col = constrain(col, 0, 3);
        row = constrain(row, 0, 3);

        const char keyMap[4][4] = {
            {'1','2','3','<'},
            {'4','5','6','C'},
            {'7','8','9','+'},
            {' ','0','*','='}
        };
        char key = keyMap[row][col];

        if (key >= '0' && key <= '9') {
            if (g_amount < 9999999L)
                g_amount = g_amount * 10 + (key - '0');
            refreshAmount();
        } else if (key == '<') {
            g_amount /= 10;
            refreshAmount();
        } else if (key == 'C') {
            g_amount = 0;
            refreshAmount();
        }
        // +  *  =  → à implémenter plus tard

        delay(150);
    }

    // ── Bouton PAYER (flash visuel seulement) ──
    else if (ty >= 416 && ty <= 474 && tx >= 4 && tx <= 156) {
        tft.fillRoundRect(4, 416, 152, 58, 14, TFT_WHITE);
        delay(70);
        tft.fillRoundRect(4, 416, 152, 58, 14, COLOR_PAYER);
        tft.drawRoundRect(4, 416, 152, 58, 14, 0x0B80);
        tft.setTextColor(TFT_WHITE);
        tft.setTextDatum(MC_DATUM);
        tft.drawString("PAYER", 80, 445, 4);
        delay(150);
    }

    // ── Bouton SCANNER (flash visuel seulement) ──
    else if (ty >= 416 && ty <= 474 && tx >= 162 && tx <= 316) {
        tft.fillRoundRect(162, 416, 154, 58, 14, TFT_WHITE);
        delay(70);
        tft.fillRoundRect(162, 416, 154, 58, 14, COLOR_SCANNER);
        tft.drawRoundRect(162, 416, 154, 58, 14, 0xC500);
        tft.setTextColor(COLOR_NAVY);
        tft.setTextDatum(MC_DATUM);
        tft.drawString("SCANNER", 239, 445, 4);
        delay(150);
    }

    Bridge.update();
}
