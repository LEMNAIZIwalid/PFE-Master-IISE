#include "Arduino_RouterBridge.h"
#include "TFT_eSPI.h"
#include <Adafruit_PN532.h>

// --- Configuration des Pins ---
#define PN532_SCK 6
#define PN532_MISO 3
#define PN532_MOSI 5
#define PN532_SS A0
#define BUZZER_PIN 4
#define PIN_RX 2    // TX du scanner -> Pin 2
#define PIN_TX A2   // RX du scanner -> Pin A2
#define BIT_DELAY 104 // 9600 baud

// --- Matériel ---
Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
TFT_eSPI tft = TFT_eSPI();

// --- État du Système ---
uint8_t currentPage = 2; // Commencer
uint8_t lastPage = 255;
bool isBarcodeActive = false;
String barcodeBuffer = "";

// Commandes Scanner (Waveshare Standard)
byte startScan[] = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x01, 0xAB, 0xCD};
byte stopScan[] = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x00, 0xAB, 0xCD};

// --- Envoi de commande série manuelle ---
void manualWrite(byte b) {
  noInterrupts();
  digitalWrite(PIN_TX, LOW); // Start bit
  delayMicroseconds(BIT_DELAY);
  for (int i = 0; i < 8; i++) {
    digitalWrite(PIN_TX, (b >> i) & 0x01);
    delayMicroseconds(BIT_DELAY);
  }
  digitalWrite(PIN_TX, HIGH); // Stop bit
  delayMicroseconds(BIT_DELAY);
  interrupts();
}

void sendScannerCmd(byte cmd[], int len) {
  for (int i = 0; i < len; i++) { manualWrite(cmd[i]); delay(5); }
}

// --- Calibration Tactile ---
void touch_calibrate() {
  uint16_t calData[5];
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE);
  tft.drawCentreString("CALIBRATION : TOUCHEZ LES COINS", 160, 240, 2);
  tft.calibrateTouch(calData, TFT_MAGENTA, TFT_BLACK, 15);
  tft.setTouch(calData);
}

void setup() {
  tft.init();
  tft.setRotation(0);
  pinMode(PIN_RX, INPUT_PULLUP);
  pinMode(PIN_TX, OUTPUT);
  digitalWrite(PIN_TX, HIGH);
  pinMode(BUZZER_PIN, OUTPUT);

  touch_calibrate();
  Bridge.begin();
  nfc.begin();
  nfc.SAMConfig();
  currentPage = 2;
}

void drawUI() {
  if (currentPage == lastPage) return;
  lastPage = currentPage;
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE);
  tft.setTextDatum(MC_DATUM);

  if (currentPage == 2) { // ACCUEIL
    tft.fillScreen(0x018C); // Bleu Marine
    tft.drawString("PFE - POS SYSTEM", 160, 100, 4);
    tft.drawRoundRect(40, 200, 240, 80, 15, TFT_WHITE);
    tft.drawString("COMMENCER", 160, 240, 4);
  }
  else if (currentPage == 14) { // MENU CHOIX
    tft.fillScreen(TFT_WHITE);
    tft.setTextColor(TFT_BLACK);
    tft.drawString("< RETOUR", 50, 30, 2);
    
    tft.fillRoundRect(30, 100, 260, 100, 10, 0x2477); // Bouton Payer
    tft.setTextColor(TFT_WHITE);
    tft.drawString("PAYER (NFC)", 160, 150, 4);
    
    tft.fillRoundRect(30, 250, 260, 100, 10, 0x05FF); // Bouton Scanner
    tft.drawString("SCANNER", 160, 300, 4);
  }
  else if (currentPage == 15) { // PAGE SCANNER
    tft.drawString("LECTURE CODE-BARRES", 160, 50, 4);
    tft.fillRoundRect(40, 120, 100, 60, 5, TFT_DARKGREEN);
    tft.drawString("ON", 90, 150, 2);
    tft.fillRoundRect(180, 120, 100, 60, 5, TFT_RED);
    tft.drawString("OFF", 230, 150, 2);
    
    tft.drawString("RESULTAT:", 160, 250, 2);
    tft.drawRect(20, 280, 280, 60, TFT_WHITE);
  }
}

void loop() {
  drawUI();
  uint16_t tx, ty;
  bool touched = tft.getTouch(&tx, &ty);

  if (currentPage == 2) {
    if (touched && ty > 180 && ty < 300) { currentPage = 14; delay(300); }
  }
  else if (currentPage == 14) {
    if (touched) {
      if (ty < 80) { currentPage = 2; delay(300); }
      else if (ty > 100 && ty < 200) { currentPage = 16; delay(300); }
      else if (ty > 250 && ty < 350) { currentPage = 15; delay(300); }
    }
  }
  else if (currentPage == 15) {
    if (touched) {
      if (tx > 40 && tx < 140 && ty > 120 && ty < 180) { // Bouton ON
        tone(BUZZER_PIN, 800, 50);
        isBarcodeActive = true;
        barcodeBuffer = "";
        sendScannerCmd(startScan, 9);
        tft.fillRect(21, 281, 278, 58, TFT_BLACK);
        tft.drawString("SCAN ACTIF...", 160, 310, 2);
        delay(300);
      }
      else if (tx > 180 && tx < 280 && ty > 120 && ty < 180) { // Bouton OFF
        isBarcodeActive = false;
        sendScannerCmd(stopScan, 9);
        currentPage = 14;
        delay(300);
      }
    }

    // --- LOGIQUE DE LECTURE SERIE ---
    if (isBarcodeActive && digitalRead(PIN_RX) == LOW) { 
      // Lecture d'un caractère (9600 baud)
      noInterrupts();
      delayMicroseconds(50); // Attente milieu du start bit
      if (digitalRead(PIN_RX) == LOW) {
        delayMicroseconds(104); // Passer le start bit
        byte r = 0;
        for (int i = 0; i < 8; i++) {
          if (digitalRead(PIN_RX) == HIGH) r |= (1 << i);
          delayMicroseconds(104);
        }
        interrupts();
        
        char c = (char)r;
        if (c >= 32 && c <= 126) { // Caractère lisible
          barcodeBuffer += c;
          tft.fillRect(21, 281, 278, 58, TFT_BLACK);
          tft.setTextColor(TFT_YELLOW);
          tft.drawCentreString(barcodeBuffer, 160, 310, 2);
          tft.setTextColor(TFT_WHITE);
        } 
        else if (c == '\r' || c == '\n') { // Fin du code
          if (barcodeBuffer.length() > 0) {
            tone(BUZZER_PIN, 1200, 100);
            Bridge.call("barcode_received", barcodeBuffer.c_str());
            delay(1000);
            tft.fillRect(21, 281, 278, 58, TFT_BLACK);
            tft.drawCentreString("SCAN REUSSI !", 160, 310, 2);
            barcodeBuffer = "";
          }
        }
      } else {
        interrupts();
      }
    }
  }
  else if (currentPage == 16) { // PAGE NFC
    tft.fillScreen(TFT_BLACK);
    tft.drawCentreString("PRESENTEZ CARTE NFC", 160, 240, 2);
    uint8_t uid[] = {0,0,0,0,0,0,0}; uint8_t uidLen;
    if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLen, 500)) {
       tft.fillScreen(TFT_GREEN); tft.drawCentreString("PAIEMENT REUSSI", 160, 240, 4);
       tone(BUZZER_PIN, 2000, 150);
       Bridge.call("notify_payment", "Success");
       delay(2000); currentPage = 14;
    }
    if (touched && ty < 80) { currentPage = 14; delay(300); }
  }
  Bridge.update();
}
