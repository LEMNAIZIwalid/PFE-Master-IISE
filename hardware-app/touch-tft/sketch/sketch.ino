#include "TFT_eSPI.h"           
#include "Arduino_RouterBridge.h"

TFT_eSPI tft = TFT_eSPI();

String enteredPin = "";
bool authenticated = false;
const String correctPin = "7687";

// --- Couleurs Thème Mobile ---
#define COLOR_BLUE    0x3B7F // Bleu premium
#define COLOR_GREY_LT 0xDEFB // Gris très clair
#define COLOR_GREY_DK 0x7BEF // Gris moyen

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
        // Dessiner le contour de la case
        tft.drawRoundRect(x, y, 60, 70, 8, COLOR_GREY_DK);
        tft.fillRect(x+1, y+1, 58, 68, TFT_WHITE); // Fond blanc
        
        // Si un chiffre est entré pour cette case
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
        {' ', '0', '<'} // < pour Backspace
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
    
    // Titres
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(TC_DATUM);
    tft.drawString("Verify your Mobile Number", 160, 40, 2);
    tft.setTextColor(COLOR_GREY_DK);
    tft.drawString("Confirm your 4-digit PIN", 160, 70, 2);
    
    // Cases PIN
    drawPinBoxes();
    
    // Bouton Verify Now
    tft.fillRoundRect(40, 210, 240, 50, 25, COLOR_BLUE);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("Verify now", 160, 235, 4);
    
    // Clavier
    drawKeypad();
}

// --- Page Succès ---
void drawWelcomeScreen() {
    tft.fillScreen(COLOR_BLUE);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("Welcome", 160, 240, 4);
}

void setup() {
    tft.init();
    tft.setRotation(0); // Vertical
    
    touch_calibrate();
    drawMainUI();

    Bridge.begin();
}

void loop() {
    uint16_t x = 0, y = 0;

    if (tft.getTouch(&x, &y)) {
        
        // --- Clic sur le Clavier ---
        if (y >= 280 && y <= 480 && !authenticated) {
            int col = x / 106;
            int row = (y - 280) / 50;
            if (col > 2) col = 2;
            if (row > 3) row = 3;

            const char keys[4][3] = {
                {'1', '2', '3'},
                {'4', '5', '6'},
                {'7', '8', '9'},
                {' ', '0', '<'}
            };

            char key = keys[row][col];
            if (key >= '0' && key <= '9') {
                if (enteredPin.length() < 4) {
                    enteredPin += key;
                    drawPinBoxes();
                }
            } else if (key == '<') {
                if (enteredPin.length() > 0) {
                    enteredPin.remove(enteredPin.length() - 1);
                    drawPinBoxes();
                }
            }
            delay(200); // Debounce
        }
        
        // --- Clic sur Verify Now ---
        else if (y >= 210 && y <= 260 && x >= 40 && x <= 280 && !authenticated) {
            if (enteredPin == correctPin) {
                authenticated = true;
                drawWelcomeScreen();
                // Bridge.put non supporté dans cette version du Bridge
            } else {
                // Erreur : Flasher les cases en rouge (optionnel)
                enteredPin = "";
                drawPinBoxes();
                delay(200);
            }
        }
    }
    
    Bridge.update();
}