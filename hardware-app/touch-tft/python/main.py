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
    print("║" + " PAIEMENT NFC DÉTECTÉ ".center(48) + "║")
    print("═"*50)
    print(f"║ UID du NTag : {tag_uid.center(32)} ║")
    print("═"*50 + "\n")

    if oracledb is None:
        print("⚠️ [ERREUR] Module oracledb non disponible.")
        return

    try:
        dsn = f"{DB_HOST}:1521/xe"
        connection = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=dsn)
        cursor = connection.cursor()

        query = """
            SELECT id_Card, F_Name, L_Name, Amount, Status 
            FROM POS.Externel_System 
            WHERE NFC_UID = :nfc_uid
        """
        cursor.execute(query, {"nfc_uid": tag_uid})
        row = cursor.fetchone()

        if row is not None:
            id_card, f_name, l_name, amount, status = row
            print("═"*50)
            print("║" + " ✅ NTAG ID VALABLE ".center(48) + "║")
            print("═"*50)
            print(f"║ ID Carte    : {str(id_card).center(32)} ║")
            print(f"║ Titulaire   : {(str(f_name) + ' ' + str(l_name)).center(32)} ║")
            print(f"║ Solde       : {(str(amount) + ' EUR').center(32)} ║")
            print(f"║ Statut      : {str(status).center(32)} ║")
            print("═"*50 + "\n")
        else:
            print("═"*50)
            print("║" + " ❌ NTAG ID INVALIDE ".center(48) + "║")
            print("═"*50)
            print(f"║ UID non trouvé dans la table Externel_System   ║")
            print("═"*50 + "\n")

        cursor.close()
        connection.close()

    except Exception as e:
        print(f"⚠️ Erreur lors de la vérification Oracle : {e}\n")

import subprocess
import sys
import os

# --- Import oracledb avec Auto-Installation locale ---
# On installe dans un dossier _libs à côté de ce script pour contourner le venv
_libs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_libs")
if os.path.isdir(_libs_dir):
    sys.path.insert(0, _libs_dir)

try:
    import oracledb
except ImportError:
    print("[INFO] oracledb non trouvé. Installation dans _libs/ ...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "oracledb", "--target", _libs_dir],
            check=True
        )
        sys.path.insert(0, _libs_dir)
        import oracledb
        print("[OK] oracledb installé et chargé avec succès !")
    except Exception as e:
        print(f"[ERREUR] Impossible d'installer oracledb : {e}")
        oracledb = None

# --- CONFIGURATION BASE DE DONNÉES ORACLE ---
DB_USER = "POS"
DB_PASS = "Izinm123W"
DB_HOST = ""  # Sera détecté dynamiquement au démarrage

def on_process_payment(tag_uid, amount_str):
    """Vérifie si le NFC_UID existe dans la table Externel_System"""
    if oracledb is None:
        print("[ERREUR] Module oracledb non disponible.")
        return "ERROR"

    print("\n" + "═"*50)
    print("║" + " RECHERCHE CARTE NFC EN BASE DE DONNÉES ".center(48) + "║")
    print("═"*50)
    print(f"║ NFC UID détecté : {tag_uid.center(28)} ║")
    print("═"*50)

    try:
        # Connexion à Oracle
        dsn = f"{DB_HOST}:....."
        connection = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=dsn)
        cursor = connection.cursor()

        # Chercher la carte par son NFC_UID dans Externel_System
        query = """
            SELECT id_Card, F_Name, L_Name, Amount, Status 
            FROM POS.Externel_System 
            WHERE NFC_UID = :nfc_uid
        """
        cursor.execute(query, {"nfc_uid": tag_uid})
        row = cursor.fetchone()

        if row is not None:
            id_card, f_name, l_name, amount, status = row
            print("\n" + "═"*50)
            print("║" + " ✅ CARTE TROUVÉE - PAIEMENT SUCCÈS ".center(48) + "║")
            print("═"*50)
            print(f"║ ID Carte    : {str(id_card).center(32)} ║")
            print(f"║ Titulaire   : {(str(f_name) + ' ' + str(l_name)).center(32)} ║")
            print(f"║ Solde       : {(str(amount) + ' EUR').center(32)} ║")
            print(f"║ Statut      : {str(status).center(32)} ║")
            print("═"*50 + "\n")
            return "OK"
        else:
            print("\n" + "═"*50)
            print("║" + " ❌ CARTE INVALIDE - NON TROUVÉE ".center(48) + "║")
            print("═"*50)
            print(f"║ Aucune carte avec NFC_UID = {tag_uid}  ║")
            print("═"*50 + "\n")
            return "NOK"

    except Exception as e:
        print(f"\n⚠️ Erreur Oracle : {e}")
        return "ERROR"
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'connection' in locals(): connection.close()


def get_wifi_ssid():
    """Retourne le nom du réseau WiFi actif ou 'Disconnected'"""

    # Méthode 1 : nmcli -t -f ACTIVE,SSID dev wifi  → yes:hamad (confirmé)
    try:
        result = subprocess.run(
            ["nmcli", "-t", "-f", "ACTIVE,SSID", "dev", "wifi"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            for line in result.stdout.split("\n"):
                if line.startswith("yes:"):
                    ssid_val = line.split(":", 1)[1].strip()
                    if ssid_val:
                        print(f"[WiFi] SSID actif : {ssid_val}")
                        return ssid_val
    except Exception:
        pass

    # Méthode 2 : nmcli device status → CONNECTION name  (ex: hamad)
    try:
        result = subprocess.run(
            ["nmcli", "-t", "-f", "DEVICE,TYPE,STATE,CONNECTION", "device", "status"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            for line in result.stdout.split("\n"):
                parts = line.split(":")
                # wlan0:wifi:connected:hamad
                if len(parts) >= 4 and parts[1] == "wifi" and "connected" in parts[2]:
                    conn_name = parts[3].strip()
                    if conn_name and conn_name != "--":
                        print(f"[WiFi] SSID actif (fallback): {conn_name}")
                        return conn_name
    except Exception as e:
        print(f"[WiFi] Erreur : {e}")

    return "Disconnected"


def connect_wifi(ssid, password):
    """Tente de connecter la carte de développement au réseau WiFi"""
    print(f"\n[WiFi] Reçu demande de connexion au réseau WiFi: {ssid}")
    try:
        # Commande standard Linux nmcli pour connecter au WiFi
        cmd = ["sudo", "nmcli", "d", "wifi", "connect", ssid, "password", password]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode == 0:
            print(f"[WiFi] Connexion réussie à {ssid} !")
            return ssid
        else:
            print(f"[WiFi] Échec de connexion : {result.stderr or result.stdout}")
            return "Disconnected"
    except Exception as e:
        print(f"[WiFi] Erreur système lors de la tentative : {e}")
        return "Disconnected"

# Enregistrement des callbacks dans le pont de communication
Bridge.provide("barcode_received", on_barcode_received)
Bridge.provide("notify_payment", on_payment_success)
Bridge.provide("process_payment", on_process_payment)  # <-- Nouveau callback Oracle
Bridge.provide("connect_wifi", connect_wifi)
Bridge.provide("get_wifi_ssid", get_wifi_ssid)

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

def run_network_diagnostics():
    """Affiche des informations de diagnostic réseau sur l'environnement d'exécution"""
    print("\n" + "═"*50)
    print("║" + " DIAGNOSTICS RÉSEAU DE L'ENVIRONNEMENT ".center(48) + "║")
    print("═"*50)
    
    # 1. Lire /etc/resolv.conf
    try:
        if os.path.exists("/etc/resolv.conf"):
            with open("/etc/resolv.conf", "r") as f:
                content = f.read().strip()
                print("--- /etc/resolv.conf ---")
                print(content)
    except Exception as e:
        print(f"Impossible de lire /etc/resolv.conf : {e}")

    # 2. Exécuter ip route ou route -n
    try:
        res = subprocess.run(["ip", "route"], capture_output=True, text=True, timeout=3)
        print("\n--- ip route ---")
        print(res.stdout.strip())
    except Exception:
        try:
            res = subprocess.run(["route", "-n"], capture_output=True, text=True, timeout=3)
            print("\n--- route -n ---")
            print(res.stdout.strip())
        except Exception as e:
            print(f"Impossible d'exécuter ip/route : {e}")

    # 3. Exécuter ip addr ou ifconfig
    try:
        res = subprocess.run(["ip", "-4", "addr"], capture_output=True, text=True, timeout=3)
        print("\n--- ip -4 addr ---")
        print(res.stdout.strip())
    except Exception:
        try:
            res = subprocess.run(["ifconfig"], capture_output=True, text=True, timeout=3)
            print("\n--- ifconfig ---")
            print(res.stdout.strip())
        except Exception as e:
            print(f"Impossible d'obtenir les interfaces : {e}")
            
    print("═"*50 + "\n")

def discover_host_ip():
    """Détecte dynamiquement l'IP du PC Windows qui héberge la base de données Oracle"""
    import socket
    global DB_HOST
    
    # 1. Candidats par défaut
    candidates = ["172.22.--.--", "192.168.--.--"]
    
    # 2. Lire la passerelle par défaut de Linux / Docker
    try:
        with open("/proc/net/route") as fh:
            for line in fh:
                fields = line.strip().split()
                if len(fields) > 2 and fields[1] == '00000000':
                    import struct
                    gw = socket.inet_ntoa(struct.pack("<L", int(fields[2], 16)))
                    if gw not in candidates and gw != "-.-.-.-":
                        candidates.append(gw)
    except Exception:
        pass
        
    print("\n" + "═"*50)
    print("║" + " RECHERCHE DE L'HÔTE ORACLE EN COURS... ".center(48) + "║")
    print("═"*50)
    print(f"║ Candidats : {', '.join(candidates).center(38)} ║")
    print("═"*50)
    
    # Essayer de se connecter au port 1521 de chaque candidat
    for host in candidates:
        try:
            print(f"[TEST] Essai de connexion sur {host}:---- ... ", end="", flush=True)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.5)
            s.connect((host, 1521))
            s.close()
            print("✅ SUCCÈS")
            DB_HOST = host
            print(f"║  -> Hôte sélectionné : {DB_HOST.center(22)} ║")
            print("═"*50 + "\n")
            return
        except Exception as e:
            print(f"❌ ÉCHEC ({e})")
            
    print("║  ⚠️ AUCUN HÔTE TROUVÉ SUR LE PORT 1521         ║")
    print(f"║  Fallback sur l'IP par défaut : {DB_HOST.center(16)} ║")
    print("═"*50 + "\n")

def test_oracle_connection():
    """Test de connexion à Oracle au démarrage"""
    run_network_diagnostics()
    discover_host_ip()
    
    dsn = f"{DB_HOST}:1521/xe"
    print("\n" + "═"*50)
    print("║" + " TEST CONNEXION ORACLE DATABASE ".center(48) + "║")
    print("═"*50)
    print(f"║ Hôte : {dsn.center(38)} ║")
    print(f"║ User : {DB_USER.center(38)} ║")
    print("═"*50)

    if oracledb is None:
        print("║  ❌ INVALID CONNECTION                          ║")
        print("║  Module oracledb non disponible.                ║")
        print("═"*50 + "\n")
        return

    try:
        connection = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=dsn)
        cursor = connection.cursor()
        cursor.execute("SELECT sysdate FROM dual")
        result = cursor.fetchone()
        print("║  ✅ CONNECTION SUCCESS                           ║")
        print(f"║  Oracle Time : {str(result[0]).center(31)} ║")
        cursor.close()
        connection.close()
        print("═"*50 + "\n")
    except Exception as e:
        print("║  ❌ INVALID CONNECTION                          ║")
        print(f"║  Erreur : {str(e)[:36].center(36)} ║")
        print("═"*50 + "\n")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_memory_usage()
    test_oracle_connection()
    print("\n" + "█"*50)
    print("█" + " SYSTÈME POS INITIALISÉ & PRÊT ".center(48) + "█")
    print("█"*50 + "\n")
    App.run(user_loop=loop)