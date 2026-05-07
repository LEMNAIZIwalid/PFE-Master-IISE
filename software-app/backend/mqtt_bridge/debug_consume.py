from confluent_kafka import Consumer, KafkaError

c = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'temp-debug-group-123',
    'auto.offset.reset': 'earliest'
})

c.subscribe(['MY-POS-BROKER'])

print("Searching for one message in MY-POS-BROKER...")
msg = c.poll(10.0)

if msg is None:
    print("No message found after 10 seconds.")
elif msg.error():
    print(f"Error: {msg.error()}")
else:
    print(f"Success! Received message: {msg.value()[:50]}...")

c.close()
