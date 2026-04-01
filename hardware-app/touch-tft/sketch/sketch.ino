#include "TFT_eSPI.h"           
#include "Arduino_RouterBridge.h"

TFT_eSPI tft = TFT_eSPI();

String enteredPin = "";
bool authenticated = false;
const String correctPin = "7687";

// --- Données Bridge ---
String g_timeStr = "09:41";
String g_dateStr = "mercredi : 1/4/2026";
String g_wifiStr = "Connected";
String g_battStr = "84%";

// --- Couleurs Thème Mobile ---
#define COLOR_BLUE    0x2477 // Bleu premium
#define COLOR_GREY_LT 0xDEFB // Gris très clair
#define COLOR_GREY_NK 0xD6BA // Gris navigation
#define COLOR_BG      TFT_WHITE // Fond blanc
#define COLOR_ACCENT  COLOR_BLUE

// --- Dessins d'Icônes Simples ---
void drawWiFiIcon(int x, int y, uint16_t color) {
    // Icône WiFi Verticale (Barres de signal)
    tft.fillRect(x, y + 12, 3, 4, color);
    tft.fillRect(x + 5, y + 8, 3, 8, color);
    tft.fillRect(x + 10, y + 4, 3, 12, color);
    tft.fillRect(x + 15, y, 3, 16, color);
}

void drawSaleIcon(int x, int y, uint16_t color) {
    // Bouton Sale - Chariot centré dans 80x80
    int ox = x + 25, oy = y + 20; // Décalage pour centrer
    tft.drawRect(ox + 5, oy + 5, 20, 15, color); 
    tft.drawLine(ox, oy, ox + 5, oy + 5, color); 
    tft.drawCircle(ox + 8, oy + 23, 2, color); 
    tft.drawCircle(ox + 22, oy + 23, 2, color); 
    // Flèche descendante
    tft.drawLine(ox + 15, oy + 2, ox + 15, oy + 12, 0xFD20); // Orange
    tft.drawLine(ox + 12, oy + 9, ox + 15, oy + 12, 0xFD20);
    tft.drawLine(ox + 18, oy + 9, ox + 15, oy + 12, 0xFD20);
}

void drawSettingsIcon(int x, int y, uint16_t color) {
    // Bouton Settings - Rouage centré
    int cx = x + 40, cy = y + 36;
    tft.drawCircle(cx, cy, 14, color);
    tft.drawCircle(cx, cy, 5, color);
    for (int i = 0; i < 8; i++) {
        float angle = i * 45 * PI / 180;
        tft.drawLine(cx + cos(angle)*14, cy + sin(angle)*14, cx + cos(angle)*19, cy + sin(angle)*19, color);
    }
}

void drawProfilIcon(int x, int y, uint16_t color) {
    // Bouton Profil - Utilisateur centré
    int cx = x + 40, cy = y + 36;
    tft.fillCircle(cx, cy, 20, 0x7E3F); // Fond bleu cercle
    tft.fillCircle(cx, cy - 5, 7, TFT_BLACK); // Tête
    tft.drawSmoothArc(cx, cy + 14, 12, 9, 230, 310, TFT_BLACK, 0x7E3F); // Épaules
}

void drawBackArrow(int x, int y, uint16_t color) {
    // Flèche Back style "<" BOLD et BLEU
    for (int i = 0; i < 3; i++) { // Épaisseur
        tft.drawLine(x + 20 + i, y + 15, x + 5 + i, y + 30, color);
        tft.drawLine(x + 5 + i, y + 30, x + 20 + i, y + 45, color);
    }
}

// --- Calibration du Tactile ---
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

// --- Dessin des 4 cases du PIN ---
void drawPinBoxes() {
    for (int i = 0; i < 4; i++) {
        int x = 25 + (i * 75);
        int y = 110;
        tft.drawRoundRect(x, y, 60, 70, 8, COLOR_GREY_NK);
        tft.fillRect(x+1, y+1, 58, 68, TFT_WHITE);
        if (i < enteredPin.length()) {
            tft.setTextColor(TFT_BLACK);
            tft.setTextDatum(MC_DATUM);
            tft.drawString(String(enteredPin[i]), x + 30, y + 35, 4);
        }
    }
}

// --- Dessin du Clavier Numérique ---
void drawKeypad() {
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_BLACK);
    const char keys[4][3] = {
        {'1', '2', '3'},
        {'4', '5', '6'},
        {'7', '8', '9'},
        {' ', '0', '<'}
    };
    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 3; c++) {
            int x = c * 106;
            int y = 280 + (r * 50);
            tft.drawRect(x, y, 106, 50, COLOR_GREY_LT);
            if (keys[r][c] != ' ') {
                tft.drawString(String(keys[r][c]), x + 53, y + 25, 4);
            }
        }
    }
}

// --- Dessin de la page principale ---
void drawMainUI() {
    tft.fillScreen(TFT_WHITE);
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(TC_DATUM);
    tft.drawString("Verify your Mobile Number", 160, 40, 2);
    tft.setTextColor(COLOR_GREY_NK);
    tft.drawString("Confirm your 4-digit PIN", 160, 70, 2);
    drawPinBoxes();
    tft.fillRoundRect(40, 210, 240, 50, 25, COLOR_BLUE);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("Verify now", 160, 235, 4);
    drawKeypad();
}

// --- Page Welcome Améliorée ---
void drawWelcomeScreen() {
    tft.fillScreen(TFT_WHITE);
    
    // Header (Top Bar - Heure, WiFi, Batt)
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(TL_DATUM);
    tft.drawString(g_timeStr, 15, 10, 4); 
    
    // Icône WiFi ou "E"
    if (g_wifiStr == "E") {
        tft.setTextColor(TFT_RED);
        tft.setTextDatum(TR_DATUM);
        tft.drawString("E", 255, 10, 4); // Lettrage Gras en rouge
    } else {
        drawWiFiIcon(240, 10, TFT_BLACK);
    }
    
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(TR_DATUM);
    tft.drawString(g_battStr, 290, 10, 2);
    // Icône batterie
    tft.drawRect(295, 10, 20, 10, TFT_BLACK);
    tft.fillRect(296, 11, 16, 8, TFT_GREEN);
    tft.fillRect(315, 13, 2, 4, TFT_BLACK); 
    
    // Bouton Back (Top gauche) BOLD et BLEU
    drawBackArrow(10, 40, COLOR_BLUE);
    
    // Date (Un peu plus petit et plus loin en bas)
    tft.setTextDatum(TL_DATUM);
    tft.setTextColor(TFT_BLACK);
    tft.drawString(g_dateStr, 15, 115, 2); // Taille Font réduite et Y décalé
    
    // Welcome Text (Bleu, Centré, Font Réduite)
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COLOR_BLUE);
    tft.drawString("WELCOME", 160, 240, 4); 
    
    // Navigation Bar (Bleu en bas)
    tft.fillRect(0, 320, 320, 160, COLOR_BLUE);
    
    // Boutons de Menu
    int btnY = 340;
    int btnW = 80, btnH = 80;
    
    // Settings
    tft.fillRoundRect(25, btnY, btnW, btnH, 15, COLOR_GREY_NK);
    drawSettingsIcon(25, btnY, TFT_BLACK);
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(BC_DATUM);
    tft.drawString("Settings", 65, btnY + 74, 2);

    // Sale
    tft.fillRoundRect(120, btnY, btnW, btnH, 15, COLOR_GREY_NK);
    drawSaleIcon(120, btnY, TFT_BLACK);
    tft.drawString("Sale", 160, btnY + 74, 2);

    // Profile
    tft.fillRoundRect(215, btnY, btnW, btnH, 15, COLOR_GREY_NK);
    drawProfilIcon(215, btnY, TFT_BLACK);
    tft.drawString("Profile", 255, btnY + 74, 2);
}

// --- Fonctions de mise à jour via Bridge (RPC) ---
void update_status_cb(String t, String d, String w, String b) {
    g_timeStr = t;
    g_dateStr = d;
    g_wifiStr = w;
    g_battStr = b;
}

void setup() {
    tft.init();
    tft.setRotation(0);
    touch_calibrate();
    drawMainUI();
    
    Bridge.begin();
    // On enregistre les fonctions que Python peut appeler
    Bridge.provide("update_status", update_status_cb);
}

void loop() {
    uint16_t x = 0, y = 0;

    // Redessiner uniquement si les données changent (toutes les minutes)
    static String lastD = "";
    if (authenticated && g_dateStr != lastD) {
        lastD = g_dateStr;
        drawWelcomeScreen();
    }

    if (tft.getTouch(&x, &y)) {
        if (!authenticated) {
            // Logique Clavier PIN
            if (y >= 280 && y <= 480) {
                int col = x / 106;
                int row = (y - 280) / 50;
                if (col > 2) col = 2; if (row > 3) row = 3;
                const char keys[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}};
                char key = keys[row][col];
                if (key >= '0' && key <= '9') {
                    if (enteredPin.length() < 4) { enteredPin += key; drawPinBoxes(); }
                } else if (key == '<') {
                    if (enteredPin.length() > 0) { enteredPin.remove(enteredPin.length() - 1); drawPinBoxes(); }
                }
                delay(200);
            }
            else if (y >= 210 && y <= 260 && x >= 40 && x <= 280) {
                if (enteredPin == correctPin) {
                    authenticated = true;
                    drawWelcomeScreen();
                } else {
                    enteredPin = "";
                    drawPinBoxes();
                    delay(200);
                }
            }
        } 
        else {
            // Logique Page Welcome
            // Bouton Back (Top gauche)
            if (x < 60 && y < 80) {
                authenticated = false;
                enteredPin = "";
                drawMainUI();
                delay(200);
            }
            // Boutons Menu (Bottom Bar)
            if (y > 320) {
                if (x >= 25 && x <= 105) { /* Action Settings */ }
                if (x >= 120 && x <= 200) { /* Action Sale */ }
                if (x >= 215 && x <= 295) { /* Action Profile */ }
            }
        }
    }
    
    // Bridge.update() à la fin comme dans le code original fonctionnel
    Bridge.update();
}
