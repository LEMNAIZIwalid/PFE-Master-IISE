from flask import Flask, request, jsonify
from flask_cors import CORS
import oracledb
import datetime
import json
import io
from fastavro import writer, parse_schema
from confluent_kafka import Producer

app = Flask(__name__)
CORS(app) # Autorise le Frontend React à communiquer avec cette API

# --- CONFIGURATION KAFKA & AVRO ---
KAFKA_BROKER = "localhost:9092"
KAFKA_TOPIC = "card-events"

CARD_EVENT_SCHEMA = {
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
parsed_schema = parse_schema(CARD_EVENT_SCHEMA)

# Initialisation du Producer Kafka
try:
    producer = Producer({'bootstrap.servers': KAFKA_BROKER})
    print(f"✅ Kafka Producer initialized (Broker: {KAFKA_BROKER})")
except Exception as e:
    print(f"❌ Failed to initialize Kafka Producer: {e}")
    producer = None

def send_to_kafka(data, topic=KAFKA_TOPIC):
    """Convertit les données en Avro et les envoie à Kafka."""
    if not producer:
        return
    
    try:
        # Préparation des données pour Avro
        avro_data = {
            "id_card":   str(data.get('id_Card', '')),
            "PAN":       str(data.get('PAN', '')),
            "F_name":    str(data.get('F_Name', '')),
            "L_name":    str(data.get('L_Name', '')),
            "Amount":    float(data.get('Amount', 0.0)) if data.get('Amount') else 0.0,
            "POS_limit": float(data.get('POS_limit', 0.0)) if data.get('POS_limit') else 0.0,
            "ATM_limit": float(data.get('ATM_limit', 0.0)) if data.get('ATM_limit') else 0.0,
            "Status":    str(data.get('Status', 'Active')),
            "Source":    str(data.get('Source', 'Unknown')),
            "Operation": str(data.get('Operation', 'Unknown')),
            "timestmp":  datetime.datetime.now().isoformat()
        }
        
        # Sérialisation Avro
        bytes_io = io.BytesIO()
        writer(bytes_io, parsed_schema, [avro_data])
        avro_binary = bytes_io.getvalue()
        
        # Envoi
        producer.produce(
            topic=topic,
            key=str(avro_data['id_card']),
            value=avro_binary
        )
        producer.flush(1)
        print(f"🚀 [KAFKA] Event sent (Avro) to topic '{topic}' for card {avro_data['id_card']}")
    except Exception as e:
        print(f"❌ Error sending to Kafka: {e}")

# --- CONFIGURATION ORACLE ---
ORACLE_USER = "###"
ORACLE_PASSWORD = "###"
ORACLE_DSN = "####"

def get_oracle_connection():
    return oracledb.connect(
        user=ORACLE_USER,
        password=ORACLE_PASSWORD,
        dsn=ORACLE_DSN
    )

@app.route('/api/create-card', methods=['POST'])
def create_card():
    data = request.json
    print(f"Request received for card creation : {data.get('id_Card')}")
    
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        # 1. Insertion dans PowerCard_System
        sql_pwc = """
            INSERT INTO POS.PowerCard_System (
                id_Card, PAN, F_Name, L_Name, Amount, 
                POS_limit, ATM_limit, Status, Source, Operation, TIMESTMP
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, :Status, :Source, :Operation, CURRENT_TIMESTAMP
            )
        """
        
        # 2. Insertion dans Events (Audit)
        sql_events = """
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts, 
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, :Status, :Source, :Operation, CURRENT_TIMESTAMP
            )
        """
        
        # Paramètres communs
        params = {
            "id_Card":   data.get('id_Card'),
            "PAN":       data.get('PAN'),
            "F_Name":    data.get('F_Name'),
            "L_Name":    data.get('L_Name'),
            "Amount":    float(data.get('Amount')) if data.get('Amount') else 0.0,
            "POS_limit": float(data.get('POS_limit')) if data.get('POS_limit') else 0.0,
            "ATM_limit": float(data.get('ATM_limit')) if data.get('ATM_limit') else 0.0,
            "Status":    data.get('Status', 'Active'),
            "Source":    data.get('Source', 'PWC_System'),
            "Operation": data.get('Operation', 'Create')
        }
        
        cursor.execute(sql_pwc, params)
        cursor.execute(sql_events, params)
        connection.commit()
        
        # Stream to Kafka (Avro) -> Topic HPOS for creation
        send_to_kafka(params, topic="HPOS")
        
        print(f"Card {data.get('id_Card')} successfully registered in PWC_System and Events (HPOS stream).")
        return jsonify({"status": "success", "message": f"Card {data.get('id_Card')} created and streamed to HPOS"}), 201
        
    except Exception as e:
        print(f"Oracle Error : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/update-card', methods=['POST'])
def update_card():
    data = request.json
    print(f"Request received for card update : {data.get('id_Card')}")
    
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        # 1. Insertion dans PowerCard_System
        sql_pwc = """
            INSERT INTO POS.PowerCard_System (
                id_Card, PAN, F_Name, L_Name, Amount, 
                POS_limit, ATM_limit, Status, Source, Operation, TIMESTMP
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, :Status, :Source, :Operation, CURRENT_TIMESTAMP
            )
        """
        
        # 2. Insertion dans Events (Audit)
        sql_events = """
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts, 
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, :Status, :Source, :Operation, CURRENT_TIMESTAMP
            )
        """
        
        # Préparation des paramètres
        source = data.get('Source', 'PWC_System')
        params = {
            "id_Card":   data.get('id_Card'),
            "PAN":       data.get('PAN'),
            "F_Name":    data.get('F_Name'),
            "L_Name":    data.get('L_Name'),
            "Amount":    float(data.get('Amount')) if data.get('Amount') else 0.0,
            "POS_limit": float(data.get('POS_limit')) if data.get('POS_limit') else 0.0,
            "ATM_limit": float(data.get('ATM_limit')) if data.get('ATM_limit') else 0.0,
            "Status":    data.get('Status', 'Active'),
            "Source":    source,
            "Operation": "Update"
        }
        
        cursor.execute(sql_pwc, params)
        
        event_params = params.copy()
        if source == 'Externel_System':
            event_params["Source"] = 'PWC_System'
        
        cursor.execute(sql_events, event_params)

        if source == 'Externel_System':
            sql_ext = """
                INSERT INTO POS.Externel_System (
                    id_Card, PAN, F_Name, L_Name, Amount, 
                    POS_limit, ATM_limit, Status, Source, Operation, Timstmp
                ) VALUES (
                    :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                    :POS_limit, :ATM_limit, :Status, :Source, :Operation, CURRENT_TIMESTAMP
                )
            """
            cursor.execute(sql_ext, params)
        
        connection.commit()
        
        # Stream to Kafka (Avro) -> Topic HPOS for updates by PWC Admin
        send_to_kafka(params, topic="HPOS")
        
        print(f"Card {data.get('id_Card')} update successfully registered (HPOS stream).")
        return jsonify({"status": "success", "message": f"Card {data.get('id_Card')} updated successfully"}), 200
        
    except Exception as e:
        print(f"Oracle Error during update : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/delete-card', methods=['POST'])
def delete_card():
    data = request.json
    print(f"Request received for card deletion : {data.get('id_Card')}")
    
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        sql_pwc = """
            INSERT INTO POS.PowerCard_System (
                id_Card, PAN, F_Name, L_Name, Amount, 
                POS_limit, ATM_limit, Status, Source, Operation, TIMESTMP
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, 'blocked', :Source, :Operation, CURRENT_TIMESTAMP
            )
        """

        sql_events = """
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts, 
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, 'blocked', :Source, :Operation, CURRENT_TIMESTAMP
            )
        """
        
        source = data.get('Source', 'PWC_System')
        params = {
            "id_Card":   data.get('id_Card'),
            "PAN":       data.get('PAN'),
            "F_Name":    data.get('F_Name'),
            "L_Name":    data.get('L_Name'),
            "Amount":    float(data.get('Amount')) if data.get('Amount') else 0.0,
            "POS_limit": float(data.get('POS_limit')) if data.get('POS_limit') else 0.0,
            "ATM_limit": float(data.get('ATM_limit')) if data.get('ATM_limit') else 0.0,
            "Source":    source,
            "Operation": "DELETE"
        }
        
        cursor.execute(sql_pwc, params)
        
        event_params = params.copy()
        if source == 'Externel_System':
            event_params["Source"] = 'PWC_System'
            
        cursor.execute(sql_events, event_params)

        if source == 'Externel_System':
            sql_ext = """
                INSERT INTO POS.Externel_System (
                    id_Card, PAN, F_Name, L_Name, Amount, 
                    POS_limit, ATM_limit, Status, Source, Operation, Timestmp
                ) VALUES (
                    :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                    :POS_limit, :ATM_limit, 'blocked', :Source, :Operation, CURRENT_TIMESTAMP
                )
            """
            cursor.execute(sql_ext, params)

        connection.commit()
        
        # Stream to Kafka (Avro) -> Topic HPOS for deletion by PWC Admin
        params["Status"] = "blocked"
        send_to_kafka(params, topic="HPOS")

        return jsonify({"status": "success", "message": f"Card {data.get('id_Card')} deleted"}), 200
        
    except Exception as e:
        print(f"Oracle Error during deletion : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/cards', methods=['GET'])
def get_cards():
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        sql = """
            SELECT ID_CARD, PAN, F_NAME, L_NAME, OPERATION, AMOUNT, STATUS, SOURCE, TIMESTMP, POS_LIMIT, ATM_LIMIT
            FROM (
                SELECT ID_CARD, PAN, F_NAME, L_NAME, OPERATION, AMOUNT, STATUS, SOURCE, TIMESTMP, POS_LIMIT, ATM_LIMIT,
                       ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
                FROM POS.PowerCard_System
            ) WHERE rn = 1
            ORDER BY TIMESTMP DESC
        """
        cursor.execute(sql)

        columns = [col[0] for col in cursor.description]
        cards = []
        for row in cursor:
            cards.append(dict(zip(columns, row)))
            
        return jsonify(cards), 200
    except Exception as e:
        print(f"Oracle Error : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/events', methods=['GET'])
def get_events():
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            SELECT ID_EVENT, ID_CARD, PAN, F_NAME, L_NAME, AMOUNTS, 
                   POS_LIMIT, ATM_LIMIT, STATUS, SOURCE, OPERATION, TIMETMP 
            FROM POS.Events 
            ORDER BY TIMETMP DESC
        """)
        
        columns = [col[0] for col in cursor.description]
        events = []
        for row in cursor:
            events.append(dict(zip(columns, row)))
            
        return jsonify(events), 200
    except Exception as e:
        print(f"Oracle Events Error : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/external/create', methods=['POST'])
def external_create_card():
    data = request.json
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        sql_ext = """
            INSERT INTO POS.Externel_System (
                id_Card, PAN, F_Name, L_Name, Amount, 
                POS_limit, ATM_limit, Status, Source, Operation, Timestmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, :Status, :Source, :Operation, CURRENT_TIMESTAMP
            )
        """
        
        sql_events = """
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts, 
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, :Status, :Source, :Operation, CURRENT_TIMESTAMP
            )
        """
        
        params = {
            "id_Card":   data.get('id_Card'),
            "PAN":       data.get('PAN'),
            "F_Name":    data.get('F_Name'),
            "L_Name":    data.get('L_Name'),
            "Amount":    float(data.get('Amount')) if data.get('Amount') else 0.0,
            "POS_limit": float(data.get('POS_limit')) if data.get('POS_limit') else 0.0,
            "ATM_limit": float(data.get('ATM_limit')) if data.get('ATM_limit') else 0.0,
            "Status":    data.get('Status', 'Active'),
            "Source":    'Externel_System',
            "Operation": 'Create'
        }
        
        cursor.execute(sql_ext, params)
        cursor.execute(sql_events, params)
        connection.commit()
        
        # Stream to Kafka (Avro) -> Topic HPOS for external card creation
        send_to_kafka(params, topic="HPOS")
        
        return jsonify({"status": "success", "message": "External card created"}), 201
    except Exception as e:
        print(f"Oracle Error [EXT] : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/external/cards', methods=['GET'])
def get_external_cards():
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        sql = """
            SELECT ID_CARD, PAN, F_NAME, L_NAME, OPERATION, AMOUNT, STATUS, SOURCE, TIMESTMP, POS_LIMIT, ATM_LIMIT
            FROM (
                SELECT ID_CARD, PAN, F_NAME, L_NAME, OPERATION, AMOUNT, STATUS, SOURCE, TIMESTMP, POS_LIMIT, ATM_LIMIT,
                       ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
                FROM POS.Externel_System
            ) WHERE rn = 1
            ORDER BY TIMESTMP DESC
        """
        cursor.execute(sql)
        
        columns = [col[0] for col in cursor.description]
        cards = []
        for row in cursor:
            cards.append(dict(zip(columns, row)))
            
        return jsonify(cards), 200
    except Exception as e:
        print(f"Oracle Error [EXT GET]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/external/update', methods=['PUT'])
def external_update_card():
    data = request.json
    card_id = data.get('id_Card')
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT PAN FROM POS.Externel_System WHERE ID_CARD = :id ORDER BY TIMESTMP DESC FETCH FIRST 1 ROWS ONLY",
            {"id": card_id}
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"status": "error", "message": "Card not found"}), 404
        current_pan = row[0]

        sql_ext = """
            INSERT INTO POS.Externel_System (
                id_Card, PAN, F_Name, L_Name, Amount,
                POS_limit, ATM_limit, Status, Source, Operation, Timestmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, :Status, :Source, 'Update', CURRENT_TIMESTAMP
            )
        """

        sql_events = """
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts,
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, :Status, :Source, 'Update', CURRENT_TIMESTAMP
            )
        """

        params = {
            "id_Card":   card_id,
            "PAN":       current_pan,
            "F_Name":    data.get('F_Name'),
            "L_Name":    data.get('L_Name'),
            "Amount":    float(data.get('Amount'))    if data.get('Amount')    else 0.0,
            "POS_limit": float(data.get('POS_limit')) if data.get('POS_limit') else 0.0,
            "ATM_limit": float(data.get('ATM_limit')) if data.get('ATM_limit') else 0.0,
            "Status":    data.get('Status', 'Active'),
            "Source":    'Externel_System',
        }

        cursor.execute(sql_ext, params)
        cursor.execute(sql_events, params)
        connection.commit()

        # Stream to Kafka (Avro) -> Topic HPOS for external updates
        params["Operation"] = "Update"
        send_to_kafka(params, topic="HPOS")

        return jsonify({"status": "success", "message": "Updated"}), 200
    except Exception as e:
        print(f"Oracle Error [EXT UPDATE]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/external/delete', methods=['DELETE'])
def external_delete_card():
    data = request.json
    card_id = data.get('id_Card')
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()

        cursor.execute("""
            SELECT PAN, F_NAME, L_NAME, AMOUNT, POS_LIMIT, ATM_LIMIT
            FROM POS.Externel_System
            WHERE ID_CARD = :id
            ORDER BY TIMESTMP DESC
            FETCH FIRST 1 ROWS ONLY
        """, {"id": card_id})
        row = cursor.fetchone()
        if not row:
            return jsonify({"status": "error", "message": "Not found"}), 404

        pan, f_name, l_name, amount, pos_limit, atm_limit = row

        sql_ext = """
            INSERT INTO POS.Externel_System (
                id_Card, PAN, F_Name, L_Name, Amount,
                POS_limit, ATM_limit, Status, Source, Operation, Timestmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, 'blocked', 'Externel_System', 'DELETE', CURRENT_TIMESTAMP
            )
        """

        sql_events = """
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts,
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, 'blocked', 'Externel_System', 'DELETE', CURRENT_TIMESTAMP
            )
        """

        params = {
            "id_Card":   card_id,
            "PAN":       pan,
            "F_Name":    f_name,
            "L_Name":    l_name,
            "Amount":    float(amount)    if amount    else 0.0,
            "POS_limit": float(pos_limit) if pos_limit else 0.0,
            "ATM_limit": float(atm_limit) if atm_limit else 0.0,
        }

        cursor.execute(sql_ext, params)
        cursor.execute(sql_events, params)
        connection.commit()

        # Stream to Kafka (Avro) -> Topic HPOS for external deletion
        params["Operation"] = "DELETE"
        params["Status"] = "blocked"
        send_to_kafka(params, topic="HPOS")

        return jsonify({"status": "success", "message": "Deleted"}), 200
    except Exception as e:
        print(f"Oracle Error [EXT DELETE]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/external/events', methods=['GET'])
def get_external_events():
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            SELECT ID_EVENT, ID_CARD, PAN, F_NAME, L_NAME, AMOUNTS, 
                   POS_LIMIT, ATM_LIMIT, STATUS, SOURCE, OPERATION, TIMETMP 
            FROM POS.Events 
            WHERE SOURCE = 'Externel_System' 
               OR (SOURCE = 'PWC_System' AND ID_CARD IN (SELECT ID_CARD FROM POS.Externel_System))
            ORDER BY TIMETMP DESC
        """)
        
        columns = [col[0] for col in cursor.description]
        events = []
        for row in cursor:
            events.append(dict(zip(columns, row)))
            
        return jsonify(events), 200
    except Exception as e:
        print(f"Oracle External Events Error : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()


if __name__ == '__main__':
    print("API PowerCard System started on http://localhost:5001")
    app.run(port=5001, debug=True)
