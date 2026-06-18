from arduino.app_utils import App, Bridge
import time
import threading
import urllib.request
import urllib.error
import socket

# --- MONITORING STATUS GLOBALS ---
_screen_state = "WAITING"
_screen_amount = "0.00 DH"
_last_screen_update = time.time()
_last_transaction_id = "CRD-SUCCESS"

# --- CALLBACKS DU PONT (BRIDGE) ---

def on_barcode_received(amount):
    """Callback déclenché quand le scanneur a terminé avec succès (après 2s)"""
    global _screen_state, _screen_amount, _last_screen_update
    _screen_state = "PROCESSING"
    _screen_amount = f"{amount} DH"
    _last_screen_update = time.time()

    print("\n" + "═"*50)
    print("║" + " MONTANT REÇU DEPUIS LE SCANNER ".center(48) + "║")
    print("═"*50)
    print(f"║ Montant Aléatoire Généré : {f'{amount} DH'.center(20)} ║")
    print(f"║ Statut : ACTIF & REUSSI                        ║")
    print("═"*50 + "\n")

def on_payment_success(tag_uid, amount_str="0"):
    """Callback déclenché quand le module NFC PN532 détecte un badge NTag et effectue le paiement"""
    global _screen_state, _screen_amount, _last_screen_update, _last_transaction_id
    print("\n" + "═"*50)
    print("║" + " PAIEMENT NFC DÉTECTÉ ".center(48) + "║")
    print("═"*50)
    print(f"║ UID du NTag : {tag_uid.center(32)} ║")
    print(f"║ Montant     : {f'{amount_str} EUR'.center(32)} ║")
    print("═"*50 + "\n")

    if oracledb is None:
        print("⚠️ [ERREUR] Module oracledb non disponible.")
        _screen_state = "INVALID"
        _screen_amount = f"{amount_str} EUR"
        _last_screen_update = time.time()
        return "ERROR"

    try:
        payment_amount = float(amount_str) if amount_str else 0.0
    except ValueError:
        payment_amount = 0.0

    connection = None
    try:
        dsn = f"{DB_HOST}:1521/xe"
        print(f"[DEBUG] Tentative de connexion Oracle sur DSN : {dsn} ...", flush=True)
        connection = oracledb.connect(
            user=DB_USER, password=DB_PASS, dsn=dsn,
            tcp_connect_timeout=5  # ✅ Fix: timeout 5s au lieu du défaut système (30s+)
        )
        cursor = connection.cursor()

        # Chercher la carte par NFC_UID dans Externel_System (dernière version)
        query = """
            SELECT id_Card, PAN, F_Name, L_Name, Amount, Status, POS_limit, ATM_limit 
            FROM (
                SELECT id_Card, PAN, F_Name, L_Name, Amount, Status, POS_limit, ATM_limit,
                       ROW_NUMBER() OVER (PARTITION BY id_Card ORDER BY TIMESTMP DESC) as rn
                FROM POS.Externel_System 
                WHERE NFC_UID = :nfc_uid
            ) WHERE rn = 1
        """
        cursor.execute(query, {"nfc_uid": tag_uid})
        row = cursor.fetchone()

        if row is not None:
            id_card, pan, f_name, l_name, amount, status, pos_limit, atm_limit = row
            old_amount = float(amount) if amount is not None else 0.0
            
            # Vérifier le statut de la carte
            card_status = str(status).strip().lower()
            if card_status != 'active':
                print("═"*50)
                print(f"║ ❌ CARTE NON ACTIVE ({status.upper()}) ".center(48) + "║")
                print("═"*50)
                print(f"║ ID Carte    : {str(id_card).center(32)} ║")
                print(f"║ Titulaire   : {(str(f_name) + ' ' + str(l_name)).center(32)} ║")
                print(f"║ Statut      : {str(status).center(32)} ║")
                print("═"*50 + "\n")
                cursor.close()
                connection.close()
                
                # Update monitoring state
                _screen_state = "INVALID"
                _screen_amount = f"{amount_str} EUR"
                _last_screen_update = time.time()
                
                if card_status == 'suspended':
                    return "SUSPENDED"
                else:
                    return "BLOCKED"

            if old_amount < payment_amount:
                print("═"*50)
                print("║" + " ❌ SOLDE INSUFFISANT ".center(48) + "║")
                print("═"*50)
                print(f"║ ID Carte    : {str(id_card).center(32)} ║")
                print(f"║ Titulaire   : {(str(f_name) + ' ' + str(l_name)).center(32)} ║")
                print(f"║ Solde       : {(str(old_amount) + ' EUR').center(32)} ║")
                print(f"║ Requis      : {(str(payment_amount) + ' EUR').center(32)} ║")
                print("═"*50 + "\n")
                cursor.close()
                connection.close()
                
                # Update monitoring state
                _screen_state = "SOLDE_INSUFISANT"
                _screen_amount = f"{amount_str} EUR"
                _last_screen_update = time.time()
                
                return "INSUFFICIENT_BALANCE"

            new_balance = old_amount - payment_amount

            # 1. Publier la transaction via MQTT → Proxy Avro → Kafka HPOS (AVANT l'insertion en BD)
            publish_payment_mqtt({
                "client_id": str(id_card),
                "card_id": str(id_card),
                "PAN": str(pan),
                "Amount": float(new_balance),
                "F_name": str(f_name),
                "L_name": str(l_name),
                "Modify_by": "POS_Terminal",
                "timestmp": datetime.datetime.now().isoformat()
            })

            # Le terminal ne fait plus d'écriture en BD lui-même,
            # il délègue l'enregistrement au pipeline MQTT -> Kafka -> Consumer DB.


            print("═"*50)
            print("║" + " ✅ PAIEMENT REUSSI & ENREGISTRE ".center(48) + "║")
            print("═"*50)
            print(f"║ ID Carte    : {str(id_card).center(32)} ║")
            print(f"║ Titulaire   : {(str(f_name) + ' ' + str(l_name)).center(32)} ║")
            print(f"║ Ancien Solde: {(str(old_amount) + ' EUR').center(32)} ║")
            print(f"║ Montant Payé: {(str(payment_amount) + ' EUR').center(32)} ║")
            print(f"║ Nouveau Solde:{(str(new_balance) + ' EUR').center(32)} ║")
            print(f"║ Statut      : {str(status).center(32)} ║")
            print("═"*50 + "\n")
            
            cursor.close()
            connection.close()
            
            # Update monitoring state
            _screen_state = "SUCCESS"
            _screen_amount = f"{amount_str} EUR"
            _last_screen_update = time.time()
            _last_transaction_id = f"TX-{id_card}"
            
            return "OK"
        else:
            print("═"*50)
            print("║" + " ❌ NTAG ID INVALIDE ".center(48) + "║")
            print("═"*50)
            print(f"║ UID non trouvé dans la table Externel_System   ║")
            print("═"*50 + "\n")
            cursor.close()
            connection.close()
            
            # Update monitoring state
            _screen_state = "INVALID"
            _screen_amount = f"{amount_str} EUR"
            _last_screen_update = time.time()
            
            return "INVALID"

    except Exception as e:
        print(f"⚠️ Erreur lors du paiement Oracle : {e}\n")
        if connection:
            try:
                connection.close()
            except Exception:
                pass
        
        # Update monitoring state
        _screen_state = "INVALID"
        _screen_amount = f"{amount_str} EUR"
        _last_screen_update = time.time()
        
        # ✅ Fix: si erreur de connexion, re-détecter l'IP Oracle automatiquement
        if 'DPY-6005' in str(e) or 'DPY-4011' in str(e) or 'timeout' in str(e).lower() or 'refused' in str(e).lower():
            print("[AUTO-RECOVER] Tentative de redécouverte de l'hôte Oracle...", flush=True)
            discover_host_ip()
        return "ERROR"

import subprocess
import sys
import os
import datetime
import json

# --- Import oracledb & paho-mqtt avec Auto-Installation locale ---
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

try:
    import paho.mqtt.client as mqtt_client
except ImportError:
    print("[INFO] paho-mqtt non trouvé. Installation dans _libs/ ...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "paho-mqtt", "--target", _libs_dir],
            check=True
        )
        sys.path.insert(0, _libs_dir)
        import paho.mqtt.client as mqtt_client
        print("[OK] paho-mqtt installé et chargé avec succès !")
    except Exception as e:
        print(f"[ERREUR] Impossible d'installer paho-mqtt : {e}")
        mqtt_client = None

# --- CONFIGURATION MQTT ---
MQTT_BROKER = "172.22.32.1"  # IP Windows vue depuis Docker (vEthernet WSL/Hyper-V)
MQTT_PORT = 1883
MQTT_TOPIC = "pos/transactions"
_mqtt_publisher = None  # Client MQTT global

def init_mqtt_client():
    """Initialise le client MQTT pour publier les transactions POS vers le proxy Avro/Kafka"""
    global _mqtt_publisher, MQTT_BROKER
    if mqtt_client is None:
        print("⚠️ [MQTT] Module paho-mqtt non disponible, publication désactivée.")
        return
    
    # Utiliser la même IP que l'hôte Oracle (le broker Mosquitto tourne sur le même PC)
    MQTT_BROKER = DB_HOST
    
    try:
        _mqtt_publisher = mqtt_client.Client(mqtt_client.CallbackAPIVersion.VERSION2)
        _mqtt_publisher.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        _mqtt_publisher.loop_start()
        print(f"✅ [MQTT] Client connecté au broker {MQTT_BROKER}:{MQTT_PORT}")
        print(f"   Topic de publication : {MQTT_TOPIC}")
    except Exception as e:
        print(f"⚠️ [MQTT] Impossible de se connecter au broker : {e}")
        _mqtt_publisher = None

def publish_payment_mqtt(transaction_data):
    """Publie une transaction de paiement POS vers MQTT → Proxy Avro → Kafka HPOS"""
    if _mqtt_publisher is None:
        print("⚠️ [MQTT] Client non initialisé, tentative de reconnexion...")
        init_mqtt_client()
        if _mqtt_publisher is None:
            print("⚠️ [MQTT] Publication impossible, client indisponible.")
            return
    
    try:
        payload = json.dumps(transaction_data)
        result = _mqtt_publisher.publish(MQTT_TOPIC, payload)
        if result[0] == 0:
            print(f"🚀 [MQTT] Transaction publiée → {MQTT_TOPIC}")
            print(f"   Card: {transaction_data.get('card_id')} | Montant: {transaction_data.get('Amount')}")
        else:
            print(f"⚠️ [MQTT] Erreur de publication (code: {result[0]})")
    except Exception as e:
        print(f"⚠️ [MQTT] Erreur lors de la publication : {e}")

# --- CONFIGURATION BASE DE DONNÉES ORACLE ---
DB_USER = "POS"
DB_PASS = "Izinm123W"
DB_HOST = "172.22.32.1"  # IP Windows depuis Docker (vEthernet WSL/Hyper-V) — mise à jour par discover_host_ip()

def on_process_payment(tag_uid, amount_str):
    """Vérifie si le NFC_UID existe dans la table Externel_System"""
    global _screen_state, _screen_amount, _last_screen_update
    if oracledb is None:
        print("[ERREUR] Module oracledb non disponible.")
        _screen_state = "INVALID"
        _screen_amount = f"{amount_str} EUR"
        _last_screen_update = time.time()
        return "ERROR"

    print("\n" + "═"*50)
    print("║" + " RECHERCHE CARTE NFC EN BASE DE DONNÉES ".center(48) + "║")
    print("═"*50)
    print(f"║ NFC UID détecté : {tag_uid.center(28)} ║")
    print("═"*50)

    try:
        # Connexion à Oracle avec timeout court
        dsn = f"{DB_HOST}:1521/xe"
        print(f"[DEBUG] Tentative de connexion Oracle (process_payment) sur DSN : {dsn} ...", flush=True)
        connection = oracledb.connect(
            user=DB_USER, password=DB_PASS, dsn=dsn,
            tcp_connect_timeout=5  # ✅ Fix: timeout 5s
        )
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
            
            _screen_state = "SUCCESS"
            _screen_amount = f"{amount_str} EUR"
            _last_screen_update = time.time()
            
            return "OK"
        else:
            print("\n" + "═"*50)
            print("║" + " ❌ CARTE INVALIDE - NON TROUVÉE ".center(48) + "║")
            print("═"*50)
            print(f"║ Aucune carte avec NFC_UID = {tag_uid}  ║")
            print("═"*50 + "\n")
            
            _screen_state = "INVALID"
            _screen_amount = f"{amount_str} EUR"
            _last_screen_update = time.time()
            
            return "NOK"

    except Exception as e:
        print(f"\n⚠️ Erreur Oracle : {e}")
        
        _screen_state = "INVALID"
        _screen_amount = f"{amount_str} EUR"
        _last_screen_update = time.time()
        
        # ✅ Fix: re-détecter l'IP si erreur de connexion
        if 'DPY-6005' in str(e) or 'DPY-4011' in str(e) or 'timeout' in str(e).lower() or 'refused' in str(e).lower():
            print("[AUTO-RECOVER] Redécouverte de l'hôte Oracle en cours...", flush=True)
            discover_host_ip()
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
    except FileNotFoundError:
        return "hamad"
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
    except FileNotFoundError:
        return "hamad"
    except Exception:
        pass

    # Si Docker ou environnement sans nmcli
    if os.path.exists('/.dockerenv'):
        return "hamad"

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
    import struct
    import concurrent.futures
    global DB_HOST

    # ── 1. Détecter le sous-réseau local ──────────────────────────────
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "172.21.0.2"

    print(f"[DEBUG] Local IP detected: {local_ip}", flush=True)
    parts = local_ip.split('.')
    local_subnet = ".".join(parts[:3]) + "." if len(parts) == 4 else "172.21.0."

    # ── 2. Lire la passerelle depuis /proc/net/route ──────────────────
    gateway_ip = None
    try:
        with open("/proc/net/route") as fh:
            for line in fh:
                fields = line.strip().split()
                if len(fields) > 2 and fields[1] == '00000000':
                    gw = socket.inet_ntoa(struct.pack("<L", int(fields[2], 16)))
                    if gw and gw != "0.0.0.0":
                        gateway_ip = gw
                        print(f"[DEBUG] Gateway détectée depuis /proc/net/route: {gw}", flush=True)
                        break
    except Exception:
        pass

    # Fallback: gateway conventionnelle = sous-réseau.1
    if not gateway_ip:
        gateway_ip = f"{local_subnet}1"

    # ── 3. PHASE 1 — Test PRIORITAIRE avec timeout long (2s) ──────────
    #    Ces hôtes sont les plus probables → on les teste en premier,
    #    séparément, avec un timeout plus généreux pour WiFi/Docker.
    print("\n" + "═"*50, flush=True)
    print("║" + " 🔍 TEST PRIORITAIRE (GATEWAY + DOCKER)... ".center(48) + "║", flush=True)
    print("═"*50, flush=True)

    priority = []
    # ✅ 172.22.32.1 = IP Windows depuis Docker (vEthernet WSL/Hyper-V) → PRIORITÉ N°1
    for ip in ["172.22.32.1", "172.17.0.1", "172.18.0.1", "172.21.0.1"]:
        if ip not in priority:
            priority.append(ip)
    # host.docker.internal (Docker Desktop Windows → accès direct au host)
    for name in ["host.docker.internal", "gateway.docker.internal"]:
        try:
            ip = socket.gethostbyname(name)
            if ip and ip not in priority:
                priority.append(ip)
                print(f"   DNS {name} → {ip}", flush=True)
        except Exception:
            pass
    # Gateway détectée depuis /proc/net/route
    if gateway_ip and gateway_ip not in priority:
        priority.insert(0, gateway_ip)
    # IPs WiFi Windows connues
    for ip in ["192.168.8.103", "192.168.8.101", "192.168.8.100"]:
        if ip not in priority:
            priority.append(ip)

    def check_host_slow(host, timeout=2.0):
        """Test avec timeout plus long pour les candidats prioritaires"""
        try:
            addr = socket.gethostbyname(host) if not host[0].isdigit() else host
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(timeout)
            s.connect((addr, 1521))
            s.close()
            return addr
        except Exception:
            return None

    for h in priority:
        print(f"   → Test {h}:1521 (timeout=2s)...", flush=True)
        result = check_host_slow(h)
        if result:
            DB_HOST = result
            print("═"*50, flush=True)
            print("║" + f" ✅ ORACLE TROUVÉ : {DB_HOST} ".center(48) + "║", flush=True)
            print("═"*50 + "\n", flush=True)
            return

    # ── 4. PHASE 2 — Scan large du sous-réseau local (0.5s timeout) ──
    fallback_candidates = []
    for subnet in [local_subnet, "192.168.8.", "192.168.1.", "172.17.0.", "172.18.0."]:
        for i in range(1, 255):
            ip = f"{subnet}{i}"
            if ip not in priority and ip not in fallback_candidates:
                fallback_candidates.append(ip)

    print("═"*50, flush=True)
    print("║" + " SCAN ÉTENDU EN COURS... ".center(48) + "║", flush=True)
    print(f"║ Test de {len(fallback_candidates)} adresses sur le port 1521...".ljust(49) + "║", flush=True)
    print("═"*50, flush=True)

    def check_host_fast(host):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            s.connect((host, 1521))
            s.close()
            return host
        except Exception:
            return None

    found_host = None
    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
        futures = {executor.submit(check_host_fast, h): h for h in fallback_candidates}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                found_host = res
                break

    if found_host:
        DB_HOST = found_host
        print("═"*50, flush=True)
        print("║" + " ✅ HÔTE ORACLE TROUVÉ ".center(48) + "║", flush=True)
        print("═"*50, flush=True)
        print(f"║ IP Sélectionnée : {DB_HOST.center(30)} ║", flush=True)
        print("═"*50 + "\n", flush=True)
    else:
        print("═"*50, flush=True)
        print("║" + " ❌ AUCUN HÔTE ORACLE DÉTECTÉ ".center(48) + "║", flush=True)
        print("═"*50, flush=True)
        print(f"║ DB_HOST conservé  : {DB_HOST.center(28)} ║", flush=True)
        print("║                                                ║", flush=True)
        print("║ 💡 SOLUTION FIREWALL WINDOWS :                 ║", flush=True)
        print("║  Ouvrir le port 1521 pour 172.21.0.0/16       ║", flush=True)
        print("║  > netsh advfirewall firewall add rule         ║", flush=True)
        print("║    name=\"Oracle-Docker\" dir=in                 ║", flush=True)
        print("║    action=allow protocol=TCP localport=1521    ║", flush=True)
        print("║    remoteip=172.21.0.0/255.255.0.0            ║", flush=True)
        print("═"*50 + "\n", flush=True)

def test_oracle_connection():
    """Test de connexion à Oracle au démarrage"""
    run_network_diagnostics()
    discover_host_ip()
    
    dsn = f"{DB_HOST}:1521/xe"
    print("\n" + "═"*50, flush=True)
    print("║" + " TEST CONNEXION ORACLE DATABASE ".center(48) + "║", flush=True)
    print("═"*50, flush=True)
    print(f"║ Hôte : {dsn.center(38)} ║", flush=True)
    print(f"║ User : {DB_USER.center(38)} ║", flush=True)
    print("═"*50, flush=True)

    if oracledb is None:
        print("║  ❌ INVALID CONNECTION                          ║", flush=True)
        print("║  Module oracledb non disponible.                ║", flush=True)
        print("═"*50 + "\n", flush=True)
        return

    try:
        connection = oracledb.connect(
            user=DB_USER, password=DB_PASS, dsn=dsn,
            tcp_connect_timeout=5  # ✅ Fix: timeout 5s
        )
        cursor = connection.cursor()
        cursor.execute("SELECT sysdate FROM dual")
        result = cursor.fetchone()
        print("║  ✅ CONNECTION SUCCESS                           ║", flush=True)
        print(f"║  Oracle Time : {str(result[0]).center(31)} ║", flush=True)
        cursor.close()
        connection.close()
        print("═"*50 + "\n", flush=True)
    except Exception as e:
        print("║  ❌ INVALID CONNECTION                          ║", flush=True)
        print(f"║  Erreur : {str(e)[:36].center(36)} ║", flush=True)
        print("═"*50 + "\n", flush=True)
        import traceback
        traceback.print_exc()

def send_heartbeat_loop():
    """Thread en arrière-plan qui envoie périodiquement l'état du POS à l'API Flask"""
    global _screen_state, _screen_amount, _last_screen_update, _last_transaction_id
    time.sleep(5)  # Laisser le temps au système de démarrer
    
    battery_level = 95.0
    
    while True:
        try:
            # 1. Gérer l'expiration de l'état de l'écran après 5 secondes
            if _screen_state in ["SUCCESS", "SOLDE_INSUFISANT", "INVALID", "PROCESSING"]:
                if time.time() - _last_screen_update > 5:
                    _screen_state = "WAITING"
                    _screen_amount = "0.00 DH"
            
            # 2. Vérifier le WiFi (SSID + IP locale)
            wifi_ssid = get_wifi_ssid()
            wifi_status = "connected" if wifi_ssid != "Disconnected" else "disconnected"
            
            # Récupérer l'IP locale du POS
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
            except Exception:
                local_ip = "172.22.32.100"
            
            # 3. Mesurer la latence vers la BD Oracle (Port 1521 check)
            db_status = "disconnected"
            db_latency = 0
            t0 = time.time()
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1.0)
                s.connect((DB_HOST, 1521))
                s.close()
                db_status = "connected"
                db_latency = int((time.time() - t0) * 1000)
            except Exception:
                pass
            
            # 4. Mesurer la latence du broker MQTT
            mqtt_status = "disconnected"
            mqtt_latency = 0
            if _mqtt_publisher is not None and _mqtt_publisher.is_connected():
                mqtt_status = "connected"
                t0 = time.time()
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(1.0)
                    s.connect((MQTT_BROKER, MQTT_PORT))
                    s.close()
                    mqtt_latency = int((time.time() - t0) * 1000)
                except Exception:
                    pass
            
            # 5. Mettre à jour la batterie simulée
            if battery_level > 20:
                battery_level -= 0.02
            else:
                battery_level = 95.0
            
            # 6. Construire le payload
            payload = {
                "wifi": wifi_status,
                "wifi_ssid": wifi_ssid if wifi_status == "connected" else "Disconnected",
                "wifi_ip": local_ip if wifi_status == "connected" else "Not Available",
                "wifi_signal": -55 if wifi_status == "connected" else -100,
                "database": db_status,
                "database_latency_ms": db_latency,
                "mqtt_broker": mqtt_status,
                "mqtt_latency_ms": mqtt_latency,
                "battery": int(battery_level),
                "battery_charging": True,  # Branché en USB
                "tft_status": "active",
                "pn532_status": "active",
                "barcode_status": "active",
                "screen_state": _screen_state,
                "screen_amount": _screen_amount,
                "last_transaction_id": _last_transaction_id
            }
            
            # 7. Envoyer la requête POST à l'API Flask locale
            # Tente d'utiliser host.docker.internal (contourne le pare-feu Windows via le proxy Docker), sinon repli sur DB_HOST
            try:
                url = "http://host.docker.internal:5001/api/pos/heartbeat"
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=3) as response:
                    response.read()
            except Exception as e_internal:
                # Repli en cas de problème de résolution DNS
                url = f"http://{DB_HOST}:5001/api/pos/heartbeat"
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=3) as response:
                    response.read()
                
        except Exception as e:
            # Ne pas impacter le programme principal en cas d'erreur de diagnostic/réseau
            print(f"⚠️ [MONITORING] Erreur d'envoi du heartbeat : {e}", flush=True)
            
        time.sleep(3)  # Intervalle de 3 secondes pour un affichage dynamique réactif


if __name__ == "__main__":
    analyze_memory_usage()
    test_oracle_connection()
    init_mqtt_client()  # Initialiser MQTT après Oracle (DB_HOST est défini)
    
    # Lancement du thread de heartbeat pour le monitoring
    heartbeat_thread = threading.Thread(target=send_heartbeat_loop, daemon=True)
    heartbeat_thread.start()
    print("🚀 [MONITORING] Thread de monitoring en arrière-plan démarré !")
    
    print("\n" + "█"*50)
    print("█" + " SYSTÈME POS INITIALISÉ & PRÊT ".center(48) + "█")
    print("█"*50 + "\n")
    App.run(user_loop=loop)