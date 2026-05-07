from confluent_kafka.admin import AdminClient

admin_client = AdminClient({'bootstrap.servers': 'localhost:9092'})

try:
    metadata = admin_client.list_topics(timeout=10)
    print("Topics found:")
    for topic in metadata.topics:
        print(f" - {topic}")
except Exception as e:
    print(f"Error listing topics: {e}")
