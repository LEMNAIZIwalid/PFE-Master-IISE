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
#define COLOR_NAVY    0x018C // Bleu Marine profond (Image)
#define COLOR_GLOW    0x05FF // Cyan/Bleu Lumineux
#define COLOR_GREY_LT 0xDEFB // Gris très clair
#define COLOR_GREY_NK 0xD6BA // Gris navigation
#define COLOR_BG      TFT_WHITE // Fond blanc
#define COLOR_ACCENT  COLOR_BLUE

// --- Dessins d'Icônes Simples ---
void drawWiFiIcon(int x, int y, uint16_t color) {
    // ---- REGLES D'EMPLACEMENT (WIFI / SIGNAL) ----
    // x, y : position du coin supérieur gauche de la zone de l'icône
    
    if (g_wifiStr != "Connected") {
        tft.setTextColor(color); 
        tft.setTextDatum(MC_DATUM); // MC_DATUM = Milieu Centre
        // Offset de +10 en X et +10 en Y pour centrer le 'E' dans la zone
        tft.drawString("E", x + 10, y + 8, 4); 
        return;
    }
    
    // Icône Réseau Cellulaire (4 barres verticales comme sur l'image)
    // Barre 1 (la plus petite à gauche)
    // tft.fillRect(x_position, y_position, largeur, hauteur, couleur)
    tft.fillRect(x, y + 12, 3, 4, color);      // x=0, y=12 (bas=16)
    
    // Barre 2
    tft.fillRect(x + 5, y + 8, 3, 8, color);   // x=5, y=8
    
    // Barre 3
    tft.fillRect(x + 10, y + 4, 3, 12, color); // x=10, y=4
    
    // Barre 4 (la plus grande à droite)
    tft.fillRect(x + 15, y, 3, 16, color);     // x=15, y=0 (pleine hauteur=16px)
}

void drawSaleIcon(int x, int y, uint16_t color) {
    // Bouton Sale - Chariot Plus Gras et Centré
    int ox = x + 25, oy = y + 40;
    for (int i = 0; i < 2; i++) { // Double épaisseur
        tft.drawRect(ox + 5 + i, oy + 5 + i, 20, 15, color); 
        tft.drawLine(ox + i, oy + i, ox + 5 + i, oy + 5 + i, color); 
        tft.drawCircle(ox + 8 + i, oy + 23 + i, 2, color); 
        tft.drawCircle(ox + 22 + i, oy + 23 + i, 2, color); 
        // Flèche montante (Blanche)
        tft.drawLine(ox + 15 + i, oy + 12, ox + 15 + i, oy + 2, 0xFFFF);
        tft.drawLine(ox + 12 + i, oy + 5, ox + 15 + i, oy + 2, 0xFFFF);
        tft.drawLine(ox + 18 + i, oy + 5, ox + 15 + i, oy + 2, 0xFFFF);
    }
}

void drawSettingsIcon(int x, int y, uint16_t color) {
    // Bouton Settings - Rouage Plus Gras et Centré
    int cx = x + 42, cy = y + 55;
    for (int i = 0; i < 2; i++) {
        tft.drawCircle(cx + i, cy + i, 12, color);
        tft.drawCircle(cx + i, cy + i, 4, color);
        for (int j = 0; j < 8; j++) {
            float angle = j * 45 * PI / 180;
            tft.drawLine(cx + cos(angle)*12 + i, cy + sin(angle)*12 + i, cx + cos(angle)*17 + i, cy + sin(angle)*17 + i, color);
        }
    }
}

void drawProfilIcon(int x, int y, uint16_t color) {
    // Bouton Profil - Utilisateur Plus Gras et Centré
    int cx = x + 42, cy = y + 50;
    for (int i = 0; i < 2; i++) {
        tft.drawCircle(cx + i, (cy - 5) + i, 8, color); // Tête
        tft.drawSmoothArc(cx + i, (cy + 14) + i, 16, 12, 230, 310, color, COLOR_NAVY); // Épaules
    }
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

    // Redessiner intelligemment
    static String lastT = "";
    static bool wasAuth = false;

    if (authenticated) {
        if (!wasAuth) {
            wasAuth = true;
            drawWelcomeScreen(); // Plein dessin au premier accès
        }
        if (g_timeStr != lastT) {
            lastT = g_timeStr;
            updateHeader(); // Rafraîchit CHAPEAU SEULEMENT (évite le scintillement)
        }
    } else {
        wasAuth = false;
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
            // Logique Page Welcome (Nouveaux Boutons)
            // Bouton Back "<" (Top gauche)
            if (x < 80 && y < 130) {
                authenticated = false;
                enteredPin = "";
                drawMainUI();
                delay(200);
            }
            // Boutons Menu (Navy Area - Glowing Pill Buttons)
            if (y > 300) {
                if (x >= 20 && x <= 105) { /* Action Settings */ }
                if (x >= 117 && x <= 202) { /* Action Sale */ }
                if (x >= 215 && x <= 300) { /* Action Profile */ }
            }
        }
    }
    
    // Bridge.update() à la fin comme dans le code original fonctionnel
    Bridge.update();
}

