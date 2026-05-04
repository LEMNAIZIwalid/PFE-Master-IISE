from arduino.app_utils import App, Bridge
import os
import time

# --- CONFIGURATION ARDUINO UNO Q (STM32U585) ---
MCU_FLASH_TOTAL = 2048 * 1024  # 2MB
MCU_SRAM_TOTAL = 786 * 1024    # 786KB

def analyze_memory_usage():
    """Rapport de consommation mémoire"""
    sketch_path = os.path.join(os.getcwd(), "sketch")
    if not os.path.exists(sketch_path): return

    total_size = 0
    for root, dirs, files in os.walk(sketch_path):
        for file in files:
            if file.endswith(('.h', '.cpp', '.ino')):
                total_size += os.path.getsize(os.path.join(root, file))

    est_flash = int(total_size * 1.5) + 150000 
    flash_pct = (est_flash / MCU_FLASH_TOTAL) * 100
    est_sram = 65000 + 307200 
    sram_pct = (est_sram / MCU_SRAM_TOTAL) * 100

    print("\n" + "═"*50)
    print(f"║ FLASH : {est_flash/1024:.1f} KB ({flash_pct:.1f}%)".ljust(49) + "║")
    print(f"║ SRAM  : {est_sram/1024:.1f} KB ({sram_pct:.1f}%)".ljust(49) + "║")
    print("═"*50)

# --- CALLBACKS RÉCEPTION ---

def on_barcode_received(code):
    """Affiche le code-barres détecté"""
    print("\n" + "╔" + "═"*40 + "╗")
    print(f"║ [BARCODE] : {code.center(25)}  ║")
    print(f"║ >>> DETECTION PRODUIT OK !             ║")
    print("╚" + "═"*40 + "╝")

def on_payment_success(tag_uid):
    """Affiche le contenu (UID) du NTag détecté"""
    print("\n" + "╔" + "═"*40 + "╗")
    print(f"║ [NTAG NFC] : {tag_uid.center(24)}  ║")
    print(f"║ >>> PAIEMENT VALIDÉ PAR CARTE          ║")
    print("╚" + "═"*40 + "╝")

# --- BRIDGE ---
Bridge.provide("barcode_received", on_barcode_received)
Bridge.provide("notify_payment", on_payment_success)

def loop():
    # On peut ajouter ici une logique périodique si nécessaire
    time.sleep(0.1)

if __name__ == "__main__":
    analyze_memory_usage()
    print("\n" + "█"*50)
    print("█" + " SYSTÈME POS PRÊT AU SCAN ".center(48) + "█")
    print("█"*50 + "\n")
    try:
        App.run(user_loop=loop)
    except KeyboardInterrupt:
        print("\n>>> Arrêt du système...")
