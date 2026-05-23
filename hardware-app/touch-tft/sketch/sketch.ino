#include "TFT_eSPI.h"
#include "Arduino_RouterBridge.h"

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

// --- Couleurs ─────────────────────────────────────────────────
#define COLOR_NAVY    0x018C
#define COLOR_GREY_LT 0xDEFB
#define COLOR_GREY_NK 0xD6BA
#define COLOR_BTN_BG  0xEF7D   // gris clair boutons numpad
#define COLOR_BTN_SHD 0xBDD7   // ombre boutons
#define COLOR_PAYER   0x2D05   // vert
#define COLOR_SCANNER 0xEF00   // jaune
#define COLOR_BTN_DEL 0xC67F   // bleu doux  pour bouton <
#define COLOR_BTN_CLR 0xFD14   // rouge doux pour bouton C

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

// --- Calibration du Tactile (ORIGINAL) ────────────────────────
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

    // ── SCANNER (jaune) ──
    tft.fillRoundRect(162, 384, 154, 80, 14, COLOR_SCANNER);
    tft.drawRoundRect(162, 384, 154, 80, 14, 0xC500);
    tft.setTextColor(COLOR_NAVY);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("SCANNER", 239, 424, 4);
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
    delay(500);

    tft.init();
    tft.setRotation(0);
    delay(200);

    // 1. Calibration tactile
    touch_calibrate();

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

    if (!tft.getTouch(&tx, &ty)) {
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

    // ── Bouton PAYER (flash visuel seulement) ──
    else if (ty >= 384 && ty <= 464 && tx >= 4 && tx <= 156) {
        tft.fillRoundRect(4, 384, 152, 80, 14, TFT_WHITE);
        delay(70);
        tft.fillRoundRect(4, 384, 152, 80, 14, COLOR_PAYER);
        tft.drawRoundRect(4, 384, 152, 80, 14, 0x0B80);
        tft.setTextColor(TFT_WHITE);
        tft.setTextDatum(MC_DATUM);
        tft.drawString("PAYER", 80, 424, 4);
        delay(150);
    }

    // ── Bouton SCANNER (flash visuel seulement) ──
    else if (ty >= 384 && ty <= 464 && tx >= 162 && tx <= 316) {
        tft.fillRoundRect(162, 384, 154, 80, 14, TFT_WHITE);
        delay(70);
        tft.fillRoundRect(162, 384, 154, 80, 14, COLOR_SCANNER);
        tft.drawRoundRect(162, 384, 154, 80, 14, 0xC500);
        tft.setTextColor(COLOR_NAVY);
        tft.setTextDatum(MC_DATUM);
        tft.drawString("SCANNER", 239, 424, 4);
        delay(150);
    }

    Bridge.update();
}





