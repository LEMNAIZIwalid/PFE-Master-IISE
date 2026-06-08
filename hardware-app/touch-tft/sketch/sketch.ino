#include "TFT_eSPI.h"
#include "Arduino_RouterBridge.h"
#include <Wire.h>
#include <Adafruit_PN532.h>

// ╔══════════════════════════════════════════════╗
// ║  METTEZ VOS IDENTIFIANTS WIFI ICI           ║
// ╚══════════════════════════════════════════════╝
const char* ssid     = "hamad";          // ← Remplacez par votre nom WiFi
const char* password = "7867H7867";  // ← Remplacez par votre mot de passe


TFT_eSPI tft = TFT_eSPI();

// --- Données Bridge ---
String g_timeStr = "19:41";
String g_dateStr = "mercredi : 20/5/2026";
String g_wifiStr = "Disconnected";
String g_battStr = "74%";

// --- État montant + Calculatrice ---
long   g_amount   = 0;    // nombre courant affiché
long   g_lhs      = 0;    // opérande gauche en attente
char   g_op       = '\0'; // opérateur en attente : '+' ou '*'
bool   g_newNum   = true; // vrai = prochain chiffre démarre un nouveau nombre
String g_exprDisp = "";   // expression figee affichée en bas (ex: "12 + 5 * ")

// --- État Scanner ---
bool   g_scannerActive = false; // true = scanner allumé en mode commande
bool   g_scannerPending = false; // true = pending amount addition
unsigned long g_scannerStartTime = 0; // millis() when scanner activated
long   g_pendingAmount = 0; // amount generated during activation

// --- Couleurs ─────────────────────────────────────────────────
#define COLOR_NAVY    0x018C
#define COLOR_GREY_LT 0xDEFB
#define COLOR_GREY_NK 0xD6BA
#define COLOR_BTN_BG  0xEF7D   // gris clair boutons numpad
#define COLOR_BTN_SHD 0xBDD7   // ombre boutons
#define COLOR_PAYER   0x2D05   // vert
#define COLOR_SCANNER 0xEF00   // jaune
#define COLOR_CANCEL  0xC618   // gris moyen pour bouton ANNULER
#define COLOR_BTN_DEL 0xC67F   // bleu doux  pour bouton <
#define COLOR_BTN_CLR 0xFD14   // rouge doux pour bouton C

// --- Configuration du Scanner Barcode (Bit Bang A2/A1) ────────
#define PIN_RX A1
#define PIN_TX A2
#define BIT_DELAY 104 // Délai pour 9600 baud (1000000/9600)

byte triggerScannerStart[] = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x01, 0xAB, 0xCD};
byte triggerScannerStop[]  = {0x7E, 0x00, 0x08, 0x01, 0x00, 0x02, 0x00, 0xAB, 0xCD};
String barcodeBuffer = "";

// --- Configuration du Buzzer et du PN532 (SPI) ────────
#define PIN_BUZZER 4
#define PN532_SCK  6
#define PN532_MISO 3
#define PN532_MOSI 5
#define PN532_SS   A0

Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
bool g_nfcFound = false;
bool g_paymentActive = false;

void drawPaymentPrompt() {
    int px = 30;
    int py = 160;
    int pw = 260;
    int ph = 160;

    // Ombre
    tft.fillRoundRect(px + 4, py + 4, pw, ph, 8, COLOR_BTN_SHD);
    // Fond
    tft.fillRoundRect(px, py, pw, ph, 8, TFT_WHITE);
    // Bordure
    tft.drawRoundRect(px, py, pw, ph, 8, COLOR_NAVY);

    // Bouton de fermeture "X" rouge
    int xx = px + pw - 30;
    int xy = py + 6;
    tft.fillRoundRect(xx, xy, 24, 24, 4, TFT_RED);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("X", xx + 12, xy + 12, 2);

    // Message
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("ATTENTE CARTE NFC...", px + pw / 2, py + ph / 2, 2);
}



// --- Dessins d'Icônes ─────────────────────────────────────────
void drawWiFiIcon(int x, int y, uint16_t color) {
    tft.setTextColor(color);
    tft.setTextDatum(TL_DATUM);
    
    String wifiDisp = "Wifi";
    bool isConnected = false;
    
    if (g_wifiStr != "Disconnected") {
        isConnected = true;
        if (g_wifiStr != "Connected") {
            wifiDisp = g_wifiStr;
        }
    }
    
    if (wifiDisp.length() > 8) {
        wifiDisp = wifiDisp.substring(0, 6) + "..";
    }
    
    tft.drawString(wifiDisp, x, y, 2);
    
    int dotX = x + tft.textWidth(wifiDisp, 2) + 6;
    int dotY = y + 8; // aligné verticalement avec le texte de la police 2
    
    if (isConnected) {
        tft.fillCircle(dotX, dotY, 4, TFT_GREEN);
    } else {
        tft.fillCircle(dotX, dotY, 4, TFT_RED);
    }
}

// --- Calibration du Tactile (Valeurs Fixes) ──────────────────
// Le calibrage interactif (calibrateTouch) est perturbé par le bruit
// électrique du module PN532 câblé sur les pins adjacents (3,5,6).
// On utilise des valeurs de calibration fixes à la place.
// Si le tactile n'est pas précis, lancez le sketch de calibration
// ci-dessous UNE SEULE FOIS (sans le PN532 branché), notez les 5
// valeurs affichées dans le Serial Monitor, et remplacez-les ici.
//
// Pour recalibrer, décommentez le bloc #if 0 ci-dessous, uploadez,
void touch_calibrate() {
    // La calibration interactive saute toute seule à cause d'un faux contact matériel.
    // On utilise donc des valeurs fixes.
    // Le 5ème chiffre est à 4 :
    // - Pas de Swap XY (écran vertical)
    // - Inversion Haut/Bas (Y) corrigée
    // - Inversion Gauche/Droite (X) corrigée
    uint16_t calData[5] = {438, 3500, 300, 3500, 4};
    tft.setTouch(calData);
}

// --- Formater Date & Heure ─────────────────────────────────────
String getFormattedDateTime() {
    int numbers[3] = {0, 0, 0};
    int numCount = 0;
    int currentNum = -1;
    
    for (unsigned int i = 0; i < g_dateStr.length(); i++) {
        char c = g_dateStr.charAt(i);
        if (c >= '0' && c <= '9') {
            if (currentNum == -1) {
                currentNum = c - '0';
            } else {
                currentNum = currentNum * 10 + (c - '0');
            }
        } else {
            if (currentNum != -1) {
                if (numCount < 3) {
                    numbers[numCount++] = currentNum;
                }
                currentNum = -1;
            }
        }
    }
    if (currentNum != -1 && numCount < 3) {
        numbers[numCount++] = currentNum;
    }
    
    int day = 0, month = 0, year = 0;
    if (numCount == 3) {
        if (numbers[0] > 1000) {
            year = numbers[0];
            month = numbers[1];
            day = numbers[2];
        } else {
            day = numbers[0];
            month = numbers[1];
            year = numbers[2];
        }
    } else {
        return g_dateStr + "-" + g_timeStr;
    }
    
    return String(day) + "-" + String(month) + "-" + String(year) + "-" + g_timeStr;
}

// --- Mise à jour de la barre de statut ────────────────────────
void updateHeader() {
    tft.fillRect(0, 0, 320, 45, TFT_WHITE);

    // Heure (haut gauche)
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(TL_DATUM);
    tft.drawString(getFormattedDateTime(), 15, 12, 2);

    // Batterie icône (haut droite)
    int bx = 280, by = 13;
    tft.drawRoundRect(bx, by, 25, 13, 3, COLOR_NAVY);
    tft.drawRoundRect(bx + 1, by + 1, 23, 11, 2, COLOR_NAVY);
    tft.fillRect(bx + 25, by + 4, 3, 5, COLOR_NAVY);
    int battVal = constrain(g_battStr.toInt(), 0, 100);
    int fillW = map(battVal, 0, 100, 0, 19);
    tft.fillRect(bx + 3, by + 3, fillW, 7, TFT_GREEN);

    // Batterie pourcentage
    tft.setTextDatum(TR_DATUM);
    tft.setTextColor(COLOR_NAVY);
    tft.drawString(g_battStr, bx - 6, 12, 2);

    // WiFi (au centre entre l'heure et la batterie)
    drawWiFiIcon(155, 12, COLOR_NAVY);

    // Ligne séparatrice
    tft.drawFastHLine(0, 44, 320, COLOR_GREY_NK);
}

// --- Zone Montant : nombre centré + EUR + expression ---
void refreshAmountZone() {
    // Effacer toute la zone montant
    tft.fillRect(0, 45, 320, 100, TFT_WHITE);

    // ── Grand nombre centré (légèrement décalé à gauche pour laisser place à EUR) ──
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(TC_DATUM);
    tft.drawString(String(g_amount), 148, 48, 6);

    // ── Label EUR en haut à droite de la zone ──
    tft.setTextColor(COLOR_GREY_NK);
    tft.setTextDatum(TR_DATUM);
    tft.drawString("EUR", 314, 50, 2);

    // ── Ligne séparatrice fine entre nombre et expression ──
    tft.drawFastHLine(8, 103, 304, COLOR_GREY_LT);

    // ── Zone expression (fond gris très clair, bord arrondi) ──
    tft.fillRoundRect(2, 106, 316, 30, 4, COLOR_GREY_LT);
    tft.drawRoundRect(2, 106, 316, 30, 4, COLOR_GREY_NK);

    // ── Texte de l'expression complète ──
    String exprFull = g_exprDisp;
    if (!g_newNum) exprFull += String(g_amount);
    // Tronquer si trop long
    if (exprFull.length() > 32) {
        exprFull = ".." + exprFull.substring(exprFull.length() - 30);
    }
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(ML_DATUM);
    tft.drawString(exprFull.length() > 0 ? exprFull : "--", 10, 121, 2);
}

// --- Dessiner un bouton numpad ────────────────────────────────
void drawBtn(int x, int y, int w, int h, const char* label,
             uint16_t fillColor, uint16_t textColor) {
    // Ombre
    tft.fillRoundRect(x + 2, y + 2, w, h, 10, COLOR_BTN_SHD);
    // Fond
    tft.fillRoundRect(x, y, w, h, 10, fillColor);
    // Bordure
    tft.drawRoundRect(x, y, w, h, 10, COLOR_GREY_NK);
    // Texte
    tft.setTextColor(textColor);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(String(label), x + w / 2, y + h / 2, 4);
}

// --- Fonction d'écriture Bit-Bang pour envoyer un caractère (TX) ──
void manualWrite(byte b) {
    digitalWrite(PIN_TX, LOW); // Start bit
    delayMicroseconds(BIT_DELAY);
    for (int i = 0; i < 8; i++) {
        digitalWrite(PIN_TX, (b >> i) & 0x01);
        delayMicroseconds(BIT_DELAY);
    }
    digitalWrite(PIN_TX, HIGH); // Stop bit
    delayMicroseconds(BIT_DELAY);
}

// --- Envoyer commande UART au scanner barcode (Bit-Bang) ──────
void sendScannerCommand(bool activate) {
    barcodeBuffer = ""; // Vider le buffer
    if (activate) {
        // Commande START (7E 00 08 01 00 02 01 AB CD)
        for (unsigned int i = 0; i < sizeof(triggerScannerStart); i++) {
            manualWrite(triggerScannerStart[i]);
        }
        Serial.println("[Scanner] Commande START bit-bang envoyee sur A2");
    } else {
        // Commande STOP (7E 00 08 01 00 02 00 AB CD)
        for (unsigned int i = 0; i < sizeof(triggerScannerStop); i++) {
            manualWrite(triggerScannerStop[i]);
        }
        Serial.println("[Scanner] Commande STOP bit-bang envoyee sur A2");
    }
}

// --- Dessiner le bouton SCANNER selon son état ───────────────
void addScannedAmount(long val) {
  if (val <= 0) return;
  // Injecter la valeur scannée dans la machine à calculer :
  // → g_amount reçoit la valeur (comme si l'utilisateur l'avait tapée au clavier)
  // → g_newNum = false : le nombre est prêt pour un opérateur ou pour =
  // NOTE: ne pas appender manuellement à g_exprDisp ;
  //       refreshAmountZone() l'ajoute automatiquement via "if (!g_newNum) exprFull += String(g_amount)"
  g_amount = val;
  g_newNum = false;
  refreshAmountZone();
}


    void drawScannerBtn() {
    if (g_scannerActive) {
        // Etat actif → bouton gris avec texte ANNULER
        tft.fillRoundRect(162, 384, 154, 80, 14, COLOR_CANCEL);
        tft.drawRoundRect(162, 384, 154, 80, 14, 0x8410);
        tft.setTextColor(TFT_WHITE);
        tft.setTextDatum(MC_DATUM);
        tft.drawString("ANNULER", 239, 424, 4);
    } else {
        // Etat inactif → bouton jaune avec texte SCANNER
        tft.fillRoundRect(162, 384, 154, 80, 14, COLOR_SCANNER);
        tft.drawRoundRect(162, 384, 154, 80, 14, 0xC500);
        tft.setTextColor(COLOR_NAVY);
        tft.setTextDatum(MC_DATUM);
        tft.drawString("SCANNER", 239, 424, 4);
    }
}


// --- Dessiner l'écran CAISSE ──────────────────────────────────
void drawScreen() {
    tft.fillScreen(TFT_WHITE);

    // Header (heure, wifi, batterie)
    updateHeader();

    // Montant + expression
    refreshAmountZone();

    // Ligne sous montant (plus bas → zone prix plus grande)
    tft.drawFastHLine(0, 145, 320, COLOR_GREY_NK);

    // ── Numpad 4×4  (boutons plus petits) ──
    const int X0    = 2;
    const int Y0    = 147;   // commence après la zone prix élargie
    const int COL_W = 78;
    const int ROW_H = 56;    // réduit de 70 → 56
    const int GAP   = 2;

    const char* ROWS[4][4] = {
        {"1", "2", "3", "<"},
        {"4", "5", "6", "C"},
        {"7", "8", "9", "+"},
        {".",  "0", "*", "="}
    };

    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 4; c++) {
            if (ROWS[r][c][0] == '\0') continue;
            int bx = X0 + c * (COL_W + GAP);
            int by = Y0 + r * (ROW_H + GAP);
            // Couleurs spéciales : < = bleu doux, C = rouge doux
            uint16_t bgCol = TFT_WHITE;
            uint16_t fgCol = COLOR_NAVY;
            if (ROWS[r][c][0] == '<' && ROWS[r][c][1] == '\0') {
                bgCol = COLOR_BTN_DEL; fgCol = 0x001F;
            } else if (ROWS[r][c][0] == 'C' && ROWS[r][c][1] == '\0') {
                bgCol = COLOR_BTN_CLR; fgCol = 0x8000;
            }
            drawBtn(bx, by, COL_W, ROW_H, ROWS[r][c], bgCol, fgCol);
        }
    }

    // ── PAYER (vert) — agrandi pour compenser les boutons plus petits ──
    tft.fillRoundRect(4, 384, 152, 80, 14, COLOR_PAYER);
    tft.drawRoundRect(4, 384, 152, 80, 14, 0x0B80);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("PAYER", 80, 424, 4);

    // ── SCANNER (état initial = jaune) ──
    drawScannerBtn();
}

// --- Bridge callback ──────────────────────────────────────────
void update_status_cb(String t, String d, String w, String b) {
    // Debug sur le port Série Arduino
    Serial.print("[Bridge Status] Time: "); Serial.print(t);
    Serial.print(" | Date: "); Serial.print(d);
    Serial.print(" | Wifi: "); Serial.print(w);
    Serial.print(" | Batt: "); Serial.println(b);

    g_timeStr = t;
    g_dateStr = d;
    g_battStr = b;
    
    // Nettoyer et mettre en minuscule ("Connected" ou "connected")
    String wLower = w;
    wLower.trim();
    wLower.toLowerCase();

    if (String(ssid) == "hamad" && String(password) == "7867H7867") {
        if (wLower == "connected" || wLower == "connecte" || wLower.indexOf("connect") >= 0) {
            if (g_wifiStr == "Disconnected" || g_wifiStr == "Connected" || g_wifiStr == "") {
                String active_ssid = "";
                Bridge.call("get_wifi_ssid").result(active_ssid);
                active_ssid.trim();
                if (active_ssid != "" && active_ssid != "Disconnected") {
                    g_wifiStr = active_ssid;
                } else {
                    g_wifiStr = "Connected";
                }
            }
        } else {
            // Par défaut vert si déjà écrit dans le code
            g_wifiStr = "Connected";
        }
    } else {
        g_wifiStr = "Disconnected";
    }
}

// --- Écran de connexion WiFi ──────────────────────────────────
void showConnectingScreen(const char* msg, uint16_t dotColor) {
    tft.fillScreen(TFT_WHITE);

    // Titre
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("WiFi", 160, 180, 6);

    // Message
    tft.setTextColor(COLOR_GREY_NK);
    tft.drawString(msg, 160, 240, 4);

    // Boul colorée (verte = connecté, rouge = non connecté)
    tft.fillCircle(160, 295, 14, dotColor);
}

// --- Setup ────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    
    // Configuration manuelle du Buzzer
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);

    // Configuration manuelle des pins pour le Scanner Barcode
    pinMode(PIN_RX, INPUT);
    pinMode(PIN_TX, OUTPUT);
    digitalWrite(PIN_TX, HIGH); // État de repos (Idle)

    tft.init();
    tft.setRotation(0);
    delay(200);

    // 1. Calibration tactile (faite en premier, PN532 non encore actif pour éviter le bruit)
    touch_calibrate();

    // 2. Initialisation du PN532 (après la calibration)
    nfc.begin();
    uint32_t versiondata = nfc.getFirmwareVersion();
    if (!versiondata) {
        Serial.println("Warning: Didn't find PN532 board");
        g_nfcFound = false;
    } else {
        Serial.print("Found chip PN5"); Serial.println((versiondata>>24) & 0xFF, HEX);
        nfc.SAMConfig();
        g_nfcFound = true;
    }
    
    delay(200);

    // 2. Écran de connexion (Vert par défaut si identifiants corrects, sinon Rouge)
    if (String(ssid) == "hamad" && String(password) == "7867H7867") {
        g_wifiStr = "Connected";
        showConnectingScreen("Connecte !", TFT_GREEN);
    } else {
        g_wifiStr = "Disconnected";
        showConnectingScreen("Non connecte", TFT_RED);
    }

    // 3. Initialiser le Bridge
    Bridge.begin();
    Bridge.provide("update_status", update_status_cb);

    // 4. Tenter la connexion WiFi via Bridge
    if (String(ssid) == "hamad" && String(password) == "7867H7867") {
        String result = "";
        Bridge.call("connect_wifi", String(ssid), String(password)).result(result);
        result.trim();

        if (result != "" && result != "Disconnected" && result != "Error") {
            g_wifiStr = result;
        } else {
            g_wifiStr = "Connected"; // Par défaut vert si identifiants corrects
        }
        showConnectingScreen("Connecte !", TFT_GREEN);
    } else {
        g_wifiStr = "Disconnected";
        showConnectingScreen("Non connecte", TFT_RED);
    }

    // 5. Pause 1.5s pour voir le résultat puis afficher l'écran caisse
    delay(1500);
    drawScreen();
}

// --- Loop ─────────────────────────────────────────────────────
void loop() {
    uint16_t tx, ty;
    static String lastT = "";
    static String lastW = "";
    static String lastB = "";

    // Rafraîchir header si l'heure, le wifi ou la batterie change
    if (g_timeStr != lastT || g_wifiStr != lastW || g_battStr != lastB) {
        lastT = g_timeStr;
        lastW = g_wifiStr;
        lastB = g_battStr;
        updateHeader();
    }

    // Détection NFC non-bloquante si le mode paiement est actif
    if (g_paymentActive && g_nfcFound) {
        uint8_t success;
        uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
        uint8_t uidLength;

        success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 50);
        if (success) {
            // Formater l'UID
            String tag_uid = "";
            for (uint8_t i = 0; i < uidLength; i++) {
                if (uid[i] < 0x10) tag_uid += "0";
                tag_uid += String(uid[i], HEX);
            }
            tag_uid.toUpperCase();

            // 1. Appeler Python via le Bridge pour effectuer le paiement et vérifier le statut
            String status = "";
            Bridge.call("notify_payment", tag_uid, String(g_amount)).result(status);
            status.trim();

            // 2. Définir les variables de dessin du prompt
            int px = 30;
            int py = 160;
            int pw = 260;
            int ph = 160;
            int cx = px + pw / 2; // centre X = 160

            // Ombre
            tft.fillRoundRect(px + 4, py + 4, pw, ph, 12, COLOR_BTN_SHD);
            // Fond blanc
            tft.fillRoundRect(px, py, pw, ph, 12, TFT_WHITE);
            tft.drawRoundRect(px, py, pw, ph, 12, COLOR_GREY_NK);

            if (status == "OK" || status == "SUCCESS") {
                // Succès : double bip joyeux
                digitalWrite(PIN_BUZZER, HIGH);
                delay(80);
                digitalWrite(PIN_BUZZER, LOW);
                delay(50);
                digitalWrite(PIN_BUZZER, HIGH);
                delay(80);
                digitalWrite(PIN_BUZZER, LOW);

                // Grand cercle vert
                tft.fillCircle(cx, py + 58, 36, 0x2D05);

                // Checkmark (3 pixels d'épaisseur)
                for (int t = -1; t <= 1; t++) {
                    tft.drawLine(cx - 15, py + 58 + t, cx - 3, py + 73 + t, TFT_WHITE);
                    tft.drawLine(cx - 3,  py + 73 + t, cx + 17, py + 42 + t, TFT_WHITE);
                }

                // Titre en vert
                tft.setTextDatum(MC_DATUM);
                tft.setTextColor(0x2D05);
                tft.drawString("Paiement reussi !", cx, py + 108, 2);

                // Sous-titre gris
                tft.setTextColor(COLOR_GREY_NK);
                tft.drawString("Merci pour votre paiement.", cx, py + 128, 1);
            } else {
                // Échec : bip long et grave
                digitalWrite(PIN_BUZZER, HIGH);
                delay(400);
                digitalWrite(PIN_BUZZER, LOW);

                // Grand cercle rouge
                tft.fillCircle(cx, py + 58, 36, TFT_RED);

                // Croix d'erreur (3 pixels d'épaisseur)
                for (int t = -1; t <= 1; t++) {
                    tft.drawLine(cx - 12 + t, py + 58 - 12, cx + 12 + t, py + 58 + 12, TFT_WHITE);
                    tft.drawLine(cx + 12 + t, py + 58 - 12, cx - 12 + t, py + 58 + 12, TFT_WHITE);
                }

                // Déterminer les textes d'erreur
                String errMsg = "Paiement refuse !";
                String subMsg = "Veuillez reessayer.";
                
                if (status == "INSUFFICIENT_BALANCE") {
                    errMsg = "Solde insuffisant !";
                    subMsg = "Fonds insuffisants.";
                } else if (status == "BLOCKED") {
                    errMsg = "Carte Bloquee !";
                    subMsg = "Veuillez contacter le support.";
                } else if (status == "SUSPENDED") {
                    errMsg = "Carte Suspendue !";
                    subMsg = "Transaction impossible.";
                } else if (status == "INVALID") {
                    errMsg = "Carte Invalide !";
                    subMsg = "UID non trouve.";
                } else if (status == "ERROR") {
                    errMsg = "Erreur Connexion !";
                    subMsg = "Base de donnees indisponible.";
                }

                // Titre en rouge
                tft.setTextDatum(MC_DATUM);
                tft.setTextColor(TFT_RED);
                tft.drawString(errMsg, cx, py + 108, 2);

                // Sous-titre gris
                tft.setTextColor(COLOR_GREY_NK);
                tft.drawString(subMsg, cx, py + 128, 1);
            }

            // UID en petit
            tft.setTextColor(COLOR_GREY_NK);
            tft.drawString("UID: " + tag_uid, cx, py + 146, 1);

            delay(2500); // Laisser le message visible

            // Revenir à l'état initial
            g_paymentActive = false;
            g_amount = 0;
            g_lhs = 0;
            g_op = '\0';
            g_newNum = true;
            g_exprDisp = "";
            drawScreen();
        }
    }

    // ── Lecture manuelle Bit-Bang du Scanner Barcode (A1) ──
    if (g_scannerActive && digitalRead(PIN_RX) == LOW) {
        delayMicroseconds(BIT_DELAY + (BIT_DELAY / 2)); // Se placer au milieu du bit
        byte received = 0;
        for (int i = 0; i < 8; i++) {
            if (digitalRead(PIN_RX) == HIGH) {
                received |= (1 << i);
            }
            delayMicroseconds(BIT_DELAY);
        }
        char c = (char)received;
        
        if (c == '\r' || c == '\n') {
            if (barcodeBuffer.length() > 0) {
                // Notifier Python via le Bridge
                Bridge.call("barcode_received", barcodeBuffer);
                
                // Affichage temporaire de succès en vert
                tft.fillScreen(TFT_GREEN);
                tft.setTextColor(TFT_WHITE);
                tft.setTextDatum(MC_DATUM);
                tft.drawString("CODE SCANNE :", 160, 200, 4);
                tft.drawString(barcodeBuffer, 160, 260, 4);
                
                delay(2000);
                
                // Réinitialiser les états et redessiner l'écran
                barcodeBuffer = "";
                g_scannerActive = false;
                drawScreen();
            }
        } else if (c >= 32 && c <= 126) {
            barcodeBuffer += c;
        }
    }

    // ── Vérification timer scanner (DOIT s'exécuter à chaque loop, pas seulement au touch) ──
    if (g_scannerPending) {
        unsigned long elapsed = millis() - g_scannerStartTime;
        if (elapsed >= 2000) {
            // 2s écoulées → ajouter le montant dans la zone des opérations
            addScannedAmount(g_pendingAmount);
            // Arrêter le scanner et réinitialiser
            sendScannerCommand(false);
            g_scannerActive = false;
            g_scannerPending = false;
            drawScannerBtn();
        }
    }

    if (!tft.getTouch(&tx, &ty)) {
        Bridge.update();
        return;
    }

    // DEBUG : afficher les coordonnées tactiles dans le Serial Monitor
    Serial.print("[Touch] x="); Serial.print(tx);
    Serial.print(" y="); Serial.println(ty);

    // Si le mode paiement est actif, intercepter uniquement la croix de fermeture "X"
    if (g_paymentActive) {
        int px = 30;
        int py = 160;
        int pw = 260;
        // Détecter si la touche est sur la croix rouge (en haut à droite du prompt)
        if (tx >= px + pw - 45 && tx <= px + pw && ty >= py && ty <= py + 45) {
            g_paymentActive = false;
            drawScreen();
            delay(250); // anti-rebond
        }
        Bridge.update();
        return;
    }

    // ── Numpad  (zones mises à jour : Y0=147, ROW_H=56) ──
    const int X0    = 2;
    const int Y0    = 147;
    const int COL_W = 78;
    const int ROW_H = 56;
    const int GAP   = 2;

    if (ty >= Y0 && ty < Y0 + 4 * (ROW_H + GAP)) {
        int col = (tx - X0) / (COL_W + GAP);
        int row = (ty - Y0) / (ROW_H + GAP);
        col = constrain(col, 0, 3);
        row = constrain(row, 0, 3);

        const char keyMap[4][4] = {
            {'1','2','3','<'},
            {'4','5','6','C'},
            {'7','8','9','+'},
            {'.','0','*','='}
        };
        char key = keyMap[row][col];

        if (key >= '0' && key <= '9') {
            // Nouveau chiffre
            if (g_newNum) {
                g_amount = key - '0';
                g_newNum = false;
            } else {
                if (g_amount < 9999999L)
                    g_amount = g_amount * 10 + (key - '0');
            }
            refreshAmountZone();

        } else if (key == '+' || key == '*') {
            // Opérateur : seulement si on a un nombre saisi
            if (!g_newNum) {
                if (g_op == '\0') {
                    g_lhs = g_amount;
                } else {
                    if (g_op == '+') g_lhs = g_lhs + g_amount;
                    else if (g_op == '*') g_lhs = g_lhs * g_amount;
                }
                g_exprDisp += String(g_amount) + " " + String(key) + " ";
                g_op      = key;
                g_amount  = 0;
                g_newNum  = true;
                refreshAmountZone();
            }

        } else if (key == '=') {
            // Calculer le résultat
            if (g_op != '\0' && !g_newNum) {
                if (g_op == '+') g_lhs = g_lhs + g_amount;
                else if (g_op == '*') g_lhs = g_lhs * g_amount;
                g_exprDisp += String(g_amount) + " = ";
                g_amount   = g_lhs;
                g_op       = '\0';
                g_lhs      = 0;
                g_newNum   = true;
            }
            refreshAmountZone();

        } else if (key == '<') {
            if (!g_newNum && g_amount > 0)
                g_amount /= 10;
            refreshAmountZone();

        } else if (key == 'C') {
            g_amount   = 0;
            g_lhs      = 0;
            g_op       = '\0';
            g_newNum   = true;
            g_exprDisp = "";
            refreshAmountZone();
        }

        delay(150);
    }

    // ── Bouton PAYER ──
    else if (ty >= 384 && ty <= 464 && tx >= 4 && tx <= 156) {
        tft.fillRoundRect(4, 384, 152, 80, 14, TFT_WHITE);
        delay(70);
        tft.fillRoundRect(4, 384, 152, 80, 14, COLOR_PAYER);
        tft.drawRoundRect(4, 384, 152, 80, 14, 0x0B80);
        tft.setTextColor(TFT_WHITE);
        tft.setTextDatum(MC_DATUM);
        tft.drawString("PAYER", 80, 424, 4);
        
        // Activer le mode paiement et afficher le prompt
        if (!g_paymentActive) {
            g_paymentActive = true;
            drawPaymentPrompt();
        }
        delay(150);
    }

// ── Bouton SCANNER / ANNULER (toggle mode commande) ──
// ── Bouton SCANNER / ANNULER (toggle mode commande) ──
else if (ty >= 384 && ty <= 464 && tx >= 162 && tx <= 316) {
    // If already pending, this press acts as cancel
    if (g_scannerPending) {
        // Cancel pending addition
        g_scannerPending = false;
        sendScannerCommand(false);
        g_scannerActive = false;
        drawScannerBtn();
    } else {
        // Start pending addition
        g_scannerPending = true;
        g_scannerStartTime = millis();
        g_pendingAmount = random(1, 201);
        g_scannerActive = true; // keep scanner active for visual state
        sendScannerCommand(true);
        drawScannerBtn();
    }
    // Small debounce delay
    delay(150);
}

Bridge.update();
}


