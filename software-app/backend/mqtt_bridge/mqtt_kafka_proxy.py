import paho.mqtt.client as mqtt
import json
import io
from fastavro import schemaless_writer, parse_schema
from confluent_kafka import Producer

# 1. Schéma Avro
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

# 2. Configuration
MQTT_BROKER = "localhost"
MQTT_TOPIC = "pos/transactions"
KAFKA_BROKER = "localhost:9092"
KAFKA_TOPIC = "MY-POS-BROKER"  # Nouveau Topic

# Initialisation Kafka
producer = Producer({'bootstrap.servers': KAFKA_BROKER})

def json_to_avro_record(data):
    """Convertit en Avro binaire pur (format attendu par Kafka)."""
    bytes_io = io.BytesIO()
    # On utilise schemaless_writer pour ne pas avoir l'en-tête "Obj" inutile dans Kafka
    schemaless_writer(bytes_io, parsed_schema, data)
    return bytes_io.getvalue()

def on_message(client, userdata, msg):
    try:
        # Réception
        payload = msg.payload.decode()
        data = json.loads(payload)
        print(f"📥 [MQTT] Reçu : {data['card_id']}")

        # Conversion
        avro_record = json_to_avro_record(data)
        
        # Envoi Kafka
        producer.produce(
            topic=KAFKA_TOPIC,
            key=str(data['card_id']),
            value=avro_record
        )
        producer.flush()
        print(f"🚀 [KAFKA] Avro envoyé vers '{KAFKA_TOPIC}'")

    except Exception as e:
        print(f"❌ Erreur : {e}")

# Configuration MQTT
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
client.on_message = on_message

print(f"✅ Proxy actif : MQTT ➔ Kafka ({KAFKA_TOPIC})")

try:
    client.connect(MQTT_BROKER, 1883, 60)
    client.subscribe(MQTT_TOPIC)
    client.loop_forever()
except KeyboardInterrupt:
    print("\nArrêt.")
