#include "TFT_eSPI.h"           
#include <Adafruit_PN532.h>
#include "Arduino_RouterBridge.h"

// --- Pins ---
#define PN532_SCK 6
#define PN532_MISO 3
#define PN532_MOSI 5
#define PN532_SS   A0 
#define BUZZER_PIN 4
#define PIN_RX A1
#define PIN_TX A2
#define BIT_DELAY 103

Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
TFT_eSPI tft = TFT_eSPI();

// Commandes Scanner (Manual Bit-Banging)
byte startScan[] = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x01, 0xAB, 0xCD};
byte stopScan[]  = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x00, 0xAB, 0xCD};

// États
uint8_t currentPage = 2; 
uint8_t lastPage = 255;
bool isBarcodeActive = false;
String barcodeBuffer = "";

// --- Audio ---
void playSound(int freq, int dur) {
    tone(BUZZER_PIN, freq, dur);
    delay(dur);
    noTone(BUZZER_PIN);
}

// --- Calibration Tactile ---
void touch_calibrate() {
    uint16_t calData[5];
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE);
    tft.drawCentreString(F("CALIBRATION : TOUCHEZ LES COINS"), 160, 240, 2);
    tft.calibrateTouch(calData, TFT_MAGENTA, TFT_BLACK, 15);
    tft.setTouch(calData);
}

// --- Communication Série Manuelle ---
void manualWrite(byte b) {
    noInterrupts();
    digitalWrite(PIN_TX, LOW); delayMicroseconds(BIT_DELAY);
    for (int i = 0; i < 8; i++) {
        digitalWrite(PIN_TX, (b >> i) & 0x01);
        delayMicroseconds(BIT_DELAY);
    }
    digitalWrite(PIN_TX, HIGH);
    interrupts();
    delayMicroseconds(BIT_DELAY);
}

void sendScannerCmd(byte cmd[], int len) {
    for (int i = 0; i < len; i++) {
        manualWrite(cmd[i]);
        delay(2);
    }
}

// --- Dessins des Pages ---
void drawMenu() {
    tft.fillScreen(0x018C); // Bleu Marine
    tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM);
    tft.drawString(F("PFE - POS SYSTEM"), 160, 100, 4);
    tft.fillRoundRect(40, 200, 240, 80, 15, 0x018C);
    tft.drawRoundRect(40, 200, 240, 80, 15, TFT_WHITE);
    tft.drawString(F("COMMENCER"), 160, 240, 4);
}

void drawChoicePage() {
    tft.fillScreen(TFT_WHITE);
    tft.setTextColor(TFT_RED); tft.setTextDatum(TL_DATUM);
    tft.drawString(F("< ANNULER"), 20, 20, 2);
    
    tft.setTextDatum(MC_DATUM);
    // Zone Payer (120 -> 220)
    tft.fillRoundRect(30, 100, 260, 120, 12, 0x2477); // Bleu PN532
    tft.setTextColor(TFT_WHITE);
    tft.drawString(F("1. PAYER (NFC)"), 160, 160, 4);
    
    // Zone Scanner (280 -> 380)
    tft.fillRoundRect(30, 280, 260, 120, 12, 0x05FF); // Bleu Scanner
    tft.drawString(F("2. SCANNER (CODE)"), 160, 340, 4);
}

void setup() {
    tft.init();
    tft.setRotation(0);
    
    pinMode(PIN_RX, INPUT); pinMode(PIN_TX, OUTPUT); digitalWrite(PIN_TX, HIGH);
    pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW);
    
    // Étape 1 : Calibration (Crucial pour la précision des boutons)
    touch_calibrate();
    
    // Étape 2 : Démarrage des modules (Après calibration pour éviter timeouts)
    tft.fillScreen(TFT_BLACK); tft.setTextColor(TFT_WHITE);
    tft.drawString(F("Connexion au Bridge..."), 160, 240, 2);
    
    Bridge.begin();
    nfc.begin();
    nfc.SAMConfig();
    
    currentPage = 2;
}

void loop() {
    if (lastPage != currentPage) {
        lastPage = currentPage;
        if (currentPage == 2) drawMenu();
        else if (currentPage == 14) drawChoicePage();
    }

    uint16_t tx, ty;
    if (tft.getTouch(&tx, &ty)) {
        // --- Navigation Menu Principal ---
        if (currentPage == 2) {
            if (ty > 180 && ty < 300) { currentPage = 14; delay(200); }
        } 
        // --- Navigation Page de Choix ---
        else if (currentPage == 14) {
            if (ty < 80) { currentPage = 2; delay(200); } // Bouton Annuler
            
            // BOUTON PAYER (NFC UNIQEMENT)
            else if (ty > 100 && ty < 220) {
                currentPage = 16; // Vers Page NFC
                delay(200);
            }
            
            // BOUTON SCANNER (BARCODE UNIQUEMENT)
            else if (ty > 280 && ty < 400) {
                currentPage = 15; // Vers Page Scan
                isBarcodeActive = true;
                sendScannerCmd(startScan, 9); // Allumer Scanner
                delay(200);
            }
        }
        // --- Stop Scanner ---
        else if (currentPage == 15) {
            if (ty > 200) { // Clic n'importe où pour arrêter
                isBarcodeActive = false;
                sendScannerCmd(stopScan, 9); // Éteindre Scanner
                currentPage = 14;
                delay(200);
            }
        }
    }

    // --- LOGIQUE NFC (PAGE 16) ---
    if (currentPage == 16) {
        tft.fillScreen(TFT_BLACK);
        tft.setTextColor(TFT_WHITE); tft.setTextDatum(MC_DATUM);
        tft.drawString(F("PRESENTER CARTE NFC"), 160, 240, 2);
        
        uint8_t uid[] = {0,0,0,0,0,0,0}; uint8_t uidLen;
        if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLen, 1000)) {
            playSound(2000, 150);
            tft.fillScreen(TFT_GREEN);
            tft.drawString(F("PAIEMENT REUSSI"), 160, 240, 4);
            Bridge.call("notify_payment", "Success");
            delay(2000);
            currentPage = 2;
        }
    }

    // --- LOGIQUE BARCODE (PAGE 15) ---
    if (currentPage == 15) {
        tft.fillScreen(TFT_BLACK);
        tft.setTextColor(TFT_ORANGE); tft.setTextDatum(MC_DATUM);
        tft.drawString(F("SCANNER ACTIF..."), 160, 150, 4);
        tft.fillRoundRect(60, 300, 200, 60, 10, TFT_RED);
        tft.setTextColor(TFT_WHITE);
        tft.drawString(F("STOP"), 160, 330, 2);

        while (currentPage == 15) {
            if (digitalRead(PIN_RX) == LOW) { // Donnée reçue ?
                delayMicroseconds(BIT_DELAY + (BIT_DELAY / 2));
                byte r = 0;
                for (int i = 0; i < 8; i++) {
                    if (digitalRead(PIN_RX) == HIGH) r |= (1 << i);
                    delayMicroseconds(BIT_DELAY);
                }
                char c = (char)r;
                if (c == '\r' || c == '\n') {
                    if (barcodeBuffer.length() > 0) {
                        playSound(1000, 100);
                        tft.fillScreen(TFT_GREEN);
                        tft.drawString(barcodeBuffer, 160, 240, 4);
                        Bridge.call("barcode_received", barcodeBuffer);
                        delay(2000);
                        barcodeBuffer = ""; isBarcodeActive = false;
                        currentPage = 2;
                        break;
                    }
                } else if (c >= 32 && c <= 126) barcodeBuffer += c;
            }
            
            // Vérifier si on clique sur STOP
            uint16_t bx, by;
            if (tft.getTouch(&bx, &by)) {
                if (by > 250) {
                    sendScannerCmd(stopScan, 9);
                    currentPage = 14;
                    break;
                }
            }
            Bridge.update();
        }
    }

    Bridge.update();
}
