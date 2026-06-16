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

def on_payment_success(tag_uid, amount_str="0"):
    """Callback déclenché quand le module NFC PN532 détecte un badge NTag et effectue le paiement"""
    print("\n" + "═"*50)
    print("║" + " PAIEMENT NFC DÉTECTÉ ".center(48) + "║")
    print("═"*50)
    print(f"║ UID du NTag : {tag_uid.center(32)} ║")
    print(f"║ Montant     : {f'{amount_str} EUR'.center(32)} ║")
    print("═"*50 + "\n")

    if oracledb is None:
        print("⚠️ [ERREUR] Module oracledb non disponible.")
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

            # 2. Insertion dans Externel_System
            sql_ext_insert = """
                INSERT INTO POS.Externel_System (
                    id_Card, PAN, F_Name, L_Name, Amount,
                    POS_limit, ATM_limit, Status, Source, Operation, NFC_UID, Timestmp
                ) VALUES (
                    :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                    :POS_limit, :ATM_limit, :Status, 'POS_Terminal', 'Paiement', :nfc_uid, CURRENT_TIMESTAMP
                )
            """
            cursor.execute(sql_ext_insert, {
                "id_Card": id_card,
                "PAN": pan,
                "F_Name": f_name,
                "L_Name": l_name,
                "Amount": new_balance,
                "POS_limit": float(pos_limit) if pos_limit else 0.0,
                "ATM_limit": float(atm_limit) if atm_limit else 0.0,
                "Status": status,
                "nfc_uid": tag_uid
            })

            # 3. Vérifier si existant dans PowerCard_System pour synchronisation
            cursor.execute("SELECT COUNT(*) FROM POS.PowerCard_System WHERE id_Card = :id", {"id": id_card})
            exists_pwc = cursor.fetchone()[0] > 0

            if exists_pwc:
                sql_pwc_insert = """
                    INSERT INTO POS.PowerCard_System (
                        id_Card, PAN, F_Name, L_Name, Amount,
                        POS_limit, ATM_limit, Status, Source, Operation, Timestmp
                    ) VALUES (
                        :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                        :POS_limit, :ATM_limit, :Status, 'POS_Terminal', 'Paiement', CURRENT_TIMESTAMP
                    )
                """
                cursor.execute(sql_pwc_insert, {
                    "id_Card": id_card,
                    "PAN": pan,
                    "F_Name": f_name,
                    "L_Name": l_name,
                    "Amount": new_balance,
                    "POS_limit": float(pos_limit) if pos_limit else 0.0,
                    "ATM_limit": float(atm_limit) if atm_limit else 0.0,
                    "Status": status
                })

            # 4. Insertion dans Events pour Audit
            sql_event_insert = """
                INSERT INTO POS.Events (
                    id_card, PAN, F_Name, L_Name, Amounts,
                    POS_limit, ATM_limit, Status, Source, Operation, Timetmp
                ) VALUES (
                    :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                    :POS_limit, :ATM_limit, :Status, 'POS_Terminal', 'Paiement', CURRENT_TIMESTAMP
                )
            """
            cursor.execute(sql_event_insert, {
                "id_Card": id_card,
                "PAN": pan,
                "F_Name": f_name,
                "L_Name": l_name,
                "Amount": new_balance,
                "POS_limit": float(pos_limit) if pos_limit else 0.0,
                "ATM_limit": float(atm_limit) if atm_limit else 0.0,
                "Status": status
            })

            connection.commit()

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
            return "OK"
        else:
            print("═"*50)
            print("║" + " ❌ NTAG ID INVALIDE ".center(48) + "║")
            print("═"*50)
            print(f"║ UID non trouvé dans la table Externel_System   ║")
            print("═"*50 + "\n")
            cursor.close()
            connection.close()
            return "INVALID"

    except Exception as e:
        print(f"⚠️ Erreur lors du paiement Oracle : {e}\n")
        if connection:
            try:
                connection.close()
            except Exception:
                pass
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
    if oracledb is None:
        print("[ERREUR] Module oracledb non disponible.")
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

if __name__ == "__main__":
    analyze_memory_usage()
    test_oracle_connection()
    init_mqtt_client()  # Initialiser MQTT après Oracle (DB_HOST est défini)
    print("\n" + "█"*50)
    print("█" + " SYSTÈME POS INITIALISÉ & PRÊT ".center(48) + "█")
    print("█"*50 + "\n")
    App.run(user_loop=loop)