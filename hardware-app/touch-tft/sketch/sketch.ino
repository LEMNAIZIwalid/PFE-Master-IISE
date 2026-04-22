#include "TFT_eSPI.h"           
#include <Adafruit_PN532.h>
#include "Arduino_RouterBridge.h"

// --- CONFIGURATION MATÉRIELLE ---
#define PN532_SCK   6
#define PN532_MISO  3
#define PN532_MOSI  5
#define PN532_SS    A0  
#define BUZZER_PIN  4

// --- OBJETS ---
Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
TFT_eSPI tft = TFT_eSPI();

// --- VARIABLES SRAM-OPTIMIZED ---
uint8_t currentPage = 0; 
uint8_t lastPage = 255;
String  enteredPin = "";
const String correctPin = "7687";
bool    nfcReady = false;

// Données calculatrice
String  calcInput = "";
float   calcTotal = 0.0;
char    calcOp = ' ';

// Données Stats (Bridge)
String  g_timeStr = "00:00";
String  g_battStr = "100%";

// --- COULEURS ---
#define COL_BLUE  0x2477
#define COL_NAVY  0x018C
#define COL_GLOW  0x05FF
#define COL_GREY  0xD6BA

// --- CALLBACKS BRIDGE ---
void update_status_cb(String t, String d, String w, String b) { 
    g_timeStr = t; g_battStr = b; 
}

// --- FONCTIONS DE DESSIN (SRAM OPTIMIZÉ AVEC F()) ---

void drawHeader() {
    tft.fillRect(0, 0, 320, 45, TFT_WHITE);
    tft.setTextColor(COL_NAVY);
    tft.setTextDatum(TL_DATUM);
    tft.drawString(g_timeStr, 15, 12, 2);
    tft.setTextDatum(TR_DATUM);
    tft.drawString(g_battStr, 305, 12, 2);
    tft.drawFastHLine(0, 45, 320, COL_GREY);
}

void drawBackArrow() {
    tft.setTextColor(COL_NAVY);
    tft.drawString(F("< BACK"), 15, 60, 2);
}

void drawKeypad() {
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_BLACK);
    const char keys[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}};
    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 3; c++) {
            int x = c * 106, y = 280 + (r * 50);
            tft.drawRect(x, y, 106, 50, COL_GREY);
            if (keys[r][c] != ' ') tft.drawString(String(keys[r][c]), x + 53, y + 25, 2);
        }
    }
}

void drawPinPage() {
    tft.fillScreen(TFT_WHITE);
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(TC_DATUM);
    tft.drawString(F("VERIFY PIN"), 160, 50, 4);
    
    // Boxes
    for (int i=0; i<4; i++) {
        int x = 40 + (i * 65);
        tft.drawRoundRect(x, 120, 55, 65, 8, COL_GREY);
        if (i < enteredPin.length()) {
            tft.setTextDatum(MC_DATUM);
            tft.drawString("*", x + 28, 155, 4);
        }
    }
    
    tft.fillRoundRect(40, 210, 240, 50, 25, COL_BLUE);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(F("LOGIN"), 160, 235, 4);
    drawKeypad();
}

void drawMenu(const __FlashStringHelper* title, const __FlashStringHelper* b1, const __FlashStringHelper* b2) {
    tft.fillScreen(TFT_WHITE);
    drawHeader();
    drawBackArrow();
    
    tft.fillRect(0, 100, 320, 380, COL_NAVY);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(title, 160, 140, 4);
    
    tft.drawRoundRect(40, 200, 240, 70, 15, COL_GLOW);
    tft.drawString(b1, 160, 235, 4);
    
    tft.drawRoundRect(40, 300, 240, 70, 15, COL_GLOW);
    tft.drawString(b2, 160, 335, 4);
}

void drawCalc() {
    tft.fillScreen(TFT_WHITE);
    drawHeader();
    drawBackArrow();
    
    tft.fillRect(10, 60, 300, 100, COL_GREY);
    tft.setTextColor(TFT_BLACK);
    tft.setTextDatum(TR_DATUM);
    String total = (calcInput == "") ? String(calcTotal, 2) : calcInput;
    tft.drawString(total + F(" MAD"), 300, 110, 4);
    
    const char cKeys[4][4] = {{'7','8','9','+'},{'4','5','6','-'},{'1','2','3','*'},{'C','0','=','<'}};
    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 4; c++) {
            int x = c * 80, y = 180 + (r * 75);
            tft.drawRoundRect(x + 5, y + 5, 70, 65, 8, COL_BLUE);
            tft.setTextDatum(MC_DATUM);
            tft.drawString(String(cKeys[r][c]), x + 40, y + 38, 2);
        }
    }
}

void drawScanPage() {
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_YELLOW);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(F("APPROCHEZ BADGE"), 160, 240, 4);
    tft.setTextColor(TFT_WHITE);
    tft.drawString(F("SCANNING..."), 160, 300, 2);
    
    tft.fillRoundRect(80, 420, 160, 45, 10, TFT_RED);
    tft.drawString(F("ANNULER"), 160, 442, 2);
}

void playPaymentSound() {
    tone(BUZZER_PIN, 1568, 100); delay(120);
    tone(BUZZER_PIN, 2093, 250);
}

// --- Setup ---
void setup() {
    Serial.begin(115200);
    
    tft.init();
    tft.setRotation(0);
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(F("MERCHANT POS BOOT"), 160, 240, 2);

    Bridge.begin();
    Bridge.provide("update_status", update_status_cb);
    
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    // Init NFC (Safe Config)
    nfc.begin();
    if (nfc.getFirmwareVersion()) {
        nfcReady = true;
        nfc.SAMConfig();
        nfc.setPassiveActivationRetries(0x20);
        Bridge.call("nfc_log", "NFC Ready");
    } else {
        Bridge.call("nfc_log", "NFC Fail");
    }
}

// --- Loop ---
void loop() {
    // 1. Gestion de l'affichage
    if (lastPage != currentPage) {
        lastPage = currentPage;
        switch(currentPage) {
            case 0: drawPinPage(); break;
            case 1: drawMenu(F("WELCOME"), F("SALE"), F("SETTINGS")); break;
            case 2: drawMenu(F("SALE MENU"), F("NFC SCAN"), F("MANUAL")); break;
            case 13: drawCalc(); break;
            case 14: drawScanPage(); break;
        }
    }

    // 2. Gestion Tactile
    uint16_t tx, ty;
    if (tft.getTouch(&tx, &ty)) {
        if (currentPage == 0) { // PIN
            if (ty >= 280) {
                int col = tx/106, row = (ty-280)/50;
                char k[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{' ','0','<'}};
                char key = k[row][col];
                if (key >= '0' && key <= '9' && enteredPin.length() < 4) { enteredPin += key; drawPinPage(); }
                else if (key == '<' && enteredPin.length() > 0) { enteredPin.remove(enteredPin.length()-1); drawPinPage(); }
                delay(200);
            } else if (ty >= 210 && ty <= 260) {
                if (enteredPin == correctPin) currentPage = 1;
                else enteredPin = ""; drawPinPage();
                delay(200);
            }
        } else if (currentPage == 1) { // Welcome
            if (ty >= 200 && ty <= 270) currentPage = 2; // Sale
            else if (ty < 100) currentPage = 0; // Back
            delay(200);
        } else if (currentPage == 2) { // Sale
            if (ty >= 200 && ty <= 270) currentPage = 14; // Scan
            else if (ty >= 300 && ty <= 370) currentPage = 13; // Manual
            else if (ty < 100) currentPage = 1; // Back
            delay(200);
        } else if (currentPage == 13) { // Calc
            if (ty < 150) { currentPage = 2; delay(200); }
            else if (ty >= 180) {
                int col = tx/80, row = (ty-180)/75;
                const char keys[4][4] = {{'7','8','9','+'},{'4','5','6','-'},{'1','2','3','*'},{'C','0','=','<'}};
                char key = keys[row][col];
                if (key >= '0' && key <= '9') calcInput += key;
                else if (key == 'C') { calcInput = ""; calcTotal = 0; calcOp = ' '; }
                else if (key == '=') {
                    if (calcInput != "") {
                        if (calcOp == '+') calcTotal += calcInput.toFloat();
                        else if (calcOp == '-') calcTotal -= calcInput.toFloat();
                        else if (calcOp == '*') calcTotal *= calcInput.toFloat();
                        else calcTotal = calcInput.toFloat();
                    }
                    calcInput = ""; calcOp = ' ';
                    Bridge.call("calc_total", String(calcTotal, 2));
                } else if (key == '<') { if (calcInput.length() > 0) calcInput.remove(calcInput.length()-1); }
                else {
                   if (calcInput != "") calcTotal = calcInput.toFloat();
                   calcOp = key; calcInput = "";
                }
                drawCalc(); delay(150);
            }
        } else if (currentPage == 14) { // Scan
            if (ty > 400) { currentPage = 2; delay(200); }
        }
    }

    // 3. Gestion NFC
    if (currentPage == 14 && nfcReady) {
        uint8_t uid[] = {0,0,0,0,0,0,0}; uint8_t uidLen;
        if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLen, 150)) {
            playPaymentSound();
            Bridge.call("notify_payment", "Success");
            currentPage = 1; delay(1000);
        }
    }

    Bridge.update();
}