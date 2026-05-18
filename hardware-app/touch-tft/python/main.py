from arduino.app_utils import App, Bridge
import time

# --- CALLBACKS DU PONT (BRIDGE) ---

def on_barcode_received(amount):
    """Callback déclenché quand le scanneur a terminé avec succès (après 2s)"""
    print("\n" + "═"*50)
    print("║" + " MONTANT REÇU DEPUIS LE SCANNER ".center(48) + "║")
    print("═"*50)
    print(f"║ Montant Aléatoire Généré : {f'{amount} DH'.center(20)} ║")
    print(f"║ Statut : ACTIF & REUSSI                        ║")
    print("═"*50 + "\n")

def on_payment_success(tag_uid):
    """Callback déclenché quand le module NFC PN532 détecte un badge NTag"""
    print("\n" + "═"*50)
    print("║" + " PAIEMENT NFC DÉTECTÉ ET APPROUVÉ ".center(48) + "║")
    print("═"*50)
    print(f"║ ID Unique du NTag (UID) : {tag_uid.center(22)} ║")
    print(f"║ Statut : SUCCESS (VALIDÉ)                      ║")
    print("═"*50 + "\n")

# Enregistrement des callbacks dans le pont de communication
Bridge.provide("barcode_received", on_barcode_received)
Bridge.provide("notify_payment", on_payment_success)

def loop():
    # La détection et le traitement tactile sont entièrement gérés côté Arduino C++ dans sketch.ino.
    # Ce script Python se contente d'attendre et d'afficher les résultats via les callbacks Bridge.
    time.sleep(0.1)

def analyze_memory_usage():
    """Rapport de consommation mémoire"""
    import os
    MCU_FLASH_TOTAL = 2048 * 1024  # 2MB
    MCU_SRAM_TOTAL = 786 * 1024    # 786KB
    
    # Détection du dossier sketch (1 niveau plus haut)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sketch_path = os.path.join(base_dir, "sketch")
    if not os.path.exists(sketch_path):
        sketch_path = os.path.join(os.getcwd(), "sketch")
        if not os.path.exists(sketch_path):
            return

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

if __name__ == "__main__":
    analyze_memory_usage()
    print("\n" + "█"*50)
    print("█" + " SYSTÈME POS INITIALISÉ & PRÊT ".center(48) + "█")
    print("█"*50 + "\n")
    App.run(user_loop=loop)