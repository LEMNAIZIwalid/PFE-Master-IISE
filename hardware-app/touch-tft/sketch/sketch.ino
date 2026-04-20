#include "TFT_eSPI.h"
#include <Adafruit_PN532.h>
#include "Arduino_RouterBridge.h"

// --- MODE ISOLATION TOTALE (Software SPI) ---
// On utilise les pins 3, 4, 5, 6 pour ne JAMAIS toucher aux pins de l'écran.
#define PN532_SCK   6
#define PN532_MISO  3
#define PN532_MOSI  5
#define PN532_SS    4

// Constructeur SPI LOGICIEL (Indépendant des pins 13, 12, 11 de l'écran)
Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
TFT_eSPI tft = TFT_eSPI();

// États de l'application
enum AppState { STATE_HOME, STATE_SCANNING, STATE_RESULT };
AppState currentState = STATE_HOME;

// Données dynamique (Bridge)
String g_timeStr = "00:00";
String g_battStr = "100%";
bool hasNFC = false;

void update_status_cb(String t, String d, String w, String b) {
  g_timeStr = t;
  g_battStr = b;
}

void updateHeader() {
    tft.fillRect(0, 0, 320, 45, (currentState == STATE_HOME) ? TFT_WHITE : TFT_BLACK);
    tft.setTextColor((currentState == STATE_HOME) ? TFT_BLACK : TFT_WHITE);
    tft.setTextDatum(TL_DATUM);
    tft.drawString(g_timeStr, 15, 12, 2);
    tft.setTextDatum(TR_DATUM);
    tft.drawString(g_battStr, 305, 12, 2);
    tft.drawFastHLine(0, 45, 320, TFT_DARKGREY);
}

void drawHomeScreen() {
    tft.fillScreen(TFT_BLACK);
    updateHeader();
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(F("COMMERCE READY (ISOLE)"), 160, 110, 4);
    
    // Bouton SALE
    tft.fillRoundRect(60, 200, 200, 80, 10, TFT_GREEN);
    tft.setTextColor(TFT_BLACK);
    tft.drawString(F("START SALE"), 160, 240, 4);

    if (!hasNFC) {
      tft.setTextColor(TFT_RED);
      tft.drawString(F("NFC NOT DETECTE"), 160, 320, 2);
    }
}

void drawScanningScreen() {
    tft.fillScreen(TFT_BLACK);
    updateHeader();
    tft.setTextColor(TFT_YELLOW);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(F("APPROCHEZ BADGE"), 160, 200, 4);
    
    tft.fillRoundRect(80, 400, 160, 45, 5, TFT_RED);
    tft.setTextColor(TFT_WHITE);
    tft.drawString(F("ANNULER"), 160, 422, 2);
}

void touch_calibrate() {
    uint16_t calData[5];
    tft.fillScreen(TFT_BLACK);
    tft.drawCentreString(F("Calibration..."), 160, 10, 2);
    tft.calibrateTouch(calData, TFT_MAGENTA, TFT_BLACK, 15);
    tft.setTouch(calData);
}

void setup() {
  Serial.begin(115200);
  Bridge.begin();
  Bridge.provide("update_status", update_status_cb);

  tft.init();
  tft.setRotation(0);
  touch_calibrate();
  
  // Initialisation NFC en arrière-plan
  nfc.begin();
  uint32_t versiondata = nfc.getFirmwareVersion();
  if (versiondata) {
    hasNFC = true;
    nfc.SAMConfig();
    nfc.setPassiveActivationRetries(0x32);
  }

  drawHomeScreen();
}

void loop() {
  Bridge.update();
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 2000) {
    updateHeader();
    lastUpdate = millis();
  }

  uint16_t tx = 0, ty = 0;
  bool pressed = tft.getTouch(&tx, &ty);

  switch (currentState) {
    case STATE_HOME:
      if (pressed) {
        if (tx > 60 && tx < 260 && ty > 200 && ty < 280) {
           currentState = STATE_SCANNING;
           drawScanningScreen();
           delay(300);
        }
      }
      break;

    case STATE_SCANNING:
      if (pressed) {
        if (tx > 80 && tx < 240 && ty > 400 && ty < 445) {
           currentState = STATE_HOME;
           drawHomeScreen();
           delay(300);
           break;
        }
      }

      uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
      uint8_t uidLength;
      if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength)) {
          tft.fillScreen(TFT_GREEN);
          tft.setTextColor(TFT_BLACK);
          tft.setTextDatum(MC_DATUM);
          tft.drawString(F("SCAN OK !"), 160, 200, 4);
          
          delay(2000);
          currentState = STATE_HOME;
          drawHomeScreen();
      }
      break;
  }
}