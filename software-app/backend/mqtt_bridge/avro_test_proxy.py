import paho.mqtt.client as mqtt
import json
import io
from fastavro import writer, parse_schema
from confluent_kafka import Producer

# 1. Définition du schéma Avro
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
KAFKA_TOPIC = "test-pos1"

# Client Kafka (optionnel pour ce test d'affichage)
try:
    producer = Producer({'bootstrap.servers': KAFKA_BROKER})
except Exception:
    producer = None

def json_to_avro(data):
    """Convertit un dictionnaire Python en binaire Avro."""
    bytes_io = io.BytesIO()
    writer(bytes_io, parsed_schema, [data])
    return bytes_io.getvalue()

def on_message(client, userdata, msg):
    try:
        # Réception JSON
        payload = msg.payload.decode()
        print(f"\n📥 [MQTT] JSON reçu : {payload}")
        data = json.loads(payload)

        # Conversion Avro
        avro_binary = json_to_avro(data)
        
        print(f"[CONVERSION] Transformation en format Avro...")
        print(f"[AVRO BINARY] : {avro_binary.hex()}") # Affiche en Hexadécimal
        print(f"Taille : {len(avro_binary)} octets")

        # Envoi à Kafka (si dispo)
        if producer:
            producer.produce(
                topic=KAFKA_TOPIC,
                key=str(data['card_id']),
                value=avro_binary
            )
            producer.flush(1)
            print(f"[KAFKA] Avro envoyé avec key card_id vers '{KAFKA_TOPIC}'")

    except Exception as e:
        print(f"[ERROR] Erreur : {e}")

# Configuration MQTT
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
client.on_message = on_message

print(f"[INFO] Proxy de test démarré...")
print(f"[INFO] Écoute sur MQTT: {MQTT_TOPIC}")

try:
    client.connect(MQTT_BROKER, 1883, 60)
    client.subscribe(MQTT_TOPIC)
    client.loop_forever()
except KeyboardInterrupt:
    print("\nArrêt.")
