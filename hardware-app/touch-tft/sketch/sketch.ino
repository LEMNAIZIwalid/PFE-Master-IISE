#include "Arduino_RouterBridge.h"
#include "TFT_eSPI.h"

// --- Configuration des Pins ---
#define BUZZER_PIN 4
#define TOUCH_IRQ_PIN 2

#define PIN_RX A1     // Non utilisée
#define PIN_TX A2     // RX du scanner -> Broche A2 (Utilisée pour envoyer les commandes)
#define BIT_DELAY 104 // 9600 baud

// --- Matériel ---
TFT_eSPI tft = TFT_eSPI();

// --- États du Système ---
#define STATE_IDLE 0
#define STATE_SCANNING 1

uint8_t currentState = STATE_IDLE;
uint8_t lastState = 255;

// Commandes Scanner (Waveshare Standard)
byte startScan[] = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x01, 0xAB, 0xCD};
byte stopScan[] = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x00, 0xAB, 0xCD};

// --- Envoi de commande série par Bit-Banging manuel (SANS SoftwareSerial) ---
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
  for (int i = 0; i < len; i++) {
    manualWrite(cmd[i]);
    delay(5);
  }
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

// --- Signal sonore pour Buzzer ---
void playBuzzer(int freq, int duration) {
  tone(BUZZER_PIN, freq, duration);
}

void setup() {
  tft.init();
  tft.setRotation(0);
  pinMode(PIN_RX, INPUT_PULLUP);
  pinMode(PIN_TX, OUTPUT);
  digitalWrite(PIN_TX, HIGH);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(TOUCH_IRQ_PIN, INPUT_PULLUP);

  // Définir des valeurs de calibrage par défaut stables (évite le calibrage automatique buggé au démarrage)
  uint16_t defaultCalData[5] = { 327, 3511, 335, 3485, 2 };
  tft.setTouch(defaultCalData);
  // Si vous souhaitez refaire un calibrage manuel complet, décommentez la ligne ci-dessous :
  // touch_calibrate();

  // Initialisation du Bridge
  Bridge.begin();

  currentState = STATE_IDLE;
  lastState = 255; // Force le premier dessin de l'interface
}

void drawUI() {
  if (currentState == lastState)
    return;
  lastState = currentState;

  tft.fillScreen(TFT_BLACK);
  
  // Header / Titre POS
  tft.setTextColor(TFT_WHITE);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("PFE - SCAN CONTROL", 160, 40, 4);
  tft.drawFastHLine(20, 70, 280, TFT_WHITE);

  if (currentState == STATE_IDLE) {
    // --- État initial : Bouton SCANNER au centre (Cyan) ---
    tft.fillRoundRect(30, 190, 260, 100, 10, 0x05FF);
    tft.setTextColor(TFT_WHITE);
    tft.drawString("SCANNER", 160, 240, 4);

    tft.setTextColor(TFT_YELLOW);
    tft.drawString("APPUYEZ SUR SCANNER POUR ALLUMER", 160, 360, 2);
  } 
  else if (currentState == STATE_SCANNING) {
    // --- État Scan actif : Le bouton devient CANCEL (Rouge) ---
    tft.fillRoundRect(30, 190, 260, 100, 10, TFT_RED);
    tft.setTextColor(TFT_WHITE);
    tft.drawString("CANCEL", 160, 240, 4);

    tft.setTextColor(TFT_YELLOW);
    tft.drawString("SCANNER ALLUME PAR COMMANDE", 160, 360, 2);
  }
}

void loop() {
  drawUI();
  
  uint16_t tx, ty;
  bool touched = tft.getTouch(&tx, &ty);

  // --- GESTION DES CLICS SELON L'ÉTAT ACTUEL (Hauteur Y uniquement) ---
  if (currentState == STATE_IDLE) {
    // Si on clique sur le bouton central
    if (touched && ty > 170 && ty < 310) {
      playBuzzer(1000, 100);
      
      // Activer physiquement le scanner (startScan) par bit-banging manuel
      sendScannerCmd(startScan, 9);
      
      currentState = STATE_SCANNING;
      lastState = 255;
      delay(300); // Évite les rebonds tactiles
    }
  } 
  else if (currentState == STATE_SCANNING) {
    // Si on clique sur CANCEL
    if (touched && ty > 170 && ty < 310) {
      playBuzzer(800, 150);
      
      // Désactiver physiquement le scanner (stopScan) par bit-banging manuel
      sendScannerCmd(stopScan, 9);
      
      currentState = STATE_IDLE;
      lastState = 255;
      delay(300); // Évite les rebonds tactiles
    }
  }

  Bridge.update();
}
