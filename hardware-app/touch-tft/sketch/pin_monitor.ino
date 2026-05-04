#include "TFT_eSPI.h"

#define PIN_TX 2    // On utilise la Pin 2 pour envoyer l'ordre (vers RX scanner)
#define BUZZER_PIN 10 // On déplace virtuellement le buzzer pour libérer la Pin 4

TFT_eSPI tft = TFT_eSPI();

int pins[] = {4, 3, 5, 6, A1, A3}; 
String pinNames[] = {"D4 (DATA SCANNER)", "D3", "D5", "D6", "A1", "A3"};
bool lastStates[6];

void setup() {
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(TFT_BLACK);
  
  for(int i=0; i<6; i++) {
    pinMode(pins[i], INPUT_PULLUP);
    lastStates[i] = HIGH;
  }
  
  pinMode(PIN_TX, OUTPUT);
  digitalWrite(PIN_TX, HIGH);

  tft.setTextColor(TFT_WHITE);
  tft.drawCentreString("TEST : DATA SUR PIN 4", 160, 30, 2);
}

void loop() {
  for(int i=0; i<6; i++) {
    bool state = digitalRead(pins[i]);
    
    tft.fillRect(40, 60 + (i*45), 240, 40, state ? TFT_DARKGREEN : TFT_RED);
    tft.setTextColor(TFT_WHITE);
    tft.drawString(pinNames[i] + (state ? " : REPOS" : " : SIGNAL RECUEIL !"), 50, 72 + (i*45), 2);

    if (state == LOW && lastStates[i] == HIGH) {
      // Un signal a été détecté !
      tft.fillCircle(20, 80 + (i*45), 10, TFT_YELLOW);
    } else if (state == HIGH) {
      tft.fillCircle(20, 80 + (i*45), 10, TFT_BLACK);
    }
    lastStates[i] = state;
  }

  // Touchez l'écran pour allumer le laser (Envoie l'ordre par la PIN 2)
  uint16_t tx, ty;
  if (tft.getTouch(&tx, &ty)) {
    byte cmd[] = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x01, 0xAB, 0xCD};
    for (int k = 0; k < 9; k++) {
      digitalWrite(PIN_TX, LOW); delayMicroseconds(104);
      for (int b = 0; b < 8; b++) { digitalWrite(PIN_TX, (cmd[k] >> b) & 0x01); delayMicroseconds(104); }
      digitalWrite(PIN_TX, HIGH); delayMicroseconds(104);
      delay(5);
    }
    tft.setTextColor(TFT_MAGENTA);
    tft.drawString("ORDRE ENVOYE SUR PIN 2", 160, 340, 2);
    delay(200);
  }
}
