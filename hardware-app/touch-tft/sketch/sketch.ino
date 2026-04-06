
#include "TFT_eSPI.h"           
#include "Arduino_RouterBridge.h"

TFT_eSPI tft = TFT_eSPI();

String enteredPin = "";
int currentPage = 0; // 0=LOGIN, 1=WELCOME, 2=SALE, 3=SETTINGS, 4=PROFILE, 5=EDIT_POS_NAME
const String correctPin = "7687";

// --- Données Bridge ---
String g_timeStr = "09:41";
String g_dateStr = "mercredi : 1/4/2026";
String g_wifiStr = "Connected";
String g_battStr = "84%";

String g_posName   = "Izinm_POS";
String g_roleGrade = "Market merchant";
String g_tempBuffer= ""; 
int    g_editMode  = 0; // 0 = POS Name, 1 = Role/Grade
bool   firstDraw   = true;

// --- Couleurs Thème Mobile ---
#define COLOR_BLUE    0x2477 // Bleu premium
#define COLOR_NAVY    0x018C // Bleu Marine profond (Image)
#define COLOR_GLOW    0x05FF // Cyan/Bleu Lumineux
#define COLOR_GREY_LT 0xDEFB // Gris très clair
#define COLOR_GREY_NK 0xD6BA // Gris navigation
#define COLOR_BG      TFT_WHITE // Fond blanc
#define COLOR_ACCENT  COLOR_BLUE

// --- Dessins d'Icônes Simples ---
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

void drawSaleIcon(int x, int y, uint16_t color) {
    int cx = x + 42, cy = y + 50; // Centré dans le bouton de largeur 85
    
    // Hanse du sac de shopping
    for (int i = 0; i < 3; i++) {
        tft.drawRoundRect(cx - 10 - i, cy - 15 - i, 20 + i*2, 20 + i*2, 8, color);
    }
    
    // Corps plein du sac (beaucoup plus lisible qu'un chariot fin)
    tft.fillRoundRect(cx - 17, cy - 4, 34, 28, 4, color);
    
    // Détail central transparent (Ajusté à la couleur du bouton)
    tft.fillRoundRect(cx - 6, cy + 5, 12, 12, 2, COLOR_GLOW); 
    tft.fillCircle(cx, cy + 11, 3, color); 
}

void drawSettingsIcon(int x, int y, uint16_t color) {
    int cx = x + 42, cy = y + 50; 
    
    // Engrenage plein : dessin des 8 dents extérieures
    for (int j = 0; j < 8; j++) {
        float angle = j * 45 * PI / 180;
        tft.fillCircle(cx + cos(angle)*15, cy + sin(angle)*15, 6, color);
    }
    // Corps principal de l'engrenage
    tft.fillCircle(cx, cy, 14, color);
    
    // Trou au centre (couleur du bouton COLOR_GLOW pour l'effet transparent)
    tft.fillCircle(cx, cy, 6, COLOR_GLOW); 
}

void drawProfilIcon(int x, int y, uint16_t color) {
    int cx = x + 42, cy = y + 45; // Ajustement vertical
    
    // Tête de l'avatar (cercle plein réduit)
    tft.fillCircle(cx, cy - 8, 8, color); 
    
    // Épaules et corps (plus compacts)
    tft.fillRoundRect(cx - 14, cy + 4, 28, 14, 6, color);
}

void drawBackArrow(int x, int y, uint16_t color) {
    // Icône Flèche Back Stylisée
    int ax = x + 15, ay = y + 10;
    for (int i = 0; i < 3; i++) { // Épaisseur BOLD
        tft.drawLine(ax + 15, ay + i, ax + i, ay + 15 + i, color);
        tft.drawLine(ax + i, ay + 15 + i, ax + 15, ay + 30 + i, color);
        tft.drawLine(ax + i, ay + 15 + i, ax + 35 + i, ay + 15 + i, color);
    }
}

// --- Dessin de la zone de texte (EDITION) ---
void drawInputBox() {
    tft.fillRoundRect(15, 100, 290, 60, 10, TFT_WHITE);
    tft.drawRoundRect(15, 100, 290, 60, 10, COLOR_GLOW);
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(MC_DATUM);
    // On efface l'ancien texte avec le rectangle blanc déjà fait au dessus
    tft.drawString(g_tempBuffer, 160, 130, 4);
}

// --- Calibration du Tactile (Version Non-bloquante) ---
void my_touch_calibrate() {
    uint16_t calData[5];
    uint16_t x_raw, y_raw;
    uint32_t values[8] = {0}; // x,y for 4 points
    
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("TOUCH CORNERS", 160, 200, 4);
    tft.drawString("Follow the magenta dots", 160, 240, 2);

    for (int i = 0; i < 4; i++) {
        // Dessin de la mire
        int cx = (i == 0 || i == 1) ? 20 : 300;
        int cy = (i == 0 || i == 2) ? 20 : 460;
        tft.fillCircle(cx, cy, 10, TFT_MAGENTA);
        tft.drawCircle(cx, cy, 15, TFT_WHITE);

        // Attente du touch (Vérifie la pression Z)
        while (tft.getTouchRawZ() < 350) {
            Bridge.update();
            delay(10);
            yield();
        }
        
        // Lecture des coordonnées stabilisées
        delay(20); 
        tft.getTouchRaw(&x_raw, &y_raw);
        
        values[i * 2] = x_raw;
        values[i * 2 + 1] = y_raw;
        
        // Attente du relâchement de l'écran pour passer au point suivant
        while (tft.getTouchRawZ() > 300) {
            Bridge.update(); // Permet au Python de continuer à communiquer
            delay(10);
            yield();
        }
        
        tft.fillCircle(cx, cy, 15, TFT_BLACK); // Efface la mire
        delay(500); 
    }

    // Calcul des paramètres (Logique officielle de Touch.cpp)
    uint16_t x0, x1, y0, y1;
    bool rotate = false, inv_x = false, inv_y = false;
    
    // Comparaison des deltas pour détecter l'orientation (Portrait vs Paysage)
    if (abs((int)values[0] - (int)values[2]) > abs((int)values[1] - (int)values[3])) {
        rotate = true;
        x0 = (values[1] + values[3]) / 2;
        x1 = (values[5] + values[7]) / 2;
        y0 = (values[0] + values[4]) / 2;
        y1 = (values[2] + values[6]) / 2;
    } else {
        rotate = false;
        x0 = (values[0] + values[2]) / 2;
        x1 = (values[4] + values[6]) / 2;
        y0 = (values[1] + values[5]) / 2;
        y1 = (values[3] + values[7]) / 2;
    }
    
    if (x0 > x1) { uint16_t t = x0; x0 = x1; x1 = t; inv_x = true; }
    if (y0 > y1) { uint16_t t = y0; y0 = y1; y1 = t; inv_y = true; }

    // Calcul de l'échelle (on projette de 280px/440px vers 320px/480px)
    uint32_t dx = x1 - x0;
    uint32_t dy = y1 - y0;

    calData[0] = x0 - (dx * 20 / 280);
    calData[1] = dx * 320 / 280;
    calData[2] = y0 - (dy * 20 / 440);
    calData[3] = dy * 480 / 440;
    calData[4] = rotate | (inv_x << 1) | (inv_y << 2);

    tft.setTouch(calData);
    tft.fillScreen(TFT_WHITE);
}

void touch_calibrate() {
    my_touch_calibrate();
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

// --- CLAVIER ALPHANUMÉRIQUE (Dark Theme) ---
void drawAlphaKeyboard() {
    tft.fillRect(0, 260, 320, 220, 0x10A2); // Fond sombre Navy profond
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_WHITE);
    
    // Layout 4 lignes x 10 colonnes
    const char* keys[4] = {
        "1234567890",
        "QWERTYUIOP",
        "ASDFGHJKL-",
        "ZXCVBNM.,<" // < = Backspace
    };

    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 10; c++) {
            int bx = c * 32;
            int by = 260 + (r * 45);
            // Touche (Gris foncé)
            tft.drawRoundRect(bx + 1, by + 1, 30, 43, 4, 0x39C7); // Gris Navigation
            tft.fillRoundRect(bx + 2, by + 2, 28, 41, 3, 0x2104); // Navy subtil
            
            char k = keys[r][c];
            tft.drawString(String(k), bx + 16, by + 22, 2);
        }
    }

    // Ligne 5 spécifique : SPACE + OK
    // Space (x=0 to 192)
    tft.fillRoundRect(5, 445, 182, 30, 6, 0x39C7);
    tft.drawString("SPACE", 96, 460, 2);
    // OK (x=192 to 320)
    tft.fillRoundRect(197, 445, 118, 30, 6, COLOR_BLUE);
    tft.setTextColor(TFT_WHITE);
    tft.drawString("SAVE", 256, 460, 4);
}

// --- Page EDIT POS NAME (5) ---
void drawEditPOSNameScreen() {
    tft.fillScreen(COLOR_NAVY); // Fond sombre intégral pour l'édition
    updateHeader();
    
    // Titre et bouton Back (TOP)
    tft.fillRect(0, 45, 320, 40, 0x18C3);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    if (g_editMode == 0) {
        tft.drawString("Edit POS Name", 160, 65, 4);
    } else {
        tft.drawString("Edit Role / Grade", 160, 65, 4);
    }
    
    // Bouton Cancel / Back Arrow
    drawBackArrow(5, 50, TFT_WHITE);

    tft.setTextColor(COLOR_GLOW);
    tft.setTextDatum(TL_DATUM);
    if (g_editMode == 0) {
        tft.drawString("New POS name:", 20, 85, 2);
    } else {
        tft.drawString("New Role / Grade:", 20, 85, 2);
    }

    // Dessin de la zone de texte dédiée
    drawInputBox();

    // Dessin du clavier
    drawAlphaKeyboard();
}

// --- Mise à jour de la barre de statut ---
void updateHeader() {
    tft.fillRect(0, 0, 320, 45, TFT_WHITE); 
    tft.setTextColor(COLOR_NAVY); 
    tft.setTextDatum(TL_DATUM);
    tft.drawString(g_timeStr, 15, 12, 2);
    int bx = 280, by = 13;
    tft.drawRoundRect(bx, by, 25, 13, 3, COLOR_NAVY); 
    tft.drawRoundRect(bx+1, by+1, 23, 11, 2, COLOR_NAVY);
    tft.fillRect(bx + 25, by + 4, 3, 5, COLOR_NAVY);
    int battVal = g_battStr.toInt(); 
    if (battVal > 100) battVal = 100;
    int fillW = map(battVal, 0, 100, 0, 19);
    tft.fillRect(bx + 3, by + 3, fillW, 7, TFT_GREEN);
    tft.setTextDatum(TR_DATUM);
    tft.drawString(g_battStr, bx - 6, 12, 2);
    drawWiFiIcon(bx - 60, 11, COLOR_NAVY); 
}

// --- Page Welcome Améliorée ---
void drawWelcomeScreen() {
    tft.fillScreen(TFT_WHITE); 
    updateHeader();
    drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(ML_DATUM); 
    tft.fillRoundRect(-10, 118, 250, 36, 18, TFT_BLACK); 
    tft.fillRoundRect(-8, 120, 246, 32, 16, TFT_WHITE); 
    tft.drawString(g_dateStr, 20, 138, 4);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("WELCOME", 160, 240, 4); 
    int btnY = 310, btnW = 85, btnH = 125;
    tft.drawRoundRect(15, btnY, btnW, btnH, 40, COLOR_GLOW); 
    drawSettingsIcon(15, btnY, TFT_WHITE);
    tft.setTextDatum(BC_DATUM);
    tft.drawString("Settings", 57, btnY + 115, 2);
    tft.drawRoundRect(117, btnY, btnW, btnH, 40, COLOR_GLOW);
    drawSaleIcon(117, btnY, TFT_WHITE);
    tft.drawString("Sale", 159, btnY + 115, 2);
    tft.drawRoundRect(220, btnY, btnW, btnH, 40, COLOR_GLOW);
    drawProfilIcon(220, btnY, TFT_WHITE);
    tft.drawString("Profile", 262, btnY + 115, 2);
}

// --- Page PROFILE (4) ---
void drawProfileScreen() {
    tft.fillScreen(TFT_WHITE); 
    updateHeader();
    drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("PROFILE", 160, 165, 4); 
    drawProfilIcon(117, 160, TFT_WHITE); 
    int startY = 245;
    tft.setTextDatum(TL_DATUM);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY); tft.drawString("Terminal ID", 35, startY, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);  tft.drawString("04040023", 35, startY + 25, 2);
    tft.drawFastHLine(30, startY + 54, 260, 0x18C3);
    
    // CHAMP 1 : POS Name
    tft.setTextDatum(TL_DATUM);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY); tft.drawString("POS Name", 35, startY + 65, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);  tft.drawString(g_posName, 35, startY + 90, 2);
    drawPenIcon(265, startY + 70, COLOR_GLOW);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY);
    tft.drawString("edit", 280, startY + 104, 2);
    tft.drawFastHLine(30, startY + 119, 260, 0x18C3);

    // CHAMP 2 : Role / Grade
    tft.setTextDatum(TL_DATUM);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY); tft.drawString("Role / Grade", 35, startY + 130, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);  tft.drawString(g_roleGrade, 35, startY + 155, 2);
    drawPenIcon(265, startY + 135, COLOR_GLOW);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY);
    tft.drawString("edit", 280, startY + 169, 2);
    tft.drawFastHLine(30, startY + 184, 260, 0x18C3);
}

void drawPenIcon(int x, int y, uint16_t color) {
    tft.drawLine(x + 5, y + 25, x + 25, y + 5, color);
    tft.drawLine(x + 6, y + 26, x + 26, y + 6, color);
    tft.fillTriangle(x + 5, y + 25, x + 8, y + 23, x + 3, y + 28, color);
}

void drawScannerIcon(int x, int y, uint16_t color) {
    // Barcode simplifié et épais
    tft.fillRect(x + 5, y + 5, 4, 25, color);
    tft.fillRect(x + 12, y + 5, 2, 25, color);
    tft.fillRect(x + 17, y + 5, 6, 25, color);
    tft.fillRect(x + 26, y + 5, 3, 25, color);
    tft.fillRect(x + 32, y + 5, 5, 25, color);
    // Laser rouge horizontal
    tft.fillRect(x, y + 16, 42, 3, TFT_RED);
}

void drawCalculIcon(int x, int y, uint16_t color) {
    // Corps solide
    tft.fillRoundRect(x + 6, y, 30, 36, 4, color);
    // Écran blanc
    tft.fillRect(x + 10, y + 4, 22, 10, COLOR_NAVY);
    // 4 gros boutons simplify
    tft.fillRect(x + 10, y + 18, 9, 6, COLOR_GLOW);
    tft.fillRect(x + 23, y + 18, 9, 6, COLOR_GLOW);
    tft.fillRect(x + 10, y + 27, 9, 6, COLOR_GLOW);
    tft.fillRect(x + 23, y + 27, 9, 6, COLOR_GLOW);
}

void drawRefundIcon(int x, int y, uint16_t color) {
    int cx = x + 20, cy = y + 18; // Centré dans la zone d'icône
    // Cercle extérieur épais
    tft.drawCircle(cx, cy, 18, color);
    tft.drawCircle(cx, cy, 17, color);
    // Flèche de retour (Refund)
    tft.fillRect(cx - 6, cy - 2, 16, 4, color);
    tft.fillTriangle(cx - 6, cy - 8, cx - 14, cy, cx - 6, cy + 8, color);
}

void drawArchivesIcon(int x, int y, uint16_t color) {
    // Dossier plein
    tft.fillRoundRect(x + 4, y + 6, 34, 26, 3, color);
    tft.fillRoundRect(x + 4, y + 2, 15, 8, 2, color);
    // Lignes de séparation
    tft.fillRect(x + 10, y + 14, 22, 3, COLOR_NAVY);
    tft.fillRect(x + 10, y + 22, 16, 3, COLOR_NAVY);
}

// --- Nouvelles Icônes SETTINGS ---
void drawWiFiSettingIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.fillCircle(cx, cy + 5, 4, color);
    tft.drawCircle(cx, cy + 5, 10, color);
    tft.drawCircle(cx, cy + 5, 11, color);
    tft.drawCircle(cx, cy + 5, 18, color);
    tft.drawCircle(cx, cy + 5, 19, color);
    tft.fillRect(cx - 25, cy + 6, 50, 25, COLOR_NAVY);
    tft.fillTriangle(cx, cy + 5, cx - 25, cy + 5, cx - 25, cy - 25, COLOR_NAVY);
    tft.fillTriangle(cx, cy + 5, cx + 25, cy + 5, cx + 25, cy - 25, COLOR_NAVY);
}

void drawDisplayIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.fillCircle(cx, cy, 8, color);
    for(int i = 0; i < 8; i++) {
        float a = i * 45 * PI / 180;
        tft.fillCircle(cx + cos(a)*14, cy + sin(a)*14, 2, color);
    }
}

void drawSecurityIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawRoundRect(cx-10, cy-5, 20, 18, 2, color);
    tft.drawCircle(cx, cy-8, 8, color);
    tft.drawCircle(cx, cy-8, 7, color);
    tft.fillRect(cx-12, cy-8, 24, 6, COLOR_NAVY);
    tft.fillCircle(cx, cy+4, 3, color);
}

void drawAboutIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawCircle(cx, cy, 18, color);
    tft.drawCircle(cx, cy, 17, color);
    tft.fillRect(cx-2, cy-8, 4, 16, color);
    tft.fillCircle(cx, cy-12, 3, color);
}

void drawSystemIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawCircle(cx, cy, 13, color);
    tft.drawCircle(cx, cy, 3, color);
    for(int i=0; i<8; i++) {
        float a = i*45*PI/180;
        tft.fillCircle(cx+cos(a)*15, cy+sin(a)*15, 4, color);
    }
}

void drawSaleSettingsIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawCircle(cx, cy, 18, color);
    tft.setTextColor(color, COLOR_NAVY);
    tft.drawString("$", cx, cy, 4);
}

void drawSettingsButton(int x, int y, int w, int h, const char* label, int iconType) {
    tft.drawRoundRect(x, y, w, h, 15, COLOR_GLOW);
    if (iconType == 6)      drawWiFiSettingIcon(x, y, TFT_WHITE);
    else if (iconType == 5) drawDisplayIcon(x, y, TFT_WHITE);
    else if (iconType == 8) drawSecurityIcon(x, y, TFT_WHITE);
    else if (iconType == 7) drawAboutIcon(x, y, TFT_WHITE);
    else if (iconType == 9) drawSystemIcon(x, y, TFT_WHITE);
    else if (iconType == 10) drawSaleSettingsIcon(x, y, TFT_WHITE);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(BC_DATUM);
    tft.drawString(label, x + w/2, y + h - 10, 2);
}

void drawSaleButton(int x, int y, int w, int h, const char* label, int iconType) {
    // Cadre du bouton
    tft.drawRoundRect(x, y, w, h, 15, COLOR_GLOW);
    
    // Position centrale de l'icône dans le bouton
    int iconX = x + (w - 40) / 2;
    int iconY = y + 15;
    
    if (iconType == 0) drawScannerIcon(iconX, iconY, TFT_WHITE);
    else if (iconType == 1) drawCalculIcon(iconX, iconY, TFT_WHITE);
    else if (iconType == 2) drawRefundIcon(iconX, iconY, TFT_WHITE);
    else if (iconType == 3) drawArchivesIcon(iconX, iconY, TFT_WHITE);
    
    // Texte centré en bas de l'icône
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(BC_DATUM);
    tft.drawString(label, x + w/2, y + h - 10, 2);
}

void drawSaleScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("SALE MENU", 160, 180, 4); 
    
    int col1 = 25, col2 = 170, row1 = 230, row2 = 340, w = 125, h = 90;
    
    drawSaleButton(col1, row1, w, h, "Scan", 0);
    drawSaleButton(col2, row1, w, h, "Manual", 1);
    drawSaleButton(col1, row2, w, h, "Refund", 2);
    drawSaleButton(col2, row2, w, h, "History", 3);
}

void drawSettingsScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("SETTINGS MENU", 160, 175, 4); 
    
    int w = 125, h = 80;
    int col1 = 25, col2 = 170;
    int row1 = 200, row2 = 295, row3 = 390;

    drawSettingsButton(col1, row1, w, h, "Network", 6);
    drawSettingsButton(col2, row1, w, h, "Display", 5);
    drawSettingsButton(col1, row2, w, h, "Security", 8); 
    drawSettingsButton(col2, row2, w, h, "System", 9);
    drawSettingsButton(col1, row3, w, h, "Sale Opts", 10);
    drawSettingsButton(col2, row3, w, h, "About", 7);
}

void update_status_cb(String t, String d, String w, String b) {
    g_timeStr = t; g_dateStr = d; g_wifiStr = w; g_battStr = b;
}

void setup() {
    Serial.begin(115200);
    delay(200); // Délai réduit pour réactivité
    
    // 1. Initialiser le Bridge IMMÉDIATEMENT (prévenir timeout RPC)
    Bridge.begin();
    Bridge.provide("update_status", update_status_cb);
    
    // 2. Initialiser l'écran
    tft.init();
    tft.setRotation(0);
    
    // État visuel initial pour confirmer le démarrage
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("INITIALIZING...", 160, 240, 4);
    delay(500);
    
    // 3. Calibration (qui laisse passer les messages Bridge)
    touch_calibrate(); 
    
    firstDraw = true; // Prêt pour le premier dessin de UI
}

void loop() {
    uint16_t x = 0, y = 0;
    static int lastPage = -1;
    if (lastPage != currentPage) {
        lastPage = currentPage;
        if (currentPage == 0) drawMainUI();
        else if (currentPage == 1) drawWelcomeScreen();
        else if (currentPage == 2) drawSaleScreen();
        else if (currentPage == 3) drawSettingsScreen();
        else if (currentPage == 4) drawProfileScreen();
        else if (currentPage == 5) drawEditPOSNameScreen();
    }

    if (tft.getTouch(&x, &y)) {
        if (currentPage == 0) {
            if (y >= 280) {
                int col = x / 106, row = (y - 280) / 50;
                const char k[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}};
                char key = k[row][col];
                if (key >= '0' && key <= '9') { if (enteredPin.length() < 4) { enteredPin += key; drawPinBoxes(); } }
                else if (key == '<') { if (enteredPin.length() > 0) { enteredPin.remove(enteredPin.length()-1); drawPinBoxes(); } }
                delay(200);
            }
            else if (y >= 210 && y <= 260 && x >= 40 && x <= 280) {
                if (enteredPin == correctPin) currentPage = 1; else { enteredPin = ""; drawPinBoxes(); }
                delay(200);
            }
        } 
        else if (currentPage == 1) { // Page WELCOME
            // Zone de retour agrandie (Top Gauche)
            if (x < 100 && y < 150) { 
                currentPage = 0; 
                enteredPin = ""; 
                delay(200);
            }
            else if (y > 300) {
                if (x < 110) currentPage = 3;
                else if (x < 210) currentPage = 2;
                else currentPage = 4;
            }
            delay(200);
        }
        else if (currentPage == 2 || currentPage == 3) { // Pages SALE et SETTINGS
            if (x < 100 && y < 150) { 
                currentPage = 1; 
                delay(200);
            }
        }
        else if (currentPage == 4) { // Page PROFILE
            // Zone de retour agrandie
            if (x < 100 && y < 150) { 
                currentPage = 1; 
                delay(200);
            }
            else if (y >= 300 && y <= 370) {
                // Edit POS Name
                g_editMode = 0;
                currentPage = 5; 
                g_tempBuffer = g_posName; 
            }
            else if (y >= 370 && y <= 440) {
                // Edit Role / Grade
                g_editMode = 1;
                currentPage = 5; 
                g_tempBuffer = g_roleGrade; 
            }
            delay(200);
        }
        else if (currentPage == 5) { // Page EDIT
            // Zone de retour agrandie
            if (x < 100 && y < 150) { 
                currentPage = 4; 
                delay(200);
            }
            else if (y >= 260) {
                if (y < 440) {
                    int r = (y - 260) / 45, c = x / 32;
                    const char* ks[4] = {"1234567890", "QWERTYUIOP", "ASDFGHJKL-", "ZXCVBNM.,<"};
                    char k = ks[r][c];
                    if (k == '<') { if (g_tempBuffer.length() > 0) g_tempBuffer.remove(g_tempBuffer.length()-1); }
                    else { if (g_tempBuffer.length() < 18) g_tempBuffer += k; }
                    drawInputBox(); // Mise à jour INSTANTANÉE sans scintillement
                } else {
                    if (x < 192) { g_tempBuffer += " "; drawInputBox(); }
                    else { 
                        if (g_editMode == 0) g_posName = g_tempBuffer; 
                        else g_roleGrade = g_tempBuffer;
                        currentPage = 4; 
                    }
                }
                delay(200);
            }
        }
    }
    Bridge.update();
}