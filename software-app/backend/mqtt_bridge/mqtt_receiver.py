import paho.mqtt.client as mqtt
import json

# Configuration identique au simulateur
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "pos/transactions"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✔ [MQTT RECEIVER] Connecté au Broker ({MQTT_BROKER})")
        client.subscribe(MQTT_TOPIC)
        print(f"📡 En attente de transactions sur le topic '{MQTT_TOPIC}'...\n")
    else:
        print(f"✘ Échec de connexion, code retour {rc}")

def on_message(client, userdata, msg):
    try:
        # On décode le message JSON reçu
        payload = msg.payload.decode()
        data = json.loads(payload)
        
        print(f"--- Nouvelle Transaction Reçue ---")
        print(f"ID Carte   : {data.get('card_id')}")
        print(f"Client     : {data.get('F_name')} {data.get('L_name')}")
        print(f"Montant    : {data.get('Amount')} €")
        print(f"Horodatage : {data.get('timestmp')}")
        print(f"----------------------------------\n")
        
    except Exception as e:
        print(f"Erreur de lecture : {e}")

# Initialisation du client (Compatible Paho 2.0)
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
client.on_connect = on_connect
client.on_message = on_message

try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()
except KeyboardInterrupt:
    print("\nArrêt du récepteur MQTT.")
except Exception as e:
    print(f"Erreur : {e}")
