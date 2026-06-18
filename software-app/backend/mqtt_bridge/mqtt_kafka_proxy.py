import paho.mqtt.client as mqtt
import json
import io
from fastavro import schemaless_writer, parse_schema
from confluent_kafka import Producer

# 1. Schéma Avro (Unifié avec pwc_api.py et le consumer)
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

# 2. Configuration
MQTT_BROKER = "localhost"
MQTT_TOPIC = "pos/transactions"
KAFKA_BROKER = "localhost:9092"
KAFKA_TOPIC = "HPOS"  # Topic HPOS

# Initialisation Kafka
producer = Producer({'bootstrap.servers': KAFKA_BROKER})

def json_to_avro_record(data):
    """Convertit en Avro binaire pur (format attendu par Kafka) avec schéma à 11 champs."""
    # Mappage des champs MQTT (8 champs) vers le schéma Kafka (11 champs)
    mapped_data = {
        "id_card":   str(data.get("card_id", "")),
        "PAN":       str(data.get("PAN", "")),
        "F_name":    str(data.get("F_name", "")),
        "L_name":    str(data.get("L_name", "")),
        "Amount":    float(data.get("Amount", 0.0)),
        "POS_limit": 0.0,
        "ATM_limit": 0.0,
        "Status":    "Active",
        "Source":    str(data.get("Modify_by", "POS_Terminal")),
        "Operation": "Paiement",
        "timestmp":  str(data.get("timestmp", ""))
    }
    bytes_io = io.BytesIO()
    schemaless_writer(bytes_io, parsed_schema, mapped_data)
    return bytes_io.getvalue()

def on_message(client, userdata, msg):
    try:
        # Réception
        payload = msg.payload.decode()
        data = json.loads(payload)
        print(f"[MQTT] Recu transaction pour : {data['card_id']}")

        # Conversion
        avro_record = json_to_avro_record(data)
        
        # Envoi Kafka
        producer.produce(
            topic=KAFKA_TOPIC,
            key=str(data['card_id']),
            value=avro_record
        )
        producer.flush()
        print(f"[KAFKA] Avro envoye vers '{KAFKA_TOPIC}' pour la carte {data['card_id']}")

    except Exception as e:
        print(f"[ERROR] Erreur : {e}")

# Configuration MQTT
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
client.on_message = on_message

print(f"[OK] Proxy actif : MQTT -> Kafka ({KAFKA_TOPIC})")

try:
    client.connect(MQTT_BROKER, 1883, 60)
    client.subscribe(MQTT_TOPIC)
    client.loop_forever()
except KeyboardInterrupt:
    print("\nArret.")
