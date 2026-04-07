#include "TFT_eSPI.h"           
#include "Arduino_RouterBridge.h"

TFT_eSPI tft = TFT_eSPI();

String enteredPin = "";
int currentPage = 0; // 0=LOGIN, 1=WELCOME, 2=SALE, 3=SETTINGS, 4=PROFILE, 5=EDIT_POS_NAME, 6=ABOUT, 7=WIFI
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
    int cx = x + 42, cy = y + 50;
    for (int i = 0; i < 3; i++) tft.drawRoundRect(cx - 10 - i, cy - 15 - i, 20 + i*2, 20 + i*2, 8, color);
    tft.fillRoundRect(cx - 17, cy - 4, 34, 28, 4, color);
    tft.fillRoundRect(cx - 6, cy + 5, 12, 12, 2, COLOR_GLOW); 
    tft.fillCircle(cx, cy + 11, 3, color); 
}

void drawSettingsIcon(int x, int y, uint16_t color) {
    int cx = x + 42, cy = y + 50; 
    for (int j = 0; j < 8; j++) {
        float angle = j * 45 * PI / 180;
        tft.fillCircle(cx + cos(angle)*15, cy + sin(angle)*15, 6, color);
    }
    tft.fillCircle(cx, cy, 14, color);
    tft.fillCircle(cx, cy, 6, COLOR_GLOW); 
}

void drawProfilIcon(int x, int y, uint16_t color) {
    int cx = x + 42, cy = y + 45; 
    tft.fillCircle(cx, cy - 8, 8, color); 
    tft.fillRoundRect(cx - 14, cy + 4, 28, 14, 6, color);
}

void drawBackArrow(int x, int y, uint16_t color) {
    int ax = x + 15, ay = y + 10;
    for (int i = 0; i < 3; i++) {
        tft.drawLine(ax + 15, ay + i, ax + i, ay + 15 + i, color);
        tft.drawLine(ax + i, ay + 15 + i, ax + 15, ay + 30 + i, color);
        tft.drawLine(ax + i, ay + 15 + i, ax + 35 + i, ay + 15 + i, color);
    }
}

void drawInputBox() {
    tft.fillRoundRect(15, 100, 290, 60, 10, TFT_WHITE);
    tft.drawRoundRect(15, 100, 290, 60, 10, COLOR_GLOW);
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(g_tempBuffer, 160, 130, 4);
}

void touch_calibrate() {
    uint16_t calData[5];
    tft.fillScreen(TFT_BLACK);
    tft.setCursor(20, 0);
    tft.setTextFont(2);
    tft.setTextSize(1);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.println("Touch corners as indicated");
    tft.calibrateTouch(calData, TFT_MAGENTA, TFT_BLACK, 15);
    tft.setTouch(calData);
}

void drawPinBoxes() {
    for (int i = 0; i < 4; i++) {
        int x = 25 + (i * 75), y = 110;
        tft.drawRoundRect(x, y, 60, 70, 8, COLOR_GREY_NK);
        tft.fillRect(x+1, y+1, 58, 68, TFT_WHITE);
        if (i < enteredPin.length()) {
            tft.setTextColor(TFT_BLACK);
            tft.setTextDatum(MC_DATUM);
            tft.drawString(String(enteredPin[i]), x + 30, y + 35, 4);
        }
    }
}

void drawKeypad() {
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_BLACK);
    const char keys[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}};
    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 3; c++) {
            int x = c * 106, y = 280 + (r * 50);
            tft.drawRect(x, y, 106, 50, COLOR_GREY_LT);
            if (keys[r][c] != ' ') tft.drawString(String(keys[r][c]), x + 53, y + 25, 4);
        }
    }
}

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

void drawAlphaKeyboard() {
    tft.fillRect(0, 260, 320, 220, 0x10A2);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_WHITE);
    const char* keys[4] = {"1234567890", "QWERTYUIOP", "ASDFGHJKL-", "ZXCVBNM.,<"};
    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 10; c++) {
            int bx = c * 32, by = 260 + (r * 45);
            tft.drawRoundRect(bx + 1, by + 1, 30, 43, 4, 0x39C7);
            tft.fillRoundRect(bx + 2, by + 2, 28, 41, 3, 0x2104);
            tft.drawString(String(keys[r][c]), bx + 16, by + 22, 2);
        }
    }
    tft.fillRoundRect(5, 445, 182, 30, 6, 0x39C7); tft.drawString("SPACE", 96, 460, 2);
    tft.fillRoundRect(197, 445, 118, 30, 6, COLOR_BLUE); tft.drawString("SAVE", 256, 460, 4);
}

void drawEditPOSNameScreen() {
    tft.fillScreen(COLOR_NAVY); updateHeader();
    tft.fillRect(0, 45, 320, 40, 0x18C3); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM);
    tft.drawString(g_editMode == 0 ? "Edit POS Name" : "Edit Role / Grade", 160, 65, 4);
    drawBackArrow(5, 50, TFT_WHITE); tft.setTextColor(COLOR_GLOW); tft.setTextDatum(TL_DATUM);
    tft.drawString(g_editMode == 0 ? "New POS name:" : "New Role / Grade:", 20, 85, 2);
    drawInputBox(); drawAlphaKeyboard();
}

void updateHeader() {
    tft.fillRect(0, 0, 320, 45, TFT_WHITE); tft.setTextColor(COLOR_NAVY); tft.setTextDatum(TL_DATUM);
    tft.drawString(g_timeStr, 15, 12, 2); int bx = 280, by = 13;
    tft.drawRoundRect(bx, by, 25, 13, 3, COLOR_NAVY); tft.drawRoundRect(bx+1, by+1, 23, 11, 2, COLOR_NAVY);
    tft.fillRect(bx + 25, by + 4, 3, 5, COLOR_NAVY);
    int fillW = map(g_battStr.toInt(), 0, 100, 0, 19); tft.fillRect(bx + 3, by + 3, fillW, 7, TFT_GREEN);
    tft.setTextDatum(TR_DATUM); tft.drawString(g_battStr, bx - 6, 12, 2); drawWiFiIcon(bx - 60, 11, COLOR_NAVY); 
}

void drawWelcomeScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_BLACK), tft.setTextDatum(ML_DATUM); 
    tft.fillRoundRect(-10, 118, 250, 36, 18, TFT_BLACK); tft.fillRoundRect(-8, 120, 246, 32, 16, TFT_WHITE); 
    tft.drawString(g_dateStr, 20, 138, 4); tft.setTextColor(TFT_WHITE), tft.setTextDatum(MC_DATUM);
    tft.drawString("WELCOME", 160, 240, 4); 
    int btnY = 310, btnW = 85, btnH = 125;
    tft.drawRoundRect(15, btnY, btnW, btnH, 40, COLOR_GLOW); drawSettingsIcon(15, btnY, TFT_WHITE); tft.drawString("Settings", 57, btnY + 115, 2);
    tft.drawRoundRect(117, btnY, btnW, btnH, 40, COLOR_GLOW); drawSaleIcon(117, btnY, TFT_WHITE); tft.drawString("Sale", 159, btnY + 115, 2);
    tft.drawRoundRect(220, btnY, btnW, btnH, 40, COLOR_GLOW); drawProfilIcon(220, btnY, TFT_WHITE); tft.drawString("Profile", 262, btnY + 115, 2);
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
    tft.setTextColor(TFT_WHITE, COLOR_NAVY);  tft.drawString(g_roleGrade, 35, startY + 155, 2);
}

void drawWiFiSettingIcon(int cx, int cy, uint16_t color) {
    // Point central
    tft.fillCircle(cx, cy + 15, 3, color);
    
    // Vagues (arcs concentriques)
    for (int i = 0; i < 2; i++) {
        int r = 10 + (i * 8);
        tft.drawCircle(cx, cy + 15, r, color);
        tft.drawCircle(cx, cy + 15, r + 1, color);
    }
    
    // Masque pour créer l'effet d'arc (fond COLOR_NAVY)
    tft.fillRect(cx - 25, cy + 16, 50, 25, COLOR_NAVY);
    tft.fillTriangle(cx, cy + 15, cx - 40, cy + 15, cx - 40, cy - 30, COLOR_NAVY);
    tft.fillTriangle(cx, cy + 15, cx + 40, cy + 15, cx + 40, cy - 30, COLOR_NAVY);
}

void drawDisplayIcon(int cx, int cy, uint16_t color) {
    tft.fillCircle(cx, cy, 9, color);
    for (int i = 0; i < 8; i++) { float a = i * 45 * PI / 180; tft.drawLine(cx + cos(a) * 13, cy + sin(a) * 13, cx + cos(a) * 18, cy + sin(a) * 18, color); }
}

void drawSecurityIcon(int cx, int cy, uint16_t color) {
    tft.fillRoundRect(cx - 12, cy - 2, 24, 20, 3, color); tft.drawCircle(cx, cy - 4, 9, color);
}

// --- Icônes SALE (Reconstruction) ---
void drawScannerIcon(int x, int y, uint16_t color) {
    tft.fillRect(x + 5, y + 5, 4, 25, color);
    tft.fillRect(x + 12, y + 5, 2, 25, color);
    tft.fillRect(x + 17, y + 5, 6, 25, color);
    tft.fillRect(x + 26, y + 5, 3, 25, color);
    tft.fillRect(x, y + 16, 42, 2, TFT_RED); // Laser rouge
}

void drawCalculIcon(int x, int y, uint16_t color) {
    tft.fillRoundRect(x + 8, y, 32, 38, 4, color);
    tft.fillRect(x + 12, y + 5, 24, 10, COLOR_NAVY);
    tft.fillRect(x + 12, y + 20, 8, 6, COLOR_GLOW);
    tft.fillRect(x + 26, y + 20, 8, 6, COLOR_GLOW);
}

void drawRefundIcon(int x, int y, uint16_t color) {
    tft.drawCircle(x + 20, y + 18, 16, color); tft.drawCircle(x + 20, y + 18, 17, color);
    tft.fillTriangle(x + 8, y + 18, x + 16, y + 10, x + 16, y + 26, color);
}

void drawArchivesIcon(int x, int y, uint16_t color) {
    tft.fillRoundRect(x + 5, y + 5, 40, 30, 3, color);
    tft.fillRoundRect(x + 5, y, 15, 8, 2, color);
    tft.fillRect(x + 12, y + 14, 26, 3, COLOR_NAVY);
}

void drawAboutIcon(int cx, int cy, uint16_t color) {
    tft.fillCircle(cx, cy, 18, color); tft.fillRect(cx - 2, cy - 4, 4, 12, COLOR_NAVY); tft.fillCircle(cx, cy - 9, 3, COLOR_NAVY);
}

void drawSystemIcon(int cx, int cy, uint16_t color) {
    for (int i = 0; i < 8; i++) { float a = i * 45 * PI / 180; tft.fillCircle(cx + cos(a) * 14, cy + sin(a) * 14, 4, color); }
    tft.fillCircle(cx, cy, 11, color);
}

void drawSaleSettingsIcon(int cx, int cy, uint16_t color) {
    tft.fillRoundRect(cx - 10, cy - 10, 24, 20, 3, color); tft.fillTriangle(cx - 10, cy - 10, cx - 18, cy, cx - 10, cy + 10, color);
}

void drawSettingsButton(int x, int y, int w, int h, const char* label, int iconType) {
    tft.drawRoundRect(x, y, w, h, 15, COLOR_GLOW);
    int cx = x + w / 2, cy = y + 30;
    if (iconType == 6) drawWiFiSettingIcon(cx, cy, TFT_WHITE);
    else if (iconType == 5) drawDisplayIcon(cx, cy, TFT_WHITE);
    else if (iconType == 8) drawSecurityIcon(cx, cy, TFT_WHITE);
    else if (iconType == 7) drawAboutIcon(cx, cy, TFT_WHITE);
    else if (iconType == 9) drawSystemIcon(cx, cy, TFT_WHITE);
    else if (iconType == 10) drawSaleSettingsIcon(cx, cy, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(BC_DATUM); tft.drawString(label, x + w/2, y + h - 10, 2);
}

void drawSaleButton(int x, int y, int w, int h, const char* label, int iconType) {
    tft.drawRoundRect(x, y, w, h, 15, COLOR_GLOW);
    
    // Position centrale pour l'icône
    int iconX = x + (w - 42) / 2;
    int iconY = y + 15;
    
    if (iconType == 0) drawScannerIcon(iconX, iconY, TFT_WHITE);
    else if (iconType == 1) drawCalculIcon(iconX, iconY, TFT_WHITE);
    else if (iconType == 2) drawRefundIcon(iconX, iconY, TFT_WHITE);
    else if (iconType == 3) drawArchivesIcon(iconX, iconY, TFT_WHITE);
    
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(BC_DATUM); tft.drawString(label, x + w/2, y + h - 10, 2);
}

void drawSaleScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("SALE MENU", 160, 180, 4); 
    int col1 = 25, col2 = 170, row1 = 230, row2 = 340, w = 125, h = 90;
    drawSaleButton(col1, row1, w, h, "Scan", 0); drawSaleButton(col2, row1, w, h, "Manual", 1);
    drawSaleButton(col1, row2, w, h, "Refund", 2); drawSaleButton(col2, row2, w, h, "History", 3);
}

void drawSettingsScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY); tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("SETTINGS MENU", 160, 175, 4); 
    int w = 125, h = 80, col1 = 25, col2 = 170, row1 = 200, row2 = 295, row3 = 390;
    drawSettingsButton(col1, row1, w, h, "Network", 6); drawSettingsButton(col2, row1, w, h, "Display", 5);
    drawSettingsButton(col1, row2, w, h, "Security", 8); drawSettingsButton(col2, row2, w, h, "System", 9);
    drawSettingsButton(col1, row3, w, h, "Sale Opts", 10); drawSettingsButton(col2, row3, w, h, "About", 7);
}

void drawAboutScreen() {
    tft.fillScreen(COLOR_NAVY); updateHeader(); drawBackArrow(10, 65, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("About izinm", 160, 240, 4);
}

void update_status_cb(String t, String d, String w, String b) {
    g_timeStr = t; g_dateStr = d; g_wifiStr = w; g_battStr = b;
}

void drawWifiScreen() {
    tft.fillScreen(COLOR_NAVY); updateHeader(); drawBackArrow(10, 65, TFT_WHITE);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("wifi_POS", 160, 240, 4);
}

void setup() {
    Serial.begin(115200); delay(200); 
    Bridge.begin(); Bridge.provide("update_status", update_status_cb);
    tft.init(); tft.setRotation(0); tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("INITIALIZING...", 160, 240, 4);
    delay(500); touch_calibrate(); firstDraw = true; 
}

void loop() {
    uint16_t x = 0, y = 0; static int lastPage = -1;
    if (lastPage != currentPage) {
        lastPage = currentPage;
        if (currentPage == 0) drawMainUI(); else if (currentPage == 1) drawWelcomeScreen();
        else if (currentPage == 2) drawSaleScreen(); else if (currentPage == 3) drawSettingsScreen();
        else if (currentPage == 4) drawProfileScreen(); else if (currentPage == 6) drawAboutScreen();
        else if (currentPage == 7) drawWifiScreen();
    }
    if (tft.getTouch(&x, &y)) {
        if (currentPage == 0) {
            if (y >= 280) {
                int col = x / 106, row = (y - 280) / 50; char k[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}};
                char key = k[row][col]; if (key >= '0' && key <= '9') { if (enteredPin.length() < 4) { enteredPin += key; drawPinBoxes(); } }
                else if (key == '<') { if (enteredPin.length() > 0) { enteredPin.remove(enteredPin.length()-1); drawPinBoxes(); } } delay(200);
            } else if (y >= 210 && y <= 260 && x >= 40 && x <= 280) {
                if (enteredPin == correctPin) currentPage = 1; else { enteredPin = ""; drawPinBoxes(); } delay(200);
            }
        } else if (currentPage == 1) {
            if (x < 100 && y < 150) { currentPage = 0; enteredPin = ""; }
            else if (y > 300) { if (x < 110) currentPage = 3; else if (x < 210) currentPage = 2; else currentPage = 4; } delay(200);
        } else if (currentPage == 2) {
            if (x < 100 && y < 150) currentPage = 1; delay(200);
        } else if (currentPage == 3) {
            if (x < 100 && y < 150) currentPage = 1; 
            else if (x >= 170 && x <= 295 && y >= 390 && y <= 470) currentPage = 6;
            else if (x >= 25 && x <= 150 && y >= 200 && y <= 280) currentPage = 7;
            delay(200);
        } else if (currentPage == 4) {
            if (x < 100 && y < 150) currentPage = 1; delay(200);
        } else if (currentPage == 6) {
            if (x < 100 && y < 150) currentPage = 3; delay(200);
        } else if (currentPage == 7) {
            if (x < 100 && y < 150) currentPage = 3; delay(200);
        }
    }
    Bridge.update();
}