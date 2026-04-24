from arduino.app_utils import App, Bridge
import os
import time

# --- CONFIGURATION ARDUINO UNO Q (STM32U585) ---
MCU_FLASH_TOTAL = 2048 * 1024  # 2MB
MCU_SRAM_TOTAL = 786 * 1024    # 786KB

def analyze_memory_usage():
    """Estime l'occupation mémoire du projet actuel"""
    sketch_path = os.path.join(os.getcwd(), "sketch")
    if not os.path.exists(sketch_path):
        return

    print("\n" + "="*50)
    print("      RAPPORT MÉMOIRE : ARDUINO UNO Q")
    print("="*50)

    total_size = 0
    for root, dirs, files in os.walk(sketch_path):
        for file in files:
            if file.endswith(('.h', '.cpp', '.ino')):
                total_size += os.path.getsize(os.path.join(root, file))

    # Estimation Flash (Code compilé + Libs + Ressources)
    # Sur STM32, le binaire est souvent 1.5x à 2x la taille des sources + Libs
    est_flash = int(total_size * 1.5) + 150000 # Base libs (TFT, NFC, Bridge)
    flash_pct = (est_flash / MCU_FLASH_TOTAL) * 100
    
    # Estimation SRAM
    # Framebuffer TFT_eSPI (320x480x16bit) = ~307KB si actif
    # + Variables + Buffers Bridge
    est_sram = 65000 + 307200 
    sram_pct = (est_sram / MCU_SRAM_TOTAL) * 100

    print(f"FLASH (Code/Fonts) : {est_flash/1024:.1f} KB / 2048 KB ({flash_pct:.1f}%)")
    print(f"SRAM (Variables/UI): {est_sram/1024:.1f} KB / 786 KB  ({sram_pct:.1f}%)")
    print("-" * 50)

# --- CALLBACKS POS ---
def on_barcode_received(code):
    print(f"\n[SCAN] Code reçu : {code}")

def on_payment_success(msg):
    print("\n[NFC] Paiement effectué avec succès !")

# --- ENREGISTREMENT ---
Bridge.provide("barcode_received", on_barcode_received)
Bridge.provide("notify_payment", on_payment_success)

def loop():
    # Affichage régulier du rapport mémoire (optionnel)
    # analyze_memory_usage()
    time.sleep(10)

if __name__ == "__main__":
    # Analyse au démarrage
    analyze_memory_usage()
    
    print("\n>>> System POS actif. En attente d'événements...")
    try:
        App.run(user_loop=loop)
    except KeyboardInterrupt:
        pass
