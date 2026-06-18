"""
Kafka → Oracle Consumer
========================
Consomme les messages Avro du topic Kafka 'MY-POS-BROKER',
les désérialise en JSON (dictionnaire Python),
puis les insère dans la table Oracle POS.Events.

Pipeline complet :
  POS Simulator → MQTT → Avro Proxy → Kafka [Avro] → CE SCRIPT → Oracle DB [JSON/colonnes]
"""

import io
import json
import oracledb
from fastavro import schemaless_reader, parse_schema
from confluent_kafka import Consumer, KafkaError

# ─────────────────────────────────────────────
# 1. Schéma Avro (Unifié avec pwc_api.py et le proxy)
# ─────────────────────────────────────────────
schema = {
    "namespace": "com.pfe.pos",
    "type": "record",
    "name": "CardEvent",
    "fields": [
        {"name": "id_card", "type": "string"},
        {"name": "PAN", "type": "string"},
        {"name": "F_name", "type": "string"},
        {"name": "L_name", "type": "string"},
        {"name": "Amount", "type": "float"},
        {"name": "POS_limit", "type": "float"},
        {"name": "ATM_limit", "type": "float"},
        {"name": "Status", "type": "string"},
        {"name": "Source", "type": "string"},
        {"name": "Operation", "type": "string"},
        {"name": "timestmp", "type": "string"}
    ]
}
parsed_schema = parse_schema(schema)

# ─────────────────────────────────────────────
# 2. Configuration Kafka Consumer
# ─────────────────────────────────────────────
KAFKA_BROKER = "localhost:9092"
KAFKA_TOPIC = "HPOS"
KAFKA_GROUP_ID = "oracle-consumer-hpos-v3"  # Nouveau groupe unifié

consumer = Consumer({
    'bootstrap.servers':  KAFKA_BROKER,
    'group.id':           KAFKA_GROUP_ID,
    'auto.offset.reset':  'latest',
    'session.timeout.ms': 45000,           # Augmenté pour Windows
    'heartbeat.interval.ms': 15000,
    'socket.keepalive.enable': True        # Aide à garder la connexion active
})
consumer.subscribe([KAFKA_TOPIC])

# ─────────────────────────────────────────────
# 3. Configuration Oracle DB
# ─────────────────────────────────────────────
ORACLE_USER = "POS"
ORACLE_PASSWORD = "Izinm123W"
ORACLE_DSN = "172.22.32.1:1521/XE"  # ← Adapter selon ta config (XE, ORCL, XEPDB1...)

# ─────────────────────────────────────────────
# 4. Fonction : Avro binaire → Dictionnaire Python (JSON)
# ─────────────────────────────────────────────
def avro_to_json(avro_bytes):
    """Désérialise un message Avro binaire (schemaless) en dictionnaire Python."""
    bytes_io = io.BytesIO(avro_bytes)
    record = schemaless_reader(bytes_io, parsed_schema)
    return record

# ─────────────────────────────────────────────
# 5. Fonction : Insérer et synchroniser dans Oracle
# ─────────────────────────────────────────────
import datetime

def insert_into_oracle(connection, record):
    """Mappe les champs Avro, gère les transactions de paiement et insère dans les tables correspondantes."""
    id_card = record.get("id_card", "UNKNOWN")
    pan = record.get("PAN", "")
    f_name = record.get("F_name", "")
    l_name = record.get("L_name", "")
    amount = record.get("Amount", 0.0)
    pos_limit = record.get("POS_limit", 0.0)
    atm_limit = record.get("ATM_limit", 0.0)
    status = record.get("Status", "Active")
    source = record.get("Source", "PWC_System")
    operation = record.get("Operation", "Create")
    timestmp_str = record.get("timestmp", "")

    # Parser le timestamp en objet datetime pour éviter les erreurs de format de chaîne dans Oracle
    try:
        ts_clean = timestmp_str.split("+")[0]
        dt_val = datetime.datetime.fromisoformat(ts_clean)
    except Exception:
        dt_val = datetime.datetime.now()

    cursor = connection.cursor()

    if operation == "Paiement" or source == "POS_Terminal":
        print(f"[KAFKA] Traitement d'un paiement asynchrone pour la carte {id_card}")

        # 1. Récupérer le NFC_UID existant de la carte dans Externel_System (car le schéma CardEvent ne le contient pas)
        nfc_uid = None
        try:
            cursor.execute("""
                SELECT NFC_UID FROM (
                    SELECT NFC_UID FROM POS.Externel_System 
                    WHERE id_Card = :id_card AND NFC_UID IS NOT NULL 
                    ORDER BY TIMESTMP DESC
                ) WHERE ROWNUM = 1
            """, {"id_card": id_card})
            row = cursor.fetchone()
            if row:
                nfc_uid = row[0]
        except Exception as ex:
            print(f"[ERROR] Erreur lors de la recuperation du NFC_UID : {ex}")

        # 2. Insertion dans POS.Events (Audit de paiement)
        sql_events = """
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts,
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, :Status, :Source, :Operation, :timestmp
            )
        """
        cursor.execute(sql_events, {
            "id_card": id_card,
            "PAN": pan,
            "F_Name": f_name,
            "L_Name": l_name,
            "Amount": amount,
            "POS_limit": pos_limit,
            "ATM_limit": atm_limit,
            "Status": status,
            "Source": source,
            "Operation": operation,
            "timestmp": dt_val
        })

        # 3. Insertion dans POS.Externel_System (Met à jour le solde pour l'External System)
        sql_ext = """
            INSERT INTO POS.Externel_System (
                id_Card, PAN, F_Name, L_Name, Amount,
                POS_limit, ATM_limit, Status, Source, Operation, NFC_UID, Timestmp
            ) VALUES (
                :id_card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, :Status, :Source, :Operation, :nfc_uid, :timestmp
            )
        """
        cursor.execute(sql_ext, {
            "id_card": id_card,
            "PAN": pan,
            "F_Name": f_name,
            "L_Name": l_name,
            "Amount": amount,
            "POS_limit": pos_limit,
            "ATM_limit": atm_limit,
            "Status": status,
            "Source": source,
            "Operation": operation,
            "nfc_uid": nfc_uid,
            "timestmp": dt_val
        })

        # 4. Vérifier si existant dans PowerCard_System pour synchronisation du solde
        cursor.execute("SELECT COUNT(*) FROM POS.PowerCard_System WHERE id_Card = :id", {"id": id_card})
        exists_pwc = cursor.fetchone()[0] > 0

        if exists_pwc:
            sql_pwc = """
                INSERT INTO POS.PowerCard_System (
                    id_Card, PAN, F_Name, L_Name, Amount,
                    POS_limit, ATM_limit, Status, Source, Operation, TIMESTMP
                ) VALUES (
                    :id_card, :PAN, :F_Name, :L_Name, :Amount,
                    :POS_limit, :ATM_limit, :Status, :Source, :Operation, :timestmp
                )
            """
            cursor.execute(sql_pwc, {
                "id_card": id_card,
                "PAN": pan,
                "F_Name": f_name,
                "L_Name": l_name,
                "Amount": amount,
                "POS_limit": pos_limit,
                "ATM_limit": atm_limit,
                "Status": status,
                "Source": source,
                "Operation": operation,
                "timestmp": dt_val
            })

        connection.commit()
        print(f"[ORACLE] Paiement persistant asynchrone enregistre avec succes pour la carte {id_card}")
    else:
        # Événement administratif déjà persisté par l'API Flask, on évite les doublons dans Events
        print(f"[KAFKA] Evenement administratif '{operation}' ignore (deja ecrit par l'API)")

    cursor.close()

# ─────────────────────────────────────────────
# 6. Boucle principale : Kafka Consumer → Oracle
# ─────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  [KAFKA] Kafka -> Oracle Consumer")
    print(f"  Topic  : {KAFKA_TOPIC}")
    print(f"  Oracle : {ORACLE_USER}@{ORACLE_DSN}")
    print("=" * 60)

    # Connexion Oracle
    try:
        connection = oracledb.connect(
            user=ORACLE_USER,
            password=ORACLE_PASSWORD,
            dsn=ORACLE_DSN
        )
        print(f"[OK] Connecte a Oracle DB (version {connection.version})")
    except Exception as e:
        print(f"[ERROR] Erreur connexion Oracle : {e}")
        return

    print(f"[INFO] En attente de messages sur le topic '{KAFKA_TOPIC}'...\n")

    try:
        poll_count = 0
        while True:
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                poll_count += 1
                if poll_count >= 60:
                    print("[INFO] Consumer en attente de messages (Kafka OK)...")
                    poll_count = 0
                continue
            
            poll_count = 0 # Reset on message

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    print(f"[ERROR] Erreur Kafka : {msg.error()}")
                    continue

            # ── Étape 1 : Désérialiser Avro → JSON ──
            avro_bytes = msg.value()
            record = avro_to_json(avro_bytes)

            print(f"[KAFKA] Message recu (Avro -> JSON) :")
            print(f"   {json.dumps(record, indent=2, default=str)}")

            # ── Étape 2 : Insérer dans Oracle ──
            try:
                insert_into_oracle(connection, record)
                print(f"[ORACLE] Traite avec succes pour la carte : {record['id_card']}\n")
            except Exception as e:
                print(f"[ERROR] Erreur insertion : {e}\n")
                connection.rollback()

    except KeyboardInterrupt:
        print("\n[INFO] Arret du consumer...")
    finally:
        consumer.close()
        connection.close()
        print("[INFO] Connexions fermees.")

if __name__ == "__main__":
    main()
