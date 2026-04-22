import re
import os
import time
from datetime import datetime, timedelta, timezone
from arduino.app_utils import *

# --- CONFIGURATION ARDUINO UNO Q (STM32U585) ---
MCU_FLASH_TOTAL = 2048 * 1024  # 2MB
MCU_SRAM_TOTAL = 786 * 1024   # 786KB

def analyze_arduino_memory(sketch_dir):
    """Effectue une analyse détaillée de la mémoire occupée par les fichiers du sketch."""
    if not os.path.exists(sketch_dir):
        return

    print("\n" + "="*60)
    print("      ANALYSE MÉMOIRE - ARDUINO UNO Q (STM32U585)")
    print("="*60)

    files_stats = []
    total_raw_size = 0
    main_ino_content = ""
    
    for root, dirs, files in os.walk(sketch_dir):
        for file in files:
            if file.endswith(('.h', '.cpp', '.ino')):
                path = os.path.join(root, file)
                size = os.path.getsize(path)
                total_raw_size += size
                files_stats.append((file, size))
                if file.endswith('.ino'):
                    with open(path, 'r', encoding='utf-8') as f:
                        main_ino_content = f.read()

    # Estimation Flash Binaire
    flash_libs = 0
    lib_costs = {
        "TFT_eSPI": 45000, "Adafruit_PN532": 12000, 
        "Arduino_RouterBridge": 8000, "SPI": 2000
    }
    for lib, cost in lib_costs.items():
        if lib in main_ino_content: flash_libs += cost

    # Fonts/Resources
    font_flash = sum(int(s * 0.8) for f, s in files_stats if "Font" in f or "Orbitron" in f)
    code_flash = len(main_ino_content.split('\n')) * 45
    total_flash = flash_libs + font_flash + code_flash

    # Estimation SRAM
    total_sram = 8192 # Base + Bridge buffers
    if "TFT_eSPI" in main_ino_content: total_sram += 300000 # Buffer écran estimé

    print(f"FLASH: {total_flash/1024:.1f} KB / 2048 KB ({(total_flash/MCU_FLASH_TOTAL)*100:.1f}%)")
    print(f"SRAM:  {total_sram/1024:.1f} KB / 786 KB ({(total_sram/MCU_SRAM_TOTAL)*100:.1f}%)")
    print("-" * 60)

def loop():
    """Boucle principale de synchronisation avec l'Arduino."""
    # 1. Préparation des données météo/temps (Casablanca GMT+1)
    tz_morocco = timezone(timedelta(hours=1))
    now = datetime.now(tz_morocco)
    time_str = now.strftime("%H:%M")
    
    days_en = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    date_str = f"{days_en[now.weekday()]} : {now.day}/{now.month}/{now.year}"
    
    # 2. Simulation statut WiFi et Batterie
    wifi_status = "Connected" if int(time.time()) % 20 != 0 else "Signal Low"
    battery_val = f"{85 + (int(time.time()) % 10)}%"
    
    try:
        # Envoi des infos à l'Arduino pour mise à jour du Header
        Bridge.call("update_status", time_str, date_str, wifi_status, battery_val)
    except Exception as e:
        if "not available" in str(e):
            pass # L'Arduino n'est pas encore prêt
        else:
            print(f"[PY] Erreur Bridge: {e}")
            
    time.sleep(1)

# --- DASHBOARD DE DIAGNOSTIC NFC ---
nfc_health = {
    "init": "En attente...",
    "firmware": "Inconnu",
    "last_error": "Aucune",
    "scan_count": 0
}

def print_nfc_dashboard():
    os.system('cls' if os.name == 'nt' else 'clear')
    print("="*60)
    print("      TABLEAU DE BORD DE DIAGNOSTIC PN532")
    print("="*60)
    print(f"Statut Init    : {nfc_health['init']}")
    print(f"Firmware       : {nfc_health['firmware']}")
    print(f"Dernière Erreur: {nfc_health['last_error']}")
    print(f"Scans tentés   : {nfc_health['scan_count']}")
    print("-" * 60)
    print("CONSEIL : Si l'écran scintille ou si le Bridge timeout,")
    print("le problème est probablement une chute de tension (Ampérage USB).")
    print("="*60)

def on_nfc_log(message):
    global nfc_health
    if "Detecte (OK)" in message:
        nfc_health["init"] = "SUCCÈS"
        nfc_health["firmware"] = message.split("PN532 ")[1]
    elif "ERROR" in message:
        nfc_health["init"] = "ÉCHEC"
        nfc_health["last_error"] = message
    elif "Scanning" in message:
        nfc_health["scan_count"] += 1
    
    print_nfc_dashboard()

def on_payment_detected(status):
    print(f"\n[PY] >>> TRANSACTION RÉUSSIE ! Statut: {status}")
    print("="*60)

if __name__ == "__main__":
    sketch_path = os.path.join(os.getcwd(), "sketch")
    analyze_arduino_memory(sketch_path)
    
    # Configuration des services Bridge
    Bridge.provide("notify_payment", on_payment_detected)
    Bridge.provide("nfc_log", on_nfc_log)
    
    print("[SYSTEM] Diagnostic en cours...")
    App.run(user_loop=loop)
