import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime

# MQTT Configuration
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "pos/transactions"

def generate_card_transaction():
    """Simule la lecture d'une carte NTAG et génère une transaction."""
    return {
        "client_id": f"CLI-{random.randint(1000, 9999)}",
        "card_id": f"CRD-{random.randint(100000, 999999)}",
        "PAN": f"4532-XXXX-XXXX-{random.randint(1000, 9999)}",
        "Amount": round(random.uniform(10.0, 500.0), 2),
        "F_name": "John",
        "L_name": "Doe",
        "Modify_by": "POS_Terminal",
        "timestmp": datetime.now().isoformat()
    }

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connecté au Broker MQTT avec succès !")
    else:
        print(f"Échec de connexion, code retour {rc}")

# Initialisation du client MQTT (Compatible Paho 2.0)
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
client.on_connect = on_connect

try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    print(f"Simulateur POS démarré sur le topic: {MQTT_TOPIC}")
    
    while True:
        transaction = generate_card_transaction()
        json_payload = json.dumps(transaction)
        result = client.publish(MQTT_TOPIC, json_payload)
        
        if result[0] == 0:
            print(f" [OK] Transaction envoyee: {transaction['card_id']} | Montant: {transaction['Amount']}")
        else:
            print(f" [ERROR] Erreur d'envoi vers {MQTT_TOPIC}")
            
        time.sleep(5)

except KeyboardInterrupt:
    print("\nArret du simulateur...")
finally:
    client.loop_stop()
    client.disconnect()
