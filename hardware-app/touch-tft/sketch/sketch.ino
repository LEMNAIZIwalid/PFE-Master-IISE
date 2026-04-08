#include "TFT_eSPI.h"           
#include "Arduino_RouterBridge.h"

TFT_eSPI tft = TFT_eSPI();

String enteredPin = "";
int currentPage = 0; // 0:LOGIN, 1:WELCOME, 2:SALE, 3:SETTINGS, 4:PROFILE, 6:ABOUT, 7:WIFI, 9:DISPLAY, 10:SECURITY, 11:SYSTEM, 12:SALE_OPTS, 13:MANUAL_CONF, 14:SCAN, 15:REFUND, 16:HISTORY
const String correctPin = "7687";

// --- Données Bridge ---
String g_timeStr = "09:41";
String g_dateStr = "mercredi : 1/4/2026";
String g_wifiStr = "Connected";
String g_battStr = "84%";
String g_posName = "Izinm_POS";
bool   firstDraw = true;

// --- Couleurs ---
#define COLOR_BLUE    0x2477
#define COLOR_NAVY    0x018C
#define COLOR_GLOW    0x05FF
#define COLOR_GREY_NK 0xD6BA
#define COLOR_GREY_LT 0xDEFB

// --- Fonctions de Dessin Communes ---
// --- Fonctions de Dessin Communes ---
void drawBackArrow(int x, int y, uint16_t color) {
    int ax = x + 15, ay = y + 10;
    for (int i = 0; i < 2; i++) { 
        tft.drawLine(ax + 15, ay + i, ax + i, ay + 15 + i, color); 
        tft.drawLine(ax + i, ay + 15 + i, ax + 15, ay + 30 + i, color); 
        tft.drawLine(ax + i, ay + 15 + i, ax + 35 + i, ay + 15 + i, color); 
    }
}

// --- Support ---
void touch_calibrate() {
    uint16_t calData[5]; tft.fillScreen(TFT_BLACK); tft.setCursor(20, 0); tft.setTextFont(2); tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.println("Calibration..."); tft.calibrateTouch(calData, TFT_MAGENTA, TFT_BLACK, 15); tft.setTouch(calData);
}
void drawPinBoxes() {
    for (int i = 0; i < 4; i++) { int x = 25 + (i * 75), y = 110; tft.drawRoundRect(x, y, 60, 70, 8, COLOR_GREY_NK); tft.fillRect(x + 1, y + 1, 58, 68, TFT_WHITE); if (i < (int)enteredPin.length()) { tft.setTextColor(TFT_BLACK); tft.setTextDatum(MC_DATUM); tft.drawString(String(enteredPin[i]), x + 30, y + 35, 2); } }
}
void drawKeypad() {
    tft.setTextDatum(MC_DATUM); tft.setTextColor(TFT_BLACK); const char keys[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}};
    for (int r = 0; r < 4; r++) { for (int c = 0; c < 3; c++) { int x = c * 106, y = 280 + (r * 50); tft.drawRect(x, y, 106, 50, COLOR_GREY_LT); if (keys[r][c] != ' ') tft.drawString(String(keys[r][c]), x + 53, y + 25, 2); } }
}
void updateHeader() {
    tft.fillRect(0, 0, 320, 45, TFT_WHITE); tft.setTextColor(COLOR_NAVY); tft.setTextDatum(TL_DATUM); tft.drawString(g_timeStr, 15, 12, 2);
    int bx = 280, by = 13; tft.drawRoundRect(bx, by, 25, 13, 3, COLOR_NAVY); 
    int fillW = map(g_battStr.toInt(), 0, 100, 0, 19); if (fillW > 19) fillW = 19;
    tft.fillRect(bx + 3, by + 3, fillW, 7, TFT_GREEN);
    tft.setTextDatum(TR_DATUM); tft.drawString(g_battStr, bx - 6, 12, 2); 
    // Small minimalist wifi dot
    tft.fillCircle(bx - 40, 20, 3, COLOR_NAVY);
}
void drawGenericSubPage(String title, bool hasBack) {
    tft.fillScreen(COLOR_NAVY); updateHeader(); if (hasBack) drawBackArrow(10, 65, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString(title, 160, 240, 4);
}

// --- Écrans ---
void drawMainUI() {
    tft.fillScreen(TFT_WHITE); tft.setTextColor(TFT_BLACK), tft.setTextDatum(TC_DATUM); tft.drawString(F("Verify Number"), 160, 40, 2); drawPinBoxes();
    tft.fillRoundRect(40, 210, 240, 50, 25, COLOR_BLUE); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString(F("Verify now"), 160, 235, 4); drawKeypad();
}
void drawWelcomeScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString(F("WELCOME"), 160, 180, 4);
    int btnY = 300, btnW = 92, btnH = 80; 
    tft.drawRoundRect(10, btnY, btnW, btnH, 15, COLOR_GLOW); tft.drawString(F("Settings"), 56, btnY + 40, 4);
    tft.drawRoundRect(114, btnY, btnW, btnH, 15, COLOR_GLOW); tft.drawString(F("Sale"), 160, btnY + 40, 4); 
    tft.drawRoundRect(218, btnY, btnW, btnH, 15, COLOR_GLOW); tft.drawString(F("Profile"), 264, btnY + 40, 4);
}
void drawSaleScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString(F("SALE MENU"), 160, 180, 4);
    int w = 130, h = 90; 
    tft.drawRoundRect(20, 230, w, h, 15, COLOR_GLOW); tft.drawString(F("Scan"), 85, 275, 4);
    tft.drawRoundRect(170, 230, w, h, 15, COLOR_GLOW); tft.drawString(F("Manual"), 235, 275, 4);
    tft.drawRoundRect(20, 340, w, h, 15, COLOR_GLOW); tft.drawString(F("Refund"), 85, 385, 4);
    tft.drawRoundRect(170, 340, w, h, 15, COLOR_GLOW); tft.drawString(F("History"), 235, 385, 4);
}
void drawSettingsScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString(F("SETTINGS"), 160, 175, 4);
    int w = 135, h = 80; 
    tft.drawRoundRect(15, 200, w, h, 15, COLOR_GLOW); tft.drawString(F("Network"), 82, 240, 4);
    tft.drawRoundRect(170, 200, w, h, 15, COLOR_GLOW); tft.drawString(F("Display"), 237, 240, 4);
    tft.drawRoundRect(15, 295, w, h, 15, COLOR_GLOW); tft.drawString(F("Security"), 82, 335, 4);
    tft.drawRoundRect(170, 295, w, h, 15, COLOR_GLOW); tft.drawString(F("System"), 237, 335, 4);
    tft.drawRoundRect(15, 390, w, h, 15, COLOR_GLOW); tft.drawString(F("Sale Opts"), 82, 430, 4);
    tft.drawRoundRect(170, 390, w, h, 15, COLOR_GLOW); tft.drawString(F("About"), 237, 430, 4);
}
void drawProfileScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); 
    tft.drawString(F("PROFILE"), 160, 165, 4);
    
    int startY = 220; tft.setTextDatum(TL_DATUM);
    // Terminal ID
    tft.setTextColor(COLOR_GLOW); tft.drawString(F("Terminal ID"), 35, startY, 4); 
    tft.setTextColor(TFT_WHITE);  tft.drawString(F("04040023"), 35, startY + 25, 2);
    // POS Name
    tft.setTextColor(COLOR_GLOW); tft.drawString(F("POS Name"), 35, startY + 70, 4); 
    tft.setTextColor(TFT_WHITE);  tft.drawString(g_posName, 35, startY + 95, 2);
    // Role / Grade
    tft.setTextColor(COLOR_GLOW); tft.drawString(F("Role / Grade"), 35, startY + 140, 4); 
    tft.setTextColor(TFT_WHITE);  tft.drawString(F("Market merchant"), 35, startY + 165, 2);
}

// --- Setup & Loop ---
void update_status_cb(String t, String d, String w, String b) { g_timeStr = t; g_dateStr = d; g_wifiStr = w; g_battStr = b; }
void setup() {
    Serial.begin(115200); delay(500); Bridge.begin(); Bridge.provide("update_status", update_status_cb);
    tft.init(); tft.setRotation(0); tft.fillScreen(TFT_BLACK); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("INIT...", 160, 240, 4); delay(500); touch_calibrate(); firstDraw = true;
}
void loop() {
    uint16_t tx = 0, ty = 0; static int lastPage = -1;
    if (lastPage != currentPage) {
        lastPage = currentPage;
        switch(currentPage) {
            case 0: drawMainUI(); break; case 1: drawWelcomeScreen(); break; case 2: drawSaleScreen(); break; case 3: drawSettingsScreen(); break; case 4: drawProfileScreen(); break;
            case 6: drawGenericSubPage(F("About izinm"), true); break;  case 7: drawGenericSubPage(F("wifi_POS"), true); break; case 9: drawGenericSubPage(F("DISPLAY_POS"), true); break;
            case 10: drawGenericSubPage(F("Security_POS"), true); break; case 11: drawGenericSubPage(F("System_POS"), true); break; case 12: drawGenericSubPage(F("Opts_POS"), true); break;
            case 13: drawGenericSubPage(F("Manul_conf"), true); break; case 14: drawGenericSubPage(F("POS_SCAN"), true); break;
            case 15: drawGenericSubPage(F("REFUND_POS"), true); break; case 16: drawGenericSubPage(F("HISTORY_POS"), true); break;
        }
    }
    if (tft.getTouch(&tx, &ty)) {
        if (currentPage == 0) {
            if (ty >= 280) { int col = tx/106, row = (ty-280)/50; char k[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}}; char key = k[row][col]; if (key>='0' && key<='9') { if(enteredPin.length()<4) { enteredPin+=key; drawPinBoxes(); } } else if(key=='<') { if(enteredPin.length()>0) { enteredPin.remove(enteredPin.length()-1); drawPinBoxes(); } } delay(200); }
            else if (ty>=210 && ty<=260 && tx>=40 && tx<=280) { if (enteredPin == correctPin) currentPage = 1; else { enteredPin = ""; drawPinBoxes(); } delay(200); }
        } else if (currentPage == 1) {
            if (tx < 100 && ty < 150) { currentPage = 0; enteredPin = ""; } else if (ty > 300) { if (tx < 110) currentPage = 3; else if (tx < 210) currentPage = 2; else currentPage = 4; } delay(200);
        } else if (currentPage == 2) { 
            if (tx < 100 && ty < 150) currentPage = 1; 
            else if (tx >= 170 && ty >= 230 && ty <= 320) currentPage = 13;
            else if (tx <= 150 && ty >= 230 && ty <= 320) currentPage = 14;
            else if (tx <= 150 && ty >= 340 && ty <= 430) currentPage = 15;
            else if (tx >= 170 && ty >= 340 && ty <= 430) currentPage = 16;
            delay(200); 
        } else if (currentPage == 4) { if (tx < 100 && ty < 150) currentPage = 1; delay(200); }
        else if (currentPage == 3) { if (tx < 100 && ty < 150) currentPage = 1; else if (tx >= 170 && ty >= 390) currentPage = 6; else if (tx <= 150 && ty >= 200 && ty <= 280) currentPage = 7; else if (tx >= 170 && ty >= 200 && ty <= 280) currentPage = 9; else if (tx <= 150 && ty >= 295 && ty <= 375) currentPage = 10; else if (tx >= 170 && ty >= 295 && ty <= 375) currentPage = 11; else if (tx <= 150 && ty >= 390 && ty <= 470) currentPage = 12; delay(200); }
        else if (currentPage >= 13 && currentPage <= 16) { if (tx < 100 && ty < 150) currentPage = 2; delay(200); }
        else if (currentPage >= 6) { if (tx < 100 && ty < 150) currentPage = 3; delay(200); }
    }
    Bridge.update(); delay(5);
}