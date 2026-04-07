#include "TFT_eSPI.h"           
#include "Arduino_RouterBridge.h"

TFT_eSPI tft = TFT_eSPI();

String enteredPin = "";
int currentPage = 0; // 0:LOGIN, 1:WELCOME, 2:SALE, 3:SETTINGS, 4:PROFILE, 6:ABOUT, 7:WIFI, 9:DISPLAY, 10:SECURITY, 11:SYSTEM, 12:SALE_OPTS, 13:MANUAL_CONF
const String correctPin = "7687";

// --- Données Bridge ---
String g_timeStr = "09:41";
String g_dateStr = "mercredi : 1/4/2026";
String g_wifiStr = "Connected";
String g_battStr = "84%";
String g_posName = "Izinm_POS";
String g_roleGrade = "Market merchant";
bool   firstDraw = true;

// --- Couleurs ---
#define COLOR_BLUE    0x2477
#define COLOR_NAVY    0x018C
#define COLOR_GLOW    0x05FF
#define COLOR_GREY_NK 0xD6BA
#define COLOR_GREY_LT 0xDEFB

// --- 1. Icônes ---
void drawWiFiIcon(int x, int y, uint16_t color) {
    int cx = x + 9, cy = y + 15; tft.fillCircle(cx, cy, 2, color); tft.drawCircle(cx, cy, 6, color); tft.drawCircle(cx, cy, 12, color);
    tft.fillRect(x - 5, y + 16, 30, 10, TFT_WHITE); tft.fillTriangle(cx, cy, x - 10, y - 10, x + 30, y - 10, TFT_WHITE);
}
void drawBackArrow(int x, int y, uint16_t color) {
    int ax = x + 15, ay = y + 10;
    for (int i = 0; i < 2; i++) { tft.drawLine(ax + 15, ay + i, ax + i, ay + 15 + i, color); tft.drawLine(ax + i, ay + 15 + i, ax + 15, ay + 30 + i, color); tft.drawLine(ax+i, ay+15+i, ax+35+i, ay+15+i, color); }
}
void drawWiFiSettingIcon(int cx, int cy, uint16_t color) {
    tft.fillCircle(cx, cy + 12, 3, color); for (int i = 0; i < 2; i++) { int r = 12 + (i * 8); tft.drawCircle(cx, cy + 12, r, color); tft.drawCircle(cx, cy + 12, r + 1, color); }
    tft.fillRect(cx - 25, cy + 13, 50, 25, COLOR_NAVY); tft.fillTriangle(cx, cy + 12, cx - 35, cy - 25, cx + 35, cy - 25, COLOR_NAVY);
}
void drawDisplayIcon(int cx, int cy, uint16_t color) { tft.drawRoundRect(cx - 15, cy - 10, 30, 22, 3, color); tft.fillRect(cx - 5, cy + 12, 10, 4, color); tft.fillRect(cx - 8, cy + 16, 16, 2, color); }
void drawSecurityIcon(int cx, int cy, uint16_t color) { tft.fillRoundRect(cx - 10, cy, 20, 16, 2, color); tft.drawCircle(cx, cy, 8, color); tft.drawCircle(cx, cy, 7, color); tft.fillRect(cx - 10, cy, 20, 4, color); }
void drawAboutIcon(int cx, int cy, uint16_t color) { tft.drawCircle(cx, cy, 18, color); tft.drawCircle(cx, cy, 17, color); tft.fillRect(cx - 2, cy - 4, 4, 12, color); tft.fillCircle(cx, cy - 9, 3, color); }
void drawSystemIcon(int cx, int cy, uint16_t color) { tft.drawCircle(cx, cy, 14, color); tft.drawCircle(cx, cy, 6, color); for (int i = 0; i < 8; i++) { float a = i * 45 * PI / 180; tft.fillCircle(cx + cos(a)*10, cy + sin(a)*10, 3, color); } }
void drawSaleSettingsIcon(int cx, int cy, uint16_t color) { tft.fillRoundRect(cx - 12, cy - 8, 24, 18, 3, color); tft.fillRect(cx - 4, cy + 10, 8, 6, color); tft.fillCircle(cx, cy + 1, 4, COLOR_NAVY); }
void drawProfilIcon(int x, int y, uint16_t color) { int cx = x + 42, cy = y + 45; tft.fillCircle(cx, cy - 8, 8, color); tft.fillRoundRect(cx - 14, cy + 4, 28, 14, 6, color); }
void drawSaleIcon(int x, int y, uint16_t color) { int cx = x+42, cy = y+50; for (int i=0; i<3; i++) tft.drawRoundRect(cx-10-i, cy-15-i, 20+i*2, 20+i*2, 8, color); tft.fillRoundRect(cx-17, cy-4, 34, 28, 4, color); }

// --- Icons Sale Menu ---
void drawScannerIcon(int x, int y, uint16_t color) {
    tft.fillRect(x + 5, y + 5, 4, 25, color); tft.fillRect(x + 12, y + 5, 2, 25, color);
    tft.fillRect(x + 17, y + 5, 6, 25, color); tft.fillRect(x + 26, y + 5, 3, 25, color);
    tft.fillRect(x, y + 16, 42, 2, TFT_RED);
}
void drawCalculIcon(int x, int y, uint16_t color) {
    tft.fillRoundRect(x + 8, y, 32, 38, 4, color); tft.fillRect(x + 12, y + 5, 24, 10, COLOR_NAVY);
}
void drawRefundIcon(int x, int y, uint16_t color) {
    tft.drawCircle(x + 20, y + 18, 16, color); tft.drawCircle(x + 20, y + 18, 17, color);
    tft.fillTriangle(x + 8, y + 18, x + 16, y + 10, x + 16, y + 26, color);
}
void drawArchivesIcon(int x, int y, uint16_t color) {
    tft.fillRoundRect(x + 5, y + 5, 40, 30, 3, color); tft.fillRect(x + 12, y + 14, 26, 3, COLOR_NAVY);
}

// --- 2. Support ---
void touch_calibrate() {
    uint16_t calData[5]; tft.fillScreen(TFT_BLACK); tft.setCursor(20, 0); tft.setTextFont(2); tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.println("Calibration..."); tft.calibrateTouch(calData, TFT_MAGENTA, TFT_BLACK, 15); tft.setTouch(calData);
}
void drawPinBoxes() {
    for (int i = 0; i < 4; i++) { int x = 25 + (i * 75), y = 110; tft.drawRoundRect(x, y, 60, 70, 8, COLOR_GREY_NK); tft.fillRect(x+1, y+1, 58, 68, TFT_WHITE); if (i < (int)enteredPin.length()) { tft.setTextColor(TFT_BLACK); tft.setTextDatum(MC_DATUM); tft.drawString(String(enteredPin[i]), x + 30, y + 35, 2); } }
}
void drawKeypad() {
    tft.setTextDatum(MC_DATUM); tft.setTextColor(TFT_BLACK); const char keys[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}};
    for (int r = 0; r < 4; r++) { for (int c = 0; c < 3; c++) { int x = c * 106, y = 280 + (r * 50); tft.drawRect(x, y, 106, 50, COLOR_GREY_LT); if (keys[r][c] != ' ') tft.drawString(String(keys[r][c]), x + 53, y + 25, 2); } }
}
void updateHeader() {
    tft.fillRect(0, 0, 320, 45, TFT_WHITE); tft.setTextColor(COLOR_NAVY); tft.setTextDatum(TL_DATUM); tft.drawString(g_timeStr, 15, 12, 2);
    int bx = 280, by = 13; tft.drawRoundRect(bx, by, 25, 13, 3, COLOR_NAVY); int fillW = map(g_battStr.toInt(), 0, 100, 0, 19); tft.fillRect(bx+3, by+3, fillW, 7, TFT_GREEN);
    tft.setTextDatum(TR_DATUM); tft.drawString(g_battStr, bx - 6, 12, 2); drawWiFiIcon(bx - 60, 11, COLOR_NAVY); 
}
void drawSettingsButton(int x, int y, int w, int h, const char* label, int type) {
    tft.drawRoundRect(x, y, w, h, 15, COLOR_GLOW); int cx = x + w / 2, cy = y + h / 2 - 10;
    if (type == 6) drawWiFiSettingIcon(cx, cy, TFT_WHITE); else if (type == 5) drawDisplayIcon(cx, cy, TFT_WHITE); else if (type == 8) drawSecurityIcon(cx, cy, TFT_WHITE); else if (type == 7) drawAboutIcon(cx, cy, TFT_WHITE); else if (type == 9) drawSystemIcon(cx, cy, TFT_WHITE); else if (type == 10) drawSaleSettingsIcon(cx, cy, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(BC_DATUM); tft.drawString(label, x + w / 2, y + h - 10, 2);
}
void drawSaleButton(int x, int y, int w, int h, const char* label, int type) {
    tft.drawRoundRect(x, y, w, h, 15, COLOR_GLOW); 
    int iconX = x + (w - 42) / 2, iconY = y + 15;
    if (type == 0) drawScannerIcon(iconX, iconY, TFT_WHITE);
    else if (type == 1) drawCalculIcon(iconX, iconY, TFT_WHITE);
    else if (type == 2) drawRefundIcon(iconX, iconY, TFT_WHITE);
    else if (type == 3) drawArchivesIcon(iconX, iconY, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(BC_DATUM); tft.drawString(label, x + w / 2, y + h - 10, 2);
}

// --- 3. Écrans ---
void drawMainUI() {
    tft.fillScreen(TFT_WHITE); tft.setTextColor(TFT_BLACK), tft.setTextDatum(TC_DATUM); tft.drawString("Verify Number", 160, 40, 2); drawPinBoxes();
    tft.fillRoundRect(40, 210, 240, 50, 25, COLOR_BLUE); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("Verify now", 160, 235, 4); drawKeypad();
}
void drawWelcomeScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("WELCOME", 160, 240, 4);
    int btnY = 310, btnW = 85, btnH = 125; tft.drawRoundRect(15, btnY, btnW, btnH, 40, COLOR_GLOW); drawWiFiSettingIcon(15+btnW/2, btnY+30, TFT_WHITE); tft.drawString("Settings", 57, btnY+115, 2);
    tft.drawRoundRect(117, btnY, btnW, btnH, 40, COLOR_GLOW); drawSaleIcon(117, btnY, TFT_WHITE); tft.drawString("Sale", 159, btnY+115, 2);
    tft.drawRoundRect(220, btnY, btnW, btnH, 40, COLOR_GLOW); drawProfilIcon(220, btnY, TFT_WHITE); tft.drawString("Profile", 262, btnY+115, 2);
}
void drawSaleScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("SALE MENU", 160, 180, 4);
    drawSaleButton(25, 230, 125, 90, "Scan", 0); drawSaleButton(170, 230, 125, 90, "Manual", 1); drawSaleButton(25, 340, 125, 90, "Refund", 2); drawSaleButton(170, 340, 125, 90, "History", 3);
}
void drawProfileScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE, COLOR_NAVY); tft.setTextDatum(MC_DATUM);
    tft.drawString("PROFILE", 160, 165, 4); drawProfilIcon(117, 160, TFT_WHITE); 
    int startY = 245; tft.setTextDatum(TL_DATUM);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY); tft.drawString("Terminal ID", 35, startY, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);  tft.drawString("04040023", 35, startY + 25, 2);
    tft.drawFastHLine(30, startY + 54, 260, 0x18C3);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY); tft.drawString("POS Name", 35, startY + 65, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);  tft.drawString(g_posName, 35, startY + 90, 2);
    tft.drawFastHLine(30, startY + 119, 260, 0x18C3);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY); tft.drawString("Role / Grade", 35, startY + 130, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);  tft.drawString("Market merchant", 35, startY + 155, 2);
}
void drawSettingsScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("SETTINGS", 160, 175, 4);
    drawSettingsButton(25, 200, 125, 80, "Network", 6); drawSettingsButton(170, 200, 125, 80, "Display", 5); drawSettingsButton(25, 295, 125, 80, "Security", 8); drawSettingsButton(170, 295, 125, 80, "System", 9); drawSettingsButton(25, 390, 125, 80, "Sale Opts", 10); drawSettingsButton(170, 390, 125, 80, "About", 7);
}
void drawAboutScreen() { tft.fillScreen(COLOR_NAVY); updateHeader(); drawBackArrow(10, 65, TFT_WHITE); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("About izinm", 160, 240, 4); }
void drawWifiScreen() { tft.fillScreen(COLOR_NAVY); updateHeader(); drawBackArrow(10, 65, TFT_WHITE); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("wifi_POS", 160, 240, 4); }
void drawDisplayScreen() { 
    tft.fillScreen(COLOR_NAVY); updateHeader(); drawBackArrow(10, 65, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("DISPLAY_POS", 160, 240, 4); 
}
void drawSecurityScreen() {
    tft.fillScreen(COLOR_NAVY); updateHeader(); drawBackArrow(10, 65, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("Security_POS", 160, 240, 4); 
}
void drawSystemScreen() {
    tft.fillScreen(COLOR_NAVY); updateHeader(); drawBackArrow(10, 65, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("System_POS", 160, 240, 4); 
}
void drawSaleOptsScreen() {
    tft.fillScreen(COLOR_NAVY); updateHeader(); drawBackArrow(10, 65, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("Opts_POS", 160, 240, 4); 
}
void drawManualConfScreen() {
    tft.fillScreen(COLOR_NAVY); updateHeader(); drawBackArrow(10, 65, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("Manul_conf", 160, 240, 4); 
}

// --- 4. Setup & Loop ---
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
            case 0: drawMainUI(); break; case 1: drawWelcomeScreen(); break; case 2: drawSaleScreen(); break; case 3: drawSettingsScreen(); break; case 4: drawProfileScreen(); break; case 6: drawAboutScreen(); break; case 7: drawWifiScreen(); break; case 9: drawDisplayScreen(); break; case 10: drawSecurityScreen(); break; case 11: drawSystemScreen(); break; case 12: drawSaleOptsScreen(); break; case 13: drawManualConfScreen(); break;
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
            delay(200); 
        } else if (currentPage == 4) { if (tx < 100 && ty < 150) currentPage = 1; delay(200); }
        else if (currentPage == 3) { 
            if (tx < 100 && ty < 150) currentPage = 1; 
            else if (tx >= 170 && ty >= 390) currentPage = 6; 
            else if (tx <= 150 && ty >= 200 && ty <= 280) currentPage = 7; 
            else if (tx >= 170 && ty >= 200 && ty <= 280) currentPage = 9; 
            else if (tx <= 150 && ty >= 295 && ty <= 375) currentPage = 10;
            else if (tx >= 170 && ty >= 295 && ty <= 375) currentPage = 11;
            else if (tx <= 150 && ty >= 390 && ty <= 470) currentPage = 12;
            delay(200); 
        }
        else if (currentPage == 13) { if (tx < 100 && ty < 150) currentPage = 2; delay(200); }
        else if (currentPage >= 6) { if (tx < 100 && ty < 150) currentPage = 3; delay(200); }
    }
    Bridge.update(); delay(5);
}