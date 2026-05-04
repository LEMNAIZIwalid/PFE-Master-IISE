#include "TFT_eSPI.h"

#define PIN_RX 2    // Fil TX du scanner
#define PIN_TX A2   // Fil RX du scanner
#define BUZZER_PIN 4

TFT_eSPI tft = TFT_eSPI();

unsigned long lastTransition = 0;
unsigned long pulseWidths[10];
int pulseIdx = 0;
bool lastState = HIGH;

void setup() {
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(TFT_BLACK);
  
  pinMode(PIN_RX, INPUT_PULLUP);
  pinMode(PIN_TX, OUTPUT);
  digitalWrite(PIN_TX, HIGH);
  pinMode(BUZZER_PIN, OUTPUT);

  tft.setTextColor(TFT_WHITE);
  tft.drawCentreString("ANALYSEUR DE SIGNAL SCANNER", 160, 30, 2);
  tft.drawString("Vitesse attendue (9600): 104us", 20, 60, 2);
  
  tft.drawRect(10, 100, 300, 50, TFT_WHITE); // Zone Oscilloscope
  tft.drawString("SIGNAL BRUT:", 10, 85, 2);
  
  tft.drawString("DERNIERES DUREES (us):", 10, 170, 2);
}

void loop() {
  bool currentState = digitalRead(PIN_RX);
  unsigned long now = micros();

  // 1. Dessiner le signal en temps réel (Oscilloscope)
  static int x = 11;
  tft.drawLine(x, 110, x, 140, TFT_BLACK); // Effacer
  tft.drawPixel(x, currentState ? 115 : 135, TFT_YELLOW);
  x++; if (x > 308) x = 11;

  // 2. Mesurer la durée des impulsions
  if (currentState != lastState) {
    unsigned long duration = now - lastTransition;
    lastTransition = now;
    lastState = currentState;

    if (duration > 10) { // Ignorer les micro-parasites
      pulseWidths[pulseIdx] = duration;
      pulseIdx = (pulseIdx + 1) % 10;
      
      // Bip très court pour chaque impulsion
      tone(BUZZER_PIN, 2000, 2);

      // Afficher les durées sur l'écran
      tft.fillRect(10, 190, 300, 150, TFT_BLACK);
      for (int i = 0; i < 10; i++) {
        int yPos = 190 + (i * 15);
        if (pulseWidths[i] > 0) {
          tft.setTextColor(TFT_CYAN);
          tft.drawString("Pulse " + String(i) + ": " + String(pulseWidths[i]) + " us", 20, yPos, 2);
          
          // Diagnostic automatique
          if (pulseWidths[i] > 95 && pulseWidths[i] < 115) {
            tft.setTextColor(TFT_GREEN);
            tft.drawString("-> OK (1 bit 9600)", 180, yPos, 2);
          }
        }
      }
    }
  }

  // 3. Bouton test pour allumer le laser (touchez l'écran n'importe où)
  uint16_t tx, ty;
  if (tft.getTouch(&tx, &ty)) {
    // Commande de déclenchement simplifiée
    byte cmd[] = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x01, 0xAB, 0xCD};
    for (int i = 0; i < 9; i++) {
      // Bit-banging ultra-simplifié pour le test
      digitalWrite(PIN_TX, LOW); delayMicroseconds(104);
      for (int b = 0; b < 8; b++) {
        digitalWrite(PIN_TX, (cmd[i] >> b) & 0x01);
        delayMicroseconds(104);
      }
      digitalWrite(PIN_TX, HIGH); delayMicroseconds(104);
      delay(5);
    }
    tft.setTextColor(TFT_MAGENTA);
    tft.drawString("LASER ON SENT", 200, 60, 2);
    delay(500);
  }
}
