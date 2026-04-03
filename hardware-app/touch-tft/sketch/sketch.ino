#include "TFT_eSPI.h"           
#include "Arduino_RouterBridge.h"

TFT_eSPI tft = TFT_eSPI();

String enteredPin = "";
int currentPage = 0; // 0=LOGIN, 1=WELCOME, 2=SALE, 3=SETTINGS, 4=PROFILE, 5=EDIT_PROMPT
const String correctPin = "7687";

// --- Données Bridge ---
String g_timeStr = "09:41";
String g_dateStr = "mercredi : 1/4/2026";
String g_wifiStr = "Connected";
String g_battStr = "84%";

String g_posName   = "Izinm_POS";
String g_roleGrade = "Market merchant";
bool   firstDraw   = true;

// --- État Édition ---
int    editField    = -1;   // -1=aucun, 0=POS Name, 1=Role/Grade
bool   showKeyboard = false;
String editBuffer   = "";
const char* kbRows[4] = { "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM", "1234567890" };

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
    // Icône Flèche Back Stylisée (Plus jolie que le simple "<")
    int ax = x + 15, ay = y + 10;
    for (int i = 0; i < 3; i++) { // Épaisseur BOLD
        tft.drawLine(ax + 15, ay + i, ax + i, ay + 15 + i, color);
        tft.drawLine(ax + i, ay + 15 + i, ax + 15, ay + 30 + i, color);
        tft.drawLine(ax + i, ay + 15 + i, ax + 35 + i, ay + 15 + i, color); // Ligne droite
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

// --- Clavier Alphanumérique (Page 5 Overlay) ---
void drawAlphaKeyboard() {
    int kbY = 280; 
    tft.fillRect(0, kbY - 4, 320, 204, 0x10A2); // Fond sombre clavier
    for (int r = 0; r < 4; r++) {
        const char* row = kbRows[r];
        int len = strlen(row);
        int keyW = 320 / len;
        int keyH = 42;
        int y = kbY + r * keyH;
        for (int c = 0; c < len; c++) {
            int x = c * keyW;
            tft.fillRoundRect(x + 2, y + 2, keyW - 4, keyH - 4, 6, COLOR_GREY_NK);
            tft.setTextColor(TFT_BLACK);
            tft.setTextDatum(MC_DATUM);
            char buf[2] = {row[c], 0};
            tft.drawString(buf, x + keyW / 2, y + keyH / 2, 2);
        }
    }
    int y5 = kbY + 4 * 42;
    // Ligne Espace/Del/OK
    tft.fillRoundRect(2, y5 + 2, 130, 38, 8, COLOR_GREY_NK);
    tft.setTextColor(TFT_BLACK); tft.drawString("SPACE", 67, y5 + 21, 2);
    tft.fillRoundRect(136, y5 + 2, 80, 38, 8, 0xC618); // Rougeish DEL
    tft.setTextColor(TFT_WHITE); tft.drawString("DEL", 176, y5 + 21, 2);
    tft.fillRoundRect(220, y5 + 2, 98, 38, 8, COLOR_GLOW);
    tft.setTextColor(TFT_WHITE); tft.drawString("OK", 269, y5 + 21, 2);
}

// --- PROMPT ALERTE EDIT (Overlay sur page Profil - Page 5) ---
void drawEditPrompt() {
    // 1. Dessiner la page Profil en fond
    drawProfileScreen();

    // 2. Overlay simple (Plus rapide qu'une boucle de lignes)
    tft.fillRect(0, 0, 320, 480, 0x2104); // Sombre 10%

    // 3. Dialogue (Position ajustée si clavier actif)
    int bx = 30, by = 140; 
    if (showKeyboard) by = 60; // Remonter pour faire place au clavier

    // Ombre 
    tft.fillRoundRect(bx + 5, by + 5, 260, 200, 18, 0x2104);
    // Cadre Blanc
    tft.fillRoundRect(bx, by, 260, 200, 18, TFT_WHITE);
    tft.drawRoundRect(bx, by, 260, 200, 18, COLOR_GREY_NK);
    tft.drawRoundRect(bx + 1, by + 1, 258, 198, 17, COLOR_GREY_LT);

    // 4. Champs Texte
    // Libellés basés sur 'by'
    tft.setTextColor(COLOR_NAVY); tft.setTextDatum(TL_DATUM);
    tft.drawString("POS Name", bx + 22, by + 20, 2);
    tft.drawString("Role / Grade", bx + 22, by + 72, 2);

    // Champ 1: POS Name
    uint16_t border1 = (showKeyboard && editField == 0) ? COLOR_GLOW : COLOR_GREY_NK;
    tft.fillRoundRect(bx + 20, by + 35, 220, 28, 6, TFT_WHITE);
    tft.drawRoundRect(bx + 20, by + 35, 220, 28, 6, border1);
    tft.setTextColor(TFT_BLACK); tft.setTextDatum(ML_DATUM);
    String val1 = (showKeyboard && editField == 0) ? editBuffer + "|" : g_posName;
    tft.drawString(val1, bx + 32, by + 49, 2);

    // Champ 2: Role / Grade
    uint16_t border2 = (showKeyboard && editField == 1) ? COLOR_GLOW : COLOR_GREY_NK;
    tft.fillRoundRect(bx + 20, by + 87, 220, 28, 6, TFT_WHITE);
    tft.drawRoundRect(bx + 20, by + 87, 220, 28, 6, border2);
    tft.setTextColor(TFT_BLACK); tft.setTextDatum(ML_DATUM);
    String val2 = (showKeyboard && editField == 1) ? editBuffer + "|" : g_roleGrade;
    tft.drawString(val2, bx + 32, by + 101, 2);

    // 5. Boutons (Uniquement si clavier masqué)
    if (!showKeyboard) {
        tft.drawFastHLine(bx + 10, by + 142, 240, COLOR_GREY_NK);
        
        // Cancel
        tft.fillRoundRect(bx + 15, by + 152, 107, 38, 12, COLOR_GREY_LT);
        tft.drawRoundRect(bx + 15, by + 152, 107, 38, 12, COLOR_GREY_NK);
        tft.setTextColor(TFT_BLACK); tft.setTextDatum(MC_DATUM);
        tft.drawString("Cancel", bx + 68, by + 171, 2);

        // OK
        tft.fillRoundRect(bx + 137, by + 152, 107, 38, 12, COLOR_BLUE);
        tft.setTextColor(TFT_WHITE);
        tft.drawString("OK", bx + 190, by + 171, 2);
    } else {
        // Dessiner le clavier si nécessaire
        drawAlphaKeyboard();
    }
}

// --- Mise à jour de la barre de statut ---
void updateHeader() {
    // ---- REGLES D'EMPLACEMENT (HEADER) ----
    // Zone de nettoyage du Header (y de 0 à 45)
    tft.fillRect(0, 0, 320, 45, TFT_WHITE); 
    
    // 1. HEURE (En haut à gauche)
    int timeX = 15; // Modifiez pour décaler l'heure horizontalement
    int timeY = 12; // Modifiez pour décaler l'heure verticalement
    tft.setTextColor(COLOR_NAVY); // Couleur correspondant à l'image
    tft.setTextDatum(TL_DATUM);   // TL_DATUM = Origine en Haut à Gauche
    tft.drawString(g_timeStr, timeX, timeY, 2); // "2" = Police minimisée
    
    // 2. BATTERIE - ICÔNE (En haut à droite)
    int bx = 280; // Modifiez pour décaler l'icône batterie horizontalement (X)
    int by = 13;  // Modifiez pour décaler l'icône batterie verticalement (Y)

    // Dessin de la coque de la batterie
    tft.drawRoundRect(bx, by, 25, 13, 3, COLOR_NAVY); 
    tft.drawRoundRect(bx+1, by+1, 23, 11, 2, COLOR_NAVY); // Épaisseur
    tft.fillRect(bx + 25, by + 4, 3, 5, COLOR_NAVY);      // Connecteur (à droite)
    
    // Remplissage dynamique de la batterie
    int battVal = g_battStr.toInt(); 
    if (battVal > 100) battVal = 100;
    if (battVal < 0) battVal = 0;
    int fillW = map(battVal, 0, 100, 0, 19);
    tft.fillRect(bx + 3, by + 3, fillW, 7, TFT_GREEN); // Vert selon charge
    
    // 3. BATTERIE - POURCENTAGE ("92%")
    int pctX = bx - 6; // Espace entre batterie et texte (6 pixels à gauche de la batterie)
    int pctY = 12;     // Alignement vertical du texte
    
    tft.setTextDatum(TR_DATUM);   // TR_DATUM = Origine en Haut à Droite (le texte s'étire vers la gauche)
    tft.setTextColor(COLOR_NAVY); // Mettre TFT_BLACK si vous le voulez plus noir
    tft.drawString(g_battStr, pctX, pctY, 2); // "2" = Police fine
    
    // 4. ICÔNE RÉSEAU (Signal / Barres)
    int wifiSpacing = 52;           // Modifiez pour écarter l'icône réseau du pourcentage (décalé plus à gauche)
    int wifiX = pctX - wifiSpacing; // Calcule de la position finale
    int wifiY = 11;                 // Modifiez pour monter/descendre l'icône réseau
    
    drawWiFiIcon(wifiX, wifiY, COLOR_NAVY); 
}

// --- Page Welcome Améliorée (Design Split Image) ---
void drawWelcomeScreen() {
    tft.fillScreen(TFT_WHITE); 
    
    // Header
    updateHeader();
    
    // Icône Flèche Back
    drawBackArrow(10, 65, COLOR_NAVY); 

    // Fond Marine
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);

    // Date Bubble (Taille plus grande, bolde et bordure noire 2px)
    tft.setTextFont(4); 
    int dateW = tft.textWidth(g_dateStr, 4); // Mesure de la largeur du texte (Font 4)
    int bubbleW = dateW + 40; // Ajustement pour une bordure réduite (près du texte)
    int bubbleH = 36; // Hauteur adaptée à la Font 4
    int bpx = -10; 
    int bpy = 118;

    // Dessin de la bordure extérieure noire (2px)
    tft.fillRoundRect(bpx, bpy, bubbleW, bubbleH, 18, TFT_BLACK); 
    // Dessin du fond blanc à l'intérieur
    tft.fillRoundRect(bpx + 2, bpy + 2, bubbleW - 4, bubbleH - 4, 16, TFT_WHITE); 

    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(ML_DATUM); 
    tft.drawString(g_dateStr, 20, bpy + (bubbleH / 2) + 2, 4); // Police 4 (Bolde/Grands caractères)
    
    // Welcome Text
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("WELCOME", 160, 240, 4); 
    
    // Boutons de Menu
    int btnY = 310;
    int btnW = 85, btnH = 125;
    
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

void drawScannerIcon(int x, int y, uint16_t color) {
    tft.drawRoundRect(x, y, 40, 40, 5, color);
    tft.drawRoundRect(x+1, y+1, 38, 38, 4, color);
    tft.fillRect(x - 5, y + 18, 50, 4, TFT_RED);
    tft.fillRect(x + 8, y + 8, 4, 8, color);
    tft.fillRect(x + 16, y + 8, 2, 8, color);
    tft.fillRect(x + 22, y + 8, 6, 8, color);
    tft.fillRect(x + 32, y + 8, 2, 8, color);
    tft.fillRect(x + 8, y + 24, 4, 8, color);
    tft.fillRect(x + 16, y + 24, 2, 8, color);
    tft.fillRect(x + 22, y + 24, 6, 8, color);
    tft.fillRect(x + 32, y + 24, 2, 8, color);
}

void drawCalculIcon(int x, int y, uint16_t color) {
    tft.drawRoundRect(x, y, 36, 44, 4, color);
    tft.drawRoundRect(x+1, y+1, 34, 42, 3, color);
    tft.drawRect(x + 5, y + 5, 26, 10, color);
    for(int r = 0; r < 3; r++) {
        for(int c = 0; c < 3; c++) {
            tft.fillRect(x + 5 + c*10, y + 18 + r*8, 6, 5, color);
        }
    }
}

void drawRefundIcon(int x, int y, uint16_t color) {
    int cx = x + 20, cy = y + 20;
    tft.drawCircle(cx, cy, 18, color);
    tft.drawCircle(cx, cy, 17, color);
    tft.fillRect(cx - 6, cy - 2, 16, 4, color);
    tft.fillTriangle(cx - 6, cy - 8, cx - 14, cy, cx - 6, cy + 8, color);
}

void drawArchivesIcon(int x, int y, uint16_t color) {
    tft.drawRoundRect(x, y + 8, 40, 28, 4, color);
    tft.drawRoundRect(x + 1, y + 9, 38, 26, 3, color);
    tft.fillRoundRect(x - 2, y + 4, 44, 8, 2, color);
    tft.fillRect(x + 16, y + 16, 8, 10, color);
}

// --- Icons pour SETTINGS ---
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

void drawCalibrateIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawCircle(cx, cy, 18, color);
    tft.drawCircle(cx, cy, 8, color);
    tft.fillCircle(cx, cy, 4, color);
    tft.drawLine(cx - 22, cy, cx + 22, cy, color);
    tft.drawLine(cx, cy - 22, cx, cy + 22, color);
}

void drawSecurityIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawRoundRect(cx-10, cy-5, 20, 18, 2, color);
    tft.drawCircle(cx, cy-8, 8, color);
    tft.drawCircle(cx, cy-8, 7, color);
    tft.fillRect(cx-12, cy-8, 24, 6, COLOR_NAVY);
    tft.fillCircle(cx, cy+4, 3, color);
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

void drawAboutIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawCircle(cx, cy, 18, color);
    tft.drawCircle(cx, cy, 17, color);
    tft.fillRect(cx-2, cy-8, 4, 16, color);
    tft.fillCircle(cx, cy-12, 3, color);
}

void drawPenIcon(int x, int y, uint16_t color) {
    // Petit stylo incliné
    tft.drawLine(x + 5, y + 25, x + 25, y + 5, color);
    tft.drawLine(x + 6, y + 26, x + 26, y + 6, color);
    tft.fillTriangle(x + 5, y + 25, x + 8, y + 23, x + 3, y + 28, color);
}

// --- Page SETTINGS MENU (3) ---
void drawSettingsScreen() {
    tft.fillScreen(TFT_WHITE); 
    updateHeader();
    drawBackArrow(10, 65, COLOR_NAVY); 
    
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("SETTINGS MENU", 160, 180, 4); 

    int w = 125, h = 80;
    int col1 = 25, col2 = 170;
    int row1 = 215, row2 = 305, row3 = 395;
    
    // Row 1
    tft.drawRoundRect(col1, row1, w, h, 15, COLOR_GLOW);
    drawWiFiSettingIcon(col1, row1 + 5, TFT_WHITE);
    tft.drawString("Connectivity", col1 + 62, row1 + 65, 2);

    tft.drawRoundRect(col2, row1, w, h, 15, COLOR_GLOW);
    drawDisplayIcon(col2, row1 + 5, TFT_WHITE);
    tft.drawString("Display", col2 + 62, row1 + 65, 2);

    // Row 2
    tft.drawRoundRect(col1, row2, w, h, 15, COLOR_GLOW);
    drawSecurityIcon(col1, row2 + 5, TFT_WHITE);
    tft.drawString("Security", col1 + 62, row2 + 65, 2);

    tft.drawRoundRect(col2, row2, w, h, 15, COLOR_GLOW);
    drawSystemIcon(col2, row2 + 5, TFT_WHITE);
    tft.drawString("System", col2 + 62, row2 + 65, 2);

    // Row 3
    tft.drawRoundRect(col1, row3, w, h, 15, COLOR_GLOW);
    drawSaleSettingsIcon(col1, row3 + 5, TFT_WHITE);
    tft.drawString("Sale Opts", col1 + 62, row3 + 65, 2);

    tft.drawRoundRect(col2, row3, w, h, 15, COLOR_GLOW);
    drawAboutIcon(col2, row3 + 5, TFT_WHITE);
    tft.drawString("About", col2 + 62, row3 + 65, 2);
}

// --- Page PROFILE (4) ---
void drawProfileScreen() {
    tft.fillScreen(TFT_WHITE); 
    updateHeader();
    drawBackArrow(10, 65, COLOR_NAVY); 
    
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("PROFILE", 160, 165, 4); // SHIFTED UP
    
    // Avatar plus discret
    drawProfilIcon(117, 160, TFT_WHITE); // SHIFTED FURTHER UP

    // Informations (Plus serrées verticalement pour faire de la place)
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY);
    tft.drawString("Terminal ID", 160, 245, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);
    tft.drawString("04040023", 160, 270, 2);

    tft.setTextColor(COLOR_GLOW, COLOR_NAVY);
    tft.drawString("POS Name", 160, 305, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);
    tft.drawString(g_posName, 160, 330, 2);

    tft.setTextColor(COLOR_GLOW, COLOR_NAVY);
    tft.drawString("Role / Grade", 160, 365, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);
    tft.drawString(g_roleGrade, 160, 390, 2);

    // Nouveau Bouton Edit avec Icône et texte au milieu
    int editX = 160, editY = 430;
    tft.fillCircle(editX, editY, 20, COLOR_GLOW);
    drawPenIcon(editX - 15, editY - 15, TFT_WHITE); // Centrer le stylo dans le cercle
    
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("Edit", editX, editY + 32, 2); 
}

// --- Page SALE ---
void drawSaleScreen() {
    tft.fillScreen(TFT_WHITE); 
    updateHeader();
    drawBackArrow(10, 65, COLOR_NAVY); 
    
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("SALE MENU", 160, 180, 4); 

    int w = 125, h = 90;
    int col1 = 25, col2 = 170;
    int row1 = 230, row2 = 340;
    
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);

    // Bouton 1: Scanner (Haut Gauche)
    tft.drawRoundRect(col1, row1, w, h, 15, COLOR_GLOW); 
    drawScannerIcon(col1 + 42, row1 + 15, TFT_WHITE);
    tft.drawString("Scanner", col1 + 62, row1 + 75, 2);

    // Bouton 2: Calcul (Haut Droit)
    tft.drawRoundRect(col2, row1, w, h, 15, COLOR_GLOW); 
    drawCalculIcon(col2 + 44, row1 + 12, TFT_WHITE);
    tft.drawString("Calcul", col2 + 62, row1 + 75, 2);

    // Bouton 3: Refund (Bas Gauche)
    tft.drawRoundRect(col1, row2, w, h, 15, COLOR_GLOW); 
    drawRefundIcon(col1 + 42, row2 + 15, TFT_WHITE);
    tft.drawString("Refund", col1 + 62, row2 + 75, 2);

    // Bouton 4: Archives (Bas Droit)
    tft.drawRoundRect(col2, row2, w, h, 15, COLOR_GLOW); 
    drawArchivesIcon(col2 + 42, row2 + 15, TFT_WHITE);
    tft.drawString("Archives", col2 + 62, row2 + 75, 2);
}

// --- Fonctions de mise à jour via Bridge (RPC) ---
void update_status_cb(String t, String d, String w, String b) {
    g_timeStr = t;
    g_dateStr = d;
    g_wifiStr = w;
    g_battStr = b;
}

void setup() {
    Serial.begin(115200);
    delay(500);
    
    // 1. Initialiser le Bridge IMMÉDIATEMENT (prévenir timeout RPC)
    Bridge.begin();
    Bridge.provide("update_status", update_status_cb);
    
    // 2. Initialiser l'écran
    tft.init();
    tft.setRotation(0);
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("Hardware Initializing...", 160, 160, 2);
    delay(500);
    
    // 3. Calibration (Bloquant)
    touch_calibrate();

    // On s'assure que firstDraw est prêt pour la loop
    firstDraw = true;
}

void loop() {
    // 1. Priorité à la communication
    Bridge.update();

    uint16_t x = 0, y = 0;

    // Redessiner intelligemment
    static String lastT = "";
    static int lastPage = -1;

    if (currentPage > 0) {
        if (lastPage != currentPage) {
            lastPage = currentPage;
            if (currentPage == 1) drawWelcomeScreen();
            else if (currentPage == 2) drawSaleScreen();
            else if (currentPage == 3) drawSettingsScreen();
            else if (currentPage == 4) drawProfileScreen();
            else if (currentPage == 5) drawEditPrompt();
        }
        if (g_timeStr != lastT) {
            lastT = g_timeStr;
            updateHeader(); // Rafraîchit CHAPEAU SEULEMENT
        }
    } else {
        // Page LOGIN (0) : Premier dessin ou retour
        if (firstDraw || lastPage != 0) {
            firstDraw = false;
            lastPage = 0;
            drawMainUI();
        }
    }

    if (tft.getTouch(&x, &y)) {
        if (currentPage == 0) {
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
                    currentPage = 1; // Passage à Welcome
                } else {
                    enteredPin = "";
                    drawPinBoxes();
                    delay(200);
                }
            }
        } 
        else if (currentPage == 1) { // PAGE WELCOME
            // Bouton Back "<" (Top gauche)
            if (x < 80 && y < 130) {
                currentPage = 0;
                enteredPin = "";
                drawMainUI();
                delay(200);
            }
            // Boutons Menu (Navy Area - Glowing Pill Buttons)
            if (y > 300) {
                if (x >= 20 && x <= 105) { 
                    currentPage = 3; // Aller à la page Settings
                    delay(200);
                }
                if (x >= 117 && x <= 202) { 
                    currentPage = 2; // Aller à la page Sale
                    delay(200);
                }
                if (x >= 215 && x <= 300) { 
                    currentPage = 4; // Aller à la page Profile 
                    delay(200);
                }
            }
        }
        else if (currentPage == 2) { // PAGE SALE
            // Bouton Back "<" de la page Sale -> Retour Welcome
            if (x < 80 && y < 130) {
                currentPage = 1; // Retour Welcome
                delay(200);
            }
            // Boutons de la page Sale
            if (y >= 230 && y <= 320) {
                if (x >= 25 && x <= 150) { /* Action Scanner */ delay(200); }
                else if (x >= 170 && x <= 295) { /* Action Calcul */ delay(200); }
            }
            else if (y >= 340 && y <= 430) {
                if (x >= 25 && x <= 150) { /* Action Refund */ delay(200); }
                else if (x >= 170 && x <= 295) { /* Action Archives */ delay(200); }
            }
        }
        else if (currentPage == 3) { // PAGE SETTINGS MAIN
            // Bouton Back "<" -> Retour Welcome
            if (x < 80 && y < 130) {
                currentPage = 1; 
                delay(200);
            }
            // Boutons de la page Settings (6 catégories)
            if (y >= 215 && y <= 300) { // Row 1
                if (x >= 25 && x <= 150) { /* Connectivity */ delay(200); }
                else if (x >= 170 && x <= 295) { /* Display */ delay(200); }
            }
            else if (y >= 305 && y <= 390) { // Row 2
                if (x >= 25 && x <= 150) { /* Security */ delay(200); }
                else if (x >= 170 && x <= 295) { // System
                    /* System Action (Info, Sounds, etc.) */
                    delay(200);
                }
            }
            else if (y >= 395 && y <= 480) { // Row 3
                if (x >= 25 && x <= 150) { /* Sale Opts */ delay(200); }
                else if (x >= 170 && x <= 295) { /* About (No interaction) */ }
            }
        }
        else if (currentPage == 4) { // PAGE PROFILE
            // Bouton Back "<" -> Retour Welcome
            if (x < 80 && y < 130) {
                currentPage = 1; 
                delay(200);
            }
            // Bouton Edit (Circle area + Text)
            if (x >= 120 && x <= 200 && y >= 400 && y <= 475) {
                currentPage = 5; // Afficher le prompt alerte
                delay(200);
            }
        }
        else if (currentPage == 5) { // PROMPT ALERTE EDIT
            if (!showKeyboard) {
                // Détection clics sur les champs de saisie (by = 140)
                int bx = 30, by = 140;
                // Champ POS Name (y: 175-203)
                if (x >= (bx + 20) && x <= (bx + 240) && y >= (by + 35) && y <= (by + 63)) {
                    editField = 0; editBuffer = g_posName; showKeyboard = true; drawEditPrompt(); delay(200);
                }
                // Champ Role / Grade (y: 227-255)
                else if (x >= (bx + 20) && x <= (bx + 240) && y >= (by + 87) && y <= (by + 115)) {
                    editField = 1; editBuffer = g_roleGrade; showKeyboard = true; drawEditPrompt(); delay(200);
                }
                // Bouton Cancel → retour Profile
                else if (x >= 45 && x <= 152 && y >= 292 && y <= 330) {
                    currentPage = 4; delay(200);
                }
                // Bouton OK → retour Profile
                else if (x >= 167 && x <= 274 && y >= 292 && y <= 330) {
                    currentPage = 4; delay(200);
                }
            } else {
                // LOGIQUE CLAVIER TACTILE (kbY = 280)
                int kbY = 280;
                if (y >= kbY && y < kbY + 168) {
                    int r = (y - kbY) / 42;
                    const char* row = kbRows[r]; int len = strlen(row);
                    int c = x / (320 / len);
                    if (editBuffer.length() < 24) editBuffer += row[c >= len ? len - 1 : c];
                    drawEditPrompt(); delay(150);
                } else if (y >= kbY + 168 && y <= kbY + 210) {
                    // Derniere ligne: SPACE / DEL / OK
                    if (x < 134) { if (editBuffer.length() < 24) editBuffer += ' '; }
                    else if (x < 220) { if (editBuffer.length() > 0) editBuffer.remove(editBuffer.length() - 1); }
                    else { 
                        // OK Clavier -> Save dans variable et masquer
                        if (editField == 0) g_posName = editBuffer;
                        else if (editField == 1) g_roleGrade = editBuffer;
                        showKeyboard = false; 
                    }
                    drawEditPrompt(); delay(200);
                }
            }
        }
    }
}