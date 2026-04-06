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
int    editField    = -1;   // -1=aucun, 0=POS Name, 1=Role/Grade
bool   showKeyboard = false;
String editBuffer   = "";

#define COLOR_KB_BG   0x18C3 // Anthracite très sombre
#define COLOR_KEY_LT  0xFFFF // Blanc (Light key)

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
    for (int i = 0; i < 3; i++) {
        tft.drawRoundRect(cx - 10 - i, cy - 15 - i, 20 + i*2, 20 + i*2, 8, color);
    }
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

void drawAlphaKeyboard() {
    int kbY = 270;
    const char* kbRows[4] = { "1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM" };
    
    // 1. Fond Clavier (Sombre)
    tft.fillRect(0, kbY, 320, 210, COLOR_KB_BG); 
    tft.drawFastHLine(0, kbY, 320, COLOR_GLOW);

    int rowH = 40; 
    for (int r = 0; r < 4; r++) {
        const char* row = kbRows[r];
        int len = strlen(row);
        int keyW = 320 / len;
        int y = kbY + 5 + r * rowH;
        for (int c = 0; c < len; c++) {
            int x = c * keyW;
            // Touche (Claire)
            tft.fillRoundRect(x + 2, y + 2, keyW - 4, rowH - 4, 6, COLOR_KEY_LT);
            tft.drawRoundRect(x + 2, y + 2, keyW - 4, rowH - 4, 6, COLOR_GREY_NK);
            
            tft.setTextColor(COLOR_NAVY);
            tft.setTextDatum(MC_DATUM);
            char buf[2] = {row[c], 0};
            tft.drawString(buf, x + keyW / 2, y + rowH / 2, 2);
        }
    }

    // Rangée 5: Fonctions Spéciales (Claires sur Fond Sombre)
    int y5 = kbY + 5 + 4 * rowH;
    // SPACE
    tft.fillRoundRect(2, y5 + 2, 140, rowH - 4, 8, COLOR_KEY_LT);
    tft.setTextColor(COLOR_NAVY); tft.drawString("SPACE", 72, y5 + rowH/2, 2);
    // DEL
    tft.fillRoundRect(146, y5 + 2, 80, rowH - 4, 8, COLOR_KEY_LT);
    tft.setTextColor(COLOR_NAVY); tft.drawString("DEL", 186, y5 + rowH/2, 2);
    // OK
    tft.fillRoundRect(230, y5 + 2, 88, rowH - 4, 8, COLOR_KEY_LT);
    tft.setTextColor(COLOR_NAVY); tft.drawString("OK", 274, y5 + rowH/2, 2);
}

void drawKeypad() {
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_BLACK);
    const char keys[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}};
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

// --- Page PROFILE (Fonction nécessaire pour drawEditPrompt) ---
void drawProfileScreen();

// --- PROMPT ALERTE EDIT (Overlay sur page Profil - Page 5) ---
void drawEditPrompt() {
    drawProfileScreen();
    tft.fillRect(0, 0, 320, 480, 0x2104); 

    int bx = 30, by = 140; 
    if (showKeyboard) by = 60; 

    tft.fillRoundRect(bx + 5, by + 5, 260, 200, 18, 0x2104);
    tft.fillRoundRect(bx, by, 260, 200, 18, TFT_WHITE);
    tft.drawRoundRect(bx, by, 260, 200, 18, COLOR_GREY_NK);
    tft.drawRoundRect(bx + 1, by + 1, 258, 198, 17, COLOR_GREY_LT);

    tft.setTextColor(COLOR_NAVY); tft.setTextDatum(TL_DATUM);
    tft.drawString("POS Name", bx + 22, by + 20, 2);
    tft.drawString("Role / Grade", bx + 22, by + 72, 2);

    uint16_t border1 = (showKeyboard && editField == 0) ? COLOR_GLOW : COLOR_GREY_NK;
    tft.fillRoundRect(bx + 20, by + 35, 220, 28, 6, TFT_WHITE);
    tft.drawRoundRect(bx + 20, by + 35, 220, 28, 6, border1);
    tft.setTextColor(TFT_BLACK); tft.setTextDatum(ML_DATUM);
    String val1 = (showKeyboard && editField == 0) ? editBuffer + "|" : g_posName;
    tft.drawString(val1, bx + 32, by + 49, 2);

    uint16_t border2 = (showKeyboard && editField == 1) ? COLOR_GLOW : COLOR_GREY_NK;
    tft.fillRoundRect(bx + 20, by + 87, 220, 28, 6, TFT_WHITE);
    tft.drawRoundRect(bx + 20, by + 87, 220, 28, 6, border2);
    tft.setTextColor(TFT_BLACK); tft.setTextDatum(ML_DATUM);
    String val2 = (showKeyboard && editField == 1) ? editBuffer + "|" : g_roleGrade;
    tft.drawString(val2, bx + 32, by + 101, 2);

    if (!showKeyboard) {
        tft.drawFastHLine(bx + 10, by + 142, 240, COLOR_GREY_NK);
        tft.fillRoundRect(bx + 15, by + 152, 107, 38, 12, COLOR_GREY_LT);
        tft.drawRoundRect(bx + 15, by + 152, 107, 38, 12, COLOR_GREY_NK);
        tft.setTextColor(TFT_BLACK); tft.setTextDatum(MC_DATUM);
        tft.drawString("Cancel", bx + 68, by + 171, 2);

        tft.fillRoundRect(bx + 137, by + 152, 107, 38, 12, COLOR_BLUE);
        tft.setTextColor(TFT_WHITE);
        tft.drawString("OK", bx + 190, by + 171, 2);
    } else {
        drawAlphaKeyboard();
    }
}

void updateHeader() {
    tft.fillRect(0, 0, 320, 45, TFT_WHITE); 
    int timeX = 15; int timeY = 12;
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(TL_DATUM);
    tft.drawString(g_timeStr, timeX, timeY, 2);
    
    int bx = 280; int by = 13;
    tft.drawRoundRect(bx, by, 25, 13, 3, COLOR_NAVY); 
    tft.drawRoundRect(bx+1, by+1, 23, 11, 2, COLOR_NAVY); 
    tft.fillRect(bx + 25, by + 4, 3, 5, COLOR_NAVY);
    int battVal = g_battStr.toInt(); 
    if (battVal > 100) battVal = 100;
    if (battVal < 0) battVal = 0;
    int fillW = map(battVal, 0, 100, 0, 19);
    tft.fillRect(bx + 3, by + 3, fillW, 7, TFT_GREEN);
    
    int pctX = bx - 6; int pctY = 12;
    tft.setTextDatum(TR_DATUM); tft.setTextColor(COLOR_NAVY);
    tft.drawString(g_battStr, pctX, pctY, 2);
    
    int wifiSpacing = 52; int wifiX = pctX - wifiSpacing; int wifiY = 11;
    drawWiFiIcon(wifiX, wifiY, COLOR_NAVY); 
}

void drawWelcomeScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader();
    drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextFont(4); 
    int dateW = tft.textWidth(g_dateStr, 4);
    int bubbleW = dateW + 40; int bubbleH = 36;
    int bpx = -10; int bpy = 118;
    tft.fillRoundRect(bpx, bpy, bubbleW, bubbleH, 18, TFT_BLACK); 
    tft.fillRoundRect(bpx + 2, bpy + 2, bubbleW - 4, bubbleH - 4, 16, TFT_WHITE); 
    tft.setTextColor(TFT_BLACK); tft.setTextDatum(ML_DATUM); 
    tft.drawString(g_dateStr, 20, bpy + (bubbleH / 2) + 2, 4);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM);
    tft.drawString("WELCOME", 160, 240, 4); 
    
    int btnY = 310; int btnW = 85, btnH = 125;
    tft.drawRoundRect(15, btnY, btnW, btnH, 40, COLOR_GLOW); 
    drawSettingsIcon(15, btnY, TFT_WHITE);
    tft.setTextDatum(BC_DATUM); tft.drawString("Settings", 57, btnY + 115, 2);
    tft.drawRoundRect(117, btnY, btnW, btnH, 40, COLOR_GLOW);
    drawSaleIcon(117, btnY, TFT_WHITE);
    tft.drawString("Sale", 159, btnY + 115, 2);
    tft.drawRoundRect(220, btnY, btnW, btnH, 40, COLOR_GLOW);
    drawProfilIcon(220, btnY, TFT_WHITE);
    tft.drawString("Profile", 262, btnY + 115, 2);
}

void drawScannerIcon(int x, int y, uint16_t color) {
    tft.drawRoundRect(x, y, 40, 40, 5, color);
    tft.fillRect(x - 5, y + 18, 50, 4, TFT_RED);
    tft.fillRect(x + 8, y + 8, 4, 8, color); tft.fillRect(x + 22, y + 8, 6, 8, color);
    tft.fillRect(x + 8, y + 24, 4, 8, color); tft.fillRect(x + 22, y + 24, 6, 8, color);
}

void drawCalculIcon(int x, int y, uint16_t color) {
    tft.drawRoundRect(x, y, 36, 44, 4, color);
    tft.drawRect(x + 5, y + 5, 26, 10, color);
    for(int r = 0; r < 3; r++) for(int c = 0; c < 3; c++) tft.fillRect(x + 5 + c*10, y + 18 + r*8, 6, 5, color);
}

void drawRefundIcon(int x, int y, uint16_t color) {
    tft.drawCircle(x + 20, y + 20, 18, color);
    tft.fillRect(x + 14, y + 18, 16, 4, color);
    tft.fillTriangle(x + 14, y + 12, x + 6, y + 20, x + 14, y + 28, color);
}

void drawArchivesIcon(int x, int y, uint16_t color) {
    tft.drawRoundRect(x, y + 8, 40, 28, 4, color);
    tft.fillRoundRect(x - 2, y + 4, 44, 8, 2, color);
}

void drawWiFiSettingIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.fillCircle(cx, cy + 5, 4, color);
    tft.drawCircle(cx, cy + 5, 10, color); tft.drawCircle(cx, cy + 5, 18, color);
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
    tft.drawCircle(cx, cy-8, 8, color); tft.fillCircle(cx, cy+4, 3, color);
}

void drawSystemIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawCircle(cx, cy, 13, color);
    for(int i=0; i<8; i++) { float a = i*45*PI/180; tft.fillCircle(cx+cos(a)*15, cy+sin(a)*15, 4, color); }
}

void drawSaleSettingsIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawCircle(cx, cy, 18, color); tft.drawString("$", cx, cy, 4);
}

void drawAboutIcon(int bx, int by, uint16_t color) {
    int cx = bx + 62, cy = by + 25;
    tft.drawCircle(cx, cy, 18, color); tft.fillRect(cx-2, cy-8, 4, 16, color); tft.fillCircle(cx, cy-12, 3, color);
}

void drawPenIcon(int x, int y, uint16_t color) {
    tft.drawLine(x + 5, y + 25, x + 25, y + 5, color);
    tft.fillTriangle(x + 5, y + 25, x + 8, y + 23, x + 3, y + 28, color);
}

void drawSettingsScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_WHITE, COLOR_NAVY); tft.setTextDatum(MC_DATUM);
    tft.drawString("SETTINGS MENU", 160, 180, 4); 
    int w = 125, h = 80; int col1 = 25, col2 = 170;
    int row1 = 215, row2 = 305, row3 = 395;
    tft.drawRoundRect(col1, row1, w, h, 15, COLOR_GLOW); drawWiFiSettingIcon(col1, row1+5, TFT_WHITE); tft.drawString("Connectivity", col1+62, row1+65, 2);
    tft.drawRoundRect(col2, row1, w, h, 15, COLOR_GLOW); drawDisplayIcon(col2, row1+5, TFT_WHITE); tft.drawString("Display", col2+62, row1+65, 2);
    tft.drawRoundRect(col1, row2, w, h, 15, COLOR_GLOW); drawSecurityIcon(col1, row2+5, TFT_WHITE); tft.drawString("Security", col1+62, row2+65, 2);
    tft.drawRoundRect(col2, row2, w, h, 15, COLOR_GLOW); drawSystemIcon(col2, row2+5, TFT_WHITE); tft.drawString("System", col2+62, row2+65, 2);
    tft.drawRoundRect(col1, row3, w, h, 15, COLOR_GLOW); drawSaleSettingsIcon(col1, row3+5, TFT_WHITE); tft.drawString("Sale Opts", col1+62, row3+65, 2);
    tft.drawRoundRect(col2, row3, w, h, 15, COLOR_GLOW); drawAboutIcon(col2, row3+5, TFT_WHITE); tft.drawString("About", col2+62, row3+65, 2);
}

void drawProfileScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_WHITE, COLOR_NAVY); tft.setTextDatum(MC_DATUM);
    tft.drawString("PROFILE", 160, 165, 4); 
    drawProfilIcon(117, 160, TFT_WHITE); 
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY); tft.drawString("Terminal ID", 160, 245, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY); tft.drawString("04040023", 160, 270, 2);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY); tft.drawString("POS Name", 160, 305, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY); tft.drawString(g_posName, 160, 330, 2);
    tft.setTextColor(COLOR_GLOW, COLOR_NAVY); tft.drawString("Role / Grade", 160, 365, 4); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY); tft.drawString(g_roleGrade, 160, 390, 2);
    int editX = 160, editY = 430;
    tft.fillCircle(editX, editY, 20, COLOR_GLOW); drawPenIcon(editX - 15, editY - 15, TFT_WHITE); 
    tft.setTextColor(TFT_WHITE, COLOR_NAVY); tft.drawString("Edit", editX, editY + 32, 2); 
}

void drawSaleScreen() {
    tft.fillScreen(TFT_WHITE); updateHeader(); drawBackArrow(10, 65, COLOR_NAVY); 
    tft.fillRect(0, 140, 320, 340, COLOR_NAVY);
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM);
    tft.drawString("SALE MENU", 160, 180, 4); 
    int w = 125, h = 90; int col1 = 25, col2 = 170; int row1 = 230, row2 = 340;
    tft.drawRoundRect(col1, row1, w, h, 15, COLOR_GLOW); drawScannerIcon(col1 + 42, row1 + 15, TFT_WHITE); tft.drawString("Scanner", col1 + 62, row1 + 75, 2);
    tft.drawRoundRect(col2, row1, w, h, 15, COLOR_GLOW); drawCalculIcon(col2 + 44, row1 + 12, TFT_WHITE); tft.drawString("Calcul", col2 + 62, row1 + 75, 2);
    tft.drawRoundRect(col1, row2, w, h, 15, COLOR_GLOW); drawRefundIcon(col1 + 42, row2 + 15, TFT_WHITE); tft.drawString("Refund", col1 + 62, row2 + 75, 2);
    tft.drawRoundRect(col2, row2, w, h, 15, COLOR_GLOW); drawArchivesIcon(col2 + 42, row2 + 15, TFT_WHITE); tft.drawString("Archives", col2 + 62, row2 + 75, 2);
}

void update_status_cb(String t, String d, String w, String b) { g_timeStr = t; g_dateStr = d; g_wifiStr = w; g_battStr = b; }

void setup() {
    Serial.begin(115200); delay(500);
    Bridge.begin(); Bridge.provide("update_status", update_status_cb);
    tft.init(); tft.setRotation(0); tft.fillScreen(TFT_BLACK); 
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM); tft.drawString("Hardware Initializing...", 160, 160, 2);
    delay(500); touch_calibrate(); firstDraw = true;
}

void loop() {
    uint16_t x = 0, y = 0; static String lastT = ""; static int lastPage = -1;
    if (currentPage > 0) {
        if (lastPage != currentPage) {
            lastPage = currentPage;
            if (currentPage == 1) drawWelcomeScreen();
            else if (currentPage == 2) drawSaleScreen();
            else if (currentPage == 3) drawSettingsScreen();
            else if (currentPage == 4) drawProfileScreen();
            else if (currentPage == 5) drawEditPrompt();
        }
        if (g_timeStr != lastT) { lastT = g_timeStr; updateHeader(); }
    } else {
        if (firstDraw || lastPage != 0) { firstDraw = false; lastPage = 0; drawMainUI(); }
    }

    if (tft.getTouch(&x, &y)) {
        if (currentPage == 0) {
            if (y >= 280 && y <= 480) {
                int col = x / 106; int row = (y - 280) / 50; if (col > 2) col = 2; if (row > 3) row = 3;
                char key = "123456789 0<"[row * 3 + col];
                if (key >= '0' && key <= '9') { if (enteredPin.length() < 4) { enteredPin += key; drawPinBoxes(); } }
                else if (key == '<') { if (enteredPin.length() > 0) { enteredPin.remove(enteredPin.length() - 1); drawPinBoxes(); } }
                delay(200);
            } else if (y >= 210 && y <= 260 && x >= 40 && x <= 280) {
                if (enteredPin == correctPin) currentPage = 1; else { enteredPin = ""; drawPinBoxes(); delay(200); }
            }
        } 
        else if (currentPage == 1) {
            if (x < 80 && y < 130) { currentPage = 0; enteredPin = ""; drawMainUI(); delay(200); }
            if (y > 300) {
                if (x >= 20 && x <= 105) currentPage = 3;
                if (x >= 117 && x <= 202) currentPage = 2;
                if (x >= 215 && x <= 300) currentPage = 4;
                delay(200);
            }
        }
        else if (currentPage == 2) { if (x < 80 && y < 130) { currentPage = 1; delay(200); } }
        else if (currentPage == 3) { if (x < 80 && y < 130) { currentPage = 1; delay(200); } }
        else if (currentPage == 4) {
            if (x < 80 && y < 130) { currentPage = 1; delay(200); }
            if (x >= 120 && x <= 200 && y >= 400 && y <= 475) { currentPage = 5; delay(200); }
        }
        else if (currentPage == 5) {
            if (!showKeyboard) {
                int bx = 30, by = 140;
                if (x >= (bx+20) && x <= (bx+240) && y >= (by+35) && y <= (by+63)) { editField = 0; editBuffer = g_posName; showKeyboard = true; drawEditPrompt(); delay(200); }
                else if (x >= (bx+20) && x <= (bx+240) && y >= (by+87) && y <= (by+115)) { editField = 1; editBuffer = g_roleGrade; showKeyboard = true; drawEditPrompt(); delay(200); }
                else if (x >= 45 && x <= 152 && y >= 292 && y <= 330) { currentPage = 4; showKeyboard = false; delay(200); }
                else if (x >= 167 && x <= 274 && y >= 292 && y <= 330) { currentPage = 4; showKeyboard = false; delay(200); }
            } else {
                // CLAVIER VISUEL UNIQUEMENT (SANS FONCTIONNER LES TOUCHES)
                if (y >= 270) { delay(200); } // Bloque simplement l'interaction pour correspondre à "sans fonctionner"
            }
        }
    }
    Bridge.update();
}
