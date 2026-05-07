from confluent_kafka import Producer
import sys

# Configuration basée sur vos infos
KAFKA_CONF = {'bootstrap.servers': 'localhost:9092'}
TOPIC = 'test-pos1'

def receipt(err, msg):
    if err is not None:
        print(f"✘ ÉCHEC : {err}")
    else:
        print(f"✔ SUCCÈS : Message envoyé au topic '{msg.topic()}' !")

try:
    p = Producer(KAFKA_CONF)
    print(f"Tentative d'envoi d'un message test vers {KAFKA_CONF['bootstrap.servers']}...")
    
    p.produce(TOPIC, key='test_key', value='Hello from Python test script', on_delivery=receipt)
    
    # Attendre 5 secondes max pour confirmer l'envoi
    p.flush(5)
    
except Exception as e:
    print(f"!!! ERREUR CRITIQUE : {e}")

print("Test terminé.")
