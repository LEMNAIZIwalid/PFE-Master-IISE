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
# 1. Schéma Avro (identique à mqtt_kafka_proxy.py)
# ─────────────────────────────────────────────
schema = {
    "namespace": "com.pfe.pos",
    "type": "record",
    "name": "Transaction",
    "fields": [
        {"name": "client_id", "type": "string"},
        {"name": "card_id", "type": "string"},
        {"name": "PAN", "type": "string"},
        {"name": "Amount", "type": "float"},
        {"name": "F_name", "type": "string"},
        {"name": "L_name", "type": "string"},
        {"name": "Modify_by", "type": "string"},
        {"name": "timestmp", "type": "string"}
    ]
}
parsed_schema = parse_schema(schema)

# ─────────────────────────────────────────────
# 2. Configuration Kafka Consumer
# ─────────────────────────────────────────────
KAFKA_BROKER = "localhost:9092"
KAFKA_TOPIC = "HPOS"
KAFKA_GROUP_ID = "oracle-consumer-hpos"  # Nouveau groupe pour le nouveau topic

consumer = Consumer({
    'bootstrap.servers':  KAFKA_BROKER,
    'group.id':           KAFKA_GROUP_ID,
    'auto.offset.reset':  'earliest',
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
# 5. Fonction : Insérer dans Oracle POS.Events
# ─────────────────────────────────────────────
INSERT_SQL = """
    INSERT INTO POS.Events (
        id_card, PAN, F_Name, L_Name, Amounts,
        POS_limit, ATM_limit, Status, Source, Operation, Timetmp
    ) VALUES (
        :id_card, :PAN, :F_Name, :L_Name, :Amounts,
        :POS_limit, :ATM_limit, :Status, :Source, :Operation,
        TO_TIMESTAMP(:Timetmp, 'YYYY-MM-DD"T"HH24:MI:SS.FF')
    )
"""

def insert_into_oracle(connection, record):
    """Mappe les champs Avro vers les colonnes Oracle et insère dans POS.Events."""
    # Mapping Avro → Oracle avec valeurs par défaut
    params = {
        "id_card":    record.get("card_id", "UNKNOWN"),
        "PAN":        record.get("PAN", ""),
        "F_Name":     record.get("F_name", ""),
        "L_Name":     record.get("L_name", ""),
        "Amounts":    record.get("Amount", 0.0),
        "POS_limit":  record.get("POS_limit", None),
        "ATM_limit":  record.get("ATM_limit", None),
        "Status":     record.get("Status", "Active"),
        "Source":     record.get("Source", "PWC_System"),
        "Operation":  record.get("Operation", "Create"),
        "Timetmp":    record.get("timestmp", "")
    }

    cursor = connection.cursor()
    cursor.execute(INSERT_SQL, params)
    connection.commit()
    cursor.close()

# ─────────────────────────────────────────────
# 6. Boucle principale : Kafka Consumer → Oracle
# ─────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  🔗 Kafka → Oracle Consumer")
    print(f"  📡 Topic  : {KAFKA_TOPIC}")
    print(f"  🗄️  Oracle : {ORACLE_USER}@{ORACLE_DSN}")
    print("=" * 60)

    # Connexion Oracle
    try:
        connection = oracledb.connect(
            user=ORACLE_USER,
            password=ORACLE_PASSWORD,
            dsn=ORACLE_DSN
        )
        print(f"✅ Connecté à Oracle DB (version {connection.version})")
    except Exception as e:
        print(f"❌ Erreur connexion Oracle : {e}")
        return

    print(f"📡 En attente de messages sur le topic '{KAFKA_TOPIC}'...\n")

    try:
        poll_count = 0
        while True:
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                poll_count += 1
                if poll_count >= 60:
                    print("⌛ Consumer en attente de messages (Kafka OK)...")
                    poll_count = 0
                continue
            
            poll_count = 0 # Reset on message

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    print(f"❌ Erreur Kafka : {msg.error()}")
                    continue

            # ── Étape 1 : Désérialiser Avro → JSON ──
            avro_bytes = msg.value()
            record = avro_to_json(avro_bytes)

            print(f"📥 [KAFKA] Message reçu (Avro → JSON) :")
            print(f"   {json.dumps(record, indent=2, default=str)}")

            # ── Étape 2 : Insérer dans Oracle ──
            try:
                insert_into_oracle(connection, record)
                print(f"✅ [ORACLE] Inséré dans POS.Events : {record['card_id']}\n")
            except Exception as e:
                print(f"❌ [ORACLE] Erreur insertion : {e}\n")
                connection.rollback()

    except KeyboardInterrupt:
        print("\n🛑 Arrêt du consumer...")
    finally:
        consumer.close()
        connection.close()
        print("🔌 Connexions fermées.")

if __name__ == "__main__":
    main()
