#include "TFT_eSPI.h"           
#include <Adafruit_PN532.h>
#include "Arduino_RouterBridge.h"

// --- Pins ---
#define PN532_SCK 6
#define PN532_MISO 3
#define PN532_MOSI 5
#define PN532_SS   A0 
#define BUZZER_PIN 4

Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
TFT_eSPI tft = TFT_eSPI();

// --- État ---
uint8_t currentPage = 2; // Menu SALE par défaut
uint8_t lastPage = 255;
bool nfcReady = false;
bool isScanningMode = false; // Autorisation de détection

// --- Dessin Menu SALE (3 Boutons) ---
void drawSaleMenu() {
    tft.fillScreen(0x018C); // Fond Bleu Marine
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(F("SALE MENU"), 160, 100, 4);
    
    // Bouton SCAN
    tft.drawRoundRect(40, 180, 240, 70, 15, 0x05FF);
    tft.drawString(F("SCAN"), 160, 215, 4);
    
    // Bouton MANUAL
    tft.drawRoundRect(40, 280, 240, 70, 15, 0x05FF);
    tft.drawString(F("MANUAL"), 160, 315, 4);
    
    // Bouton REFUND
    tft.drawRoundRect(40, 380, 240, 70, 15, 0x05FF);
    tft.drawString(F("REFUND"), 160, 415, 4);
}

void drawScanningPage() {
    tft.fillScreen(TFT_WHITE);
    tft.setTextColor(TFT_BLACK); tft.setTextDatum(TL_DATUM);
    tft.drawString(F("< SCAN"), 15, 15, 4); // Bouton retour
    
    tft.setTextColor(0x018C); tft.setTextDatum(MC_DATUM);
    tft.drawString(F("PRET POUR SCAN"), 160, 100, 4);

    // Bouton Cercle central
    uint16_t circleColor = isScanningMode ? TFT_GREEN : 0x2477; // Bleu si attente, Vert si actif
    tft.fillCircle(160, 260, 70, circleColor);
    tft.drawCircle(160, 260, 72, TFT_BLACK);
    
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM);
    tft.drawString(isScanningMode ? F("SCANNING...") : F("START"), 160, 260, 4);
    
    if (!isScanningMode) {
        tft.setTextColor(TFT_BLACK);
        tft.drawString(F("Cliquez sur le rond"), 160, 360, 2);
    }
}

void drawManualPage() {
    tft.fillScreen(TFT_WHITE);
    tft.setTextColor(TFT_BLACK); tft.setTextDatum(TL_DATUM);
    tft.drawString(F("< MANUAL"), 15, 15, 4);
    
    tft.setTextColor(0x2477); tft.setTextDatum(MC_DATUM);
    tft.drawString(F("MANUAL PAYMENT"), 160, 240, 4);
}

void drawRefundPage() {
    tft.fillScreen(TFT_WHITE);
    tft.setTextColor(TFT_BLACK); tft.setTextDatum(TL_DATUM);
    tft.drawString(F("< REFUND"), 15, 15, 4);
    
    tft.setTextColor(0x44A8); tft.setTextDatum(MC_DATUM);
    tft.drawString(F("REFUND MODE"), 160, 240, 4);
}

void touch_calibrate() {
    uint16_t calData[5];
    tft.fillScreen(TFT_BLACK);
    tft.drawCentreString(F("Calibration..."), 160, 10, 2);
    tft.calibrateTouch(calData, TFT_MAGENTA, TFT_BLACK, 15);
    tft.setTouch(calData);
}

void playPaymentSound() {
    // Apple Pay Success Sound Approximation
    tone(BUZZER_PIN, 1760, 50); // A6
    delay(60);
    tone(BUZZER_PIN, 2349, 50); // D7
    delay(60);
    tone(BUZZER_PIN, 3136, 100); // G7
    delay(120);
    noTone(BUZZER_PIN);
}

void setup() {
    tft.init();
    tft.setRotation(0);
    
    // Calibration au démarrage
    touch_calibrate();
    
    tft.fillScreen(TFT_BLACK);
    Bridge.begin();
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    nfc.begin();
    if (nfc.getFirmwareVersion()) {
        nfcReady = true;
        nfc.SAMConfig();
        nfc.setPassiveActivationRetries(0x20); // Scan rapide
    }
}

void loop() {
    // 1. Pages
    if (lastPage != currentPage) {
        lastPage = currentPage;
        if (currentPage == 2) drawSaleMenu();
        else if (currentPage == 14) drawScanningPage();
        else if (currentPage == 13) drawManualPage();
        else if (currentPage == 15) drawRefundPage();
        else {
            tft.fillScreen(TFT_BLACK);
            tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM);
            tft.drawString(F("PAGE INCONNUE"), 160, 240, 2);
        }
    }

    // 2. Tactile
    uint16_t tx, ty;
    if (tft.getTouch(&tx, &ty)) {
        if (currentPage == 2) {
            if (ty >= 180 && ty <= 250) currentPage = 14; 
            else if (ty >= 280 && ty <= 350) currentPage = 13;
            else if (ty >= 380 && ty <= 450) currentPage = 15;
            delay(200);
        } else if (tx < 150 && ty < 60) { // Retour
            currentPage = 2; isScanningMode = false; delay(200);
        } else if (currentPage == 14 && !isScanningMode) {
            // Détection du clic dans le cercle (Centre 160,260, Rayon 70)
            long dx = (long)tx - 160;
            long dy = (long)ty - 260;
            if ((dx*dx + dy*dy) <= 4900) { // Rayon au carré
                isScanningMode = true;
                drawScanningPage(); // Mettre à jour l'état visuel
                delay(200);
            }
        }
    }

    // 3. NFC Logic (Page 14 + Autorisation)
    if (currentPage == 14 && nfcReady && isScanningMode) {
        uint8_t uid[] = {0,0,0,0,0,0,0}; uint8_t uidLen;
        if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLen, 100)) {
            playPaymentSound(); // Son Pro Apple Pay
            
            Bridge.call("notify_payment", "Success");
            currentPage = 2; // Retour auto au menu après succès
            delay(1000);
        }
    }

    Bridge.update();
}
