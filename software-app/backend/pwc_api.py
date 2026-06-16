from flask import Flask, request, jsonify
from flask_cors import CORS
import oracledb
import datetime
import json
import io
import time
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
ORACLE_USER = "POS"
ORACLE_PASSWORD = "Izinm123W"
ORACLE_DSN = "172.22.32.1:1521/XE"

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
                    POS_limit, ATM_limit, Status, Source, Operation, Timestmp
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
            SELECT ID_CARD, PAN, F_NAME, L_NAME,
                   COALESCE(
                       (SELECT OPERATION FROM (
                            SELECT OPERATION, ROW_NUMBER() OVER (ORDER BY TIMESTMP DESC) as r_op
                            FROM POS.PowerCard_System
                            WHERE ID_CARD = outer_c.ID_CARD AND UPPER(OPERATION) NOT IN ('TRANSFER', 'VIREMENT')
                       ) WHERE r_op = 1), 'Create'
                   ) as OPERATION,
                   AMOUNT, STATUS, SOURCE, TIMESTMP, POS_LIMIT, ATM_LIMIT
            FROM (
                SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, STATUS, SOURCE, TIMESTMP, POS_LIMIT, ATM_LIMIT,
                       ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
                FROM POS.PowerCard_System
            ) outer_c WHERE rn = 1
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
            WHERE UPPER(OPERATION) NOT IN ('TRANSFER', 'VIREMENT', 'PAIEMENT')
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
            SELECT ID_CARD, PAN, F_NAME, L_NAME,
                   COALESCE(
                       (SELECT OPERATION FROM (
                            SELECT OPERATION, ROW_NUMBER() OVER (ORDER BY TIMESTMP DESC) as r_op
                            FROM POS.Externel_System
                            WHERE ID_CARD = outer_c.ID_CARD AND UPPER(OPERATION) NOT IN ('TRANSFER', 'VIREMENT')
                       ) WHERE r_op = 1), 'Create'
                   ) as OPERATION,
                   AMOUNT, STATUS, SOURCE, TIMESTMP, POS_LIMIT, ATM_LIMIT
            FROM (
                SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, STATUS, SOURCE, TIMESTMP, POS_LIMIT, ATM_LIMIT,
                       ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
                FROM POS.Externel_System
            ) outer_c WHERE rn = 1
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
            WHERE (SOURCE = 'Externel_System' 
               OR (SOURCE = 'PWC_System' AND ID_CARD IN (SELECT ID_CARD FROM POS.Externel_System)))
               AND UPPER(OPERATION) NOT IN ('TRANSFER', 'VIREMENT')
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


def get_recent_events_for_card(cursor, id_card):
    try:
        cursor.execute("""
            SELECT OPERATION, AMOUNTS, TIMETMP, SOURCE
            FROM (
                SELECT OPERATION, AMOUNTS, TIMETMP, SOURCE
                FROM POS.Events 
                WHERE ID_CARD = :id_card
                UNION ALL
                SELECT OPERATION, AMOUNT AS AMOUNTS, TIMESTMP AS TIMETMP, SOURCE
                FROM POS.PowerCard_System
                WHERE ID_CARD = :id_card AND UPPER(OPERATION) = 'VIREMENT'
                UNION ALL
                SELECT OPERATION, AMOUNT AS AMOUNTS, TIMESTMP AS TIMETMP, SOURCE
                FROM POS.Externel_System
                WHERE ID_CARD = :id_card AND UPPER(OPERATION) = 'VIREMENT'
            )
            ORDER BY TIMETMP ASC
        """, {"id_card": id_card})
        rows = cursor.fetchall()
        
        events_list = []
        prev_amount = 0.0
        for op, amt, tstamp, src in rows:
            amt = float(amt) if amt is not None else 0.0
            diff = amt - prev_amount
            
            if hasattr(tstamp, 'strftime'):
                t_str = tstamp.strftime("%d/%m/%Y, %H:%M")
            else:
                t_str = str(tstamp)
                
            if op.upper() == 'CREATE':
                events_list.append({
                    "title": f"Initial Deposit ({src})",
                    "date": t_str,
                    "amount": amt,
                    "type": "credit"
                })
                prev_amount = amt
            elif op.upper() == 'DELETE':
                events_list.append({
                    "title": f"Account Closure ({src})",
                    "date": t_str,
                    "amount": prev_amount,
                    "type": "debit"
                })
                prev_amount = 0.0
            elif op.upper() == 'VIREMENT':
                if abs(diff) > 0.01:
                    if diff > 0:
                        events_list.append({
                            "title": "Transfer Received",
                            "date": t_str,
                            "amount": abs(diff),
                            "type": "credit"
                        })
                    else:
                        events_list.append({
                            "title": "Transfer Sent",
                            "date": t_str,
                            "amount": abs(diff),
                            "type": "debit"
                        })
                    prev_amount = amt
            elif op.upper() == 'PAIEMENT':
                if abs(diff) > 0.01:
                    events_list.append({
                        "title": "POS Payment",
                        "date": t_str,
                        "amount": abs(diff),
                        "type": "debit"
                    })
                    prev_amount = amt
            else: # UPDATE or other
                if abs(diff) > 0.01:
                    if diff > 0:
                        events_list.append({
                            "title": f"Transfer Received ({src})",
                            "date": t_str,
                            "amount": diff,
                            "type": "credit"
                        })
                    else:
                        events_list.append({
                            "title": f"Balance Withdrawal ({src})",
                            "date": t_str,
                            "amount": abs(diff),
                            "type": "debit"
                        })
                    prev_amount = amt
                    
        recent = list(reversed(events_list))[:2]
        if not recent:
            recent = [
                {
                    "title": "External Transfer Received",
                    "date": datetime.datetime.now().strftime("%d/%m/%Y, 09:15"),
                    "amount": 500.00,
                    "type": "credit"
                },
                {
                    "title": "Balance Withdrawal",
                    "date": (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%d/%m/%Y, 14:32"),
                    "amount": 150.00,
                    "type": "debit"
                }
            ]
        return recent
    except Exception as e:
        print(f"Error fetching recent events: {e}")
        return [
            {
                "title": "External Transfer Received",
                "date": "Today, 09:15",
                "amount": 500.00,
                "type": "credit"
            },
            {
                "title": "Balance Withdrawal",
                "date": "Yesterday, 14:32",
                "amount": 150.00,
                "type": "debit"
            }
        ]

@app.route('/api/mobile/login', methods=['POST'])
def mobile_login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Veuillez remplir tous les champs"}), 400
        
    if password != "110011":
        return jsonify({"status": "error", "message": "Mot de passe incorrect"}), 401
        
    # Check if username is the default mock client
    if username == "bankclient":
        return jsonify({
            "status": "success", 
            "message": "Connexion réussie (bankclient)", 
            "card_id": username,
            "type": "client",
            "f_name": "Bank",
            "l_name": "Client",
            "amount": 2450.75,
            "pan": "xxxx  xxxx  8842  9173",
            "card_status": "Active",
            "recent_events": [
                {
                    "title": "External Transfer Received",
                    "date": datetime.datetime.now().strftime("%d/%m/%Y, 09:15"),
                    "amount": 500.00,
                    "type": "credit"
                },
                {
                    "title": "Balance Withdrawal",
                    "date": (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%d/%m/%Y, 14:32"),
                    "amount": 150.00,
                    "type": "debit"
                }
            ]
        }), 200
        
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        recent_events = get_recent_events_for_card(cursor, username)
        
        # 1. Vérifier dans Externel_System (cartes créées par le système externe)
        sql_ext = """
            SELECT STATUS, F_NAME, L_NAME, AMOUNT, PAN
            FROM (
                SELECT STATUS, F_NAME, L_NAME, AMOUNT, PAN,
                       ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
                FROM POS.Externel_System
                WHERE ID_CARD = :id_card
            ) WHERE rn = 1
        """
        cursor.execute(sql_ext, {"id_card": username})
        row_ext = cursor.fetchone()
        
        if row_ext:
            status, f_name, l_name, amount, pan = row_ext
            return jsonify({
                "status": "success", 
                "message": "Connexion réussie (Carte Externe)", 
                "card_id": username,
                "type": "external_card",
                "f_name": f_name or "",
                "l_name": l_name or "",
                "amount": float(amount) if amount is not None else 0.0,
                "pan": pan or "",
                "card_status": status or "Active",
                "recent_events": recent_events
            }), 200
            
        # 2. Vérifier aussi dans PowerCard_System (pour toutes les cartes / clients)
        sql_pwc = """
            SELECT STATUS, F_NAME, L_NAME, AMOUNT, PAN
            FROM (
                SELECT STATUS, F_NAME, L_NAME, AMOUNT, PAN,
                       ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
                FROM POS.PowerCard_System
                WHERE ID_CARD = :id_card
            ) WHERE rn = 1
        """
        cursor.execute(sql_pwc, {"id_card": username})
        row_pwc = cursor.fetchone()
        
        if row_pwc:
            status, f_name, l_name, amount, pan = row_pwc
            return jsonify({
                "status": "success", 
                "message": "Connexion réussie (PowerCard)", 
                "card_id": username,
                "type": "powercard",
                "f_name": f_name or "",
                "l_name": l_name or "",
                "amount": float(amount) if amount is not None else 0.0,
                "pan": pan or "",
                "card_status": status or "Active",
                "recent_events": recent_events
            }), 200
            
        return jsonify({"status": "error", "message": "Identifiants incorrects (Carte non trouvée)"}), 404
        
    except Exception as e:
        print(f"Oracle Error during mobile login: {e}")
        return jsonify({"status": "error", "message": f"Erreur de base de données : {str(e)}"}), 500
    finally:
        if connection:
            connection.close()


@app.route('/api/mobile/refresh/<card_id>', methods=['GET'])
def mobile_refresh(card_id):
    if card_id == "bankclient":
        return jsonify({
            "status": "success", 
            "card_id": card_id,
            "type": "client",
            "f_name": "Bank",
            "l_name": "Client",
            "amount": 2450.75,
            "pan": "xxxx  xxxx  8842  9173",
            "card_status": "Active",
            "recent_events": [
                {
                    "title": "External Transfer Received",
                    "date": datetime.datetime.now().strftime("%d/%m/%Y, 09:15"),
                    "amount": 500.00,
                    "type": "credit"
                },
                {
                    "title": "Balance Withdrawal",
                    "date": (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%d/%m/%Y, 14:32"),
                    "amount": 150.00,
                    "type": "debit"
                }
            ]
        }), 200
        
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        recent_events = get_recent_events_for_card(cursor, card_id)
        
        # 1. Vérifier dans Externel_System
        sql_ext = """
            SELECT STATUS, F_NAME, L_NAME, AMOUNT, PAN
            FROM (
                SELECT STATUS, F_NAME, L_NAME, AMOUNT, PAN,
                       ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
                FROM POS.Externel_System
                WHERE ID_CARD = :id_card
            ) WHERE rn = 1
        """
        cursor.execute(sql_ext, {"id_card": card_id})
        row_ext = cursor.fetchone()
        
        if row_ext:
            status, f_name, l_name, amount, pan = row_ext
            return jsonify({
                "status": "success", 
                "card_id": card_id,
                "type": "external_card",
                "f_name": f_name or "",
                "l_name": l_name or "",
                "amount": float(amount) if amount is not None else 0.0,
                "pan": pan or "",
                "card_status": status or "Active",
                "recent_events": recent_events
            }), 200
            
        # 2. Vérifier dans PowerCard_System
        sql_pwc = """
            SELECT STATUS, F_NAME, L_NAME, AMOUNT, PAN
            FROM (
                SELECT STATUS, F_NAME, L_NAME, AMOUNT, PAN,
                       ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
                FROM POS.PowerCard_System
                WHERE ID_CARD = :id_card
            ) WHERE rn = 1
        """
        cursor.execute(sql_pwc, {"id_card": card_id})
        row_pwc = cursor.fetchone()
        
        if row_pwc:
            status, f_name, l_name, amount, pan = row_pwc
            return jsonify({
                "status": "success", 
                "card_id": card_id,
                "type": "powercard",
                "f_name": f_name or "",
                "l_name": l_name or "",
                "amount": float(amount) if amount is not None else 0.0,
                "pan": pan or "",
                "card_status": status or "Active",
                "recent_events": recent_events
            }), 200
            
        return jsonify({"status": "error", "message": "Carte non trouvée"}), 404
        
    except Exception as e:
        print(f"Oracle Error during mobile refresh: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()


@app.route('/api/mobile/history/<card_id>', methods=['GET'])
def mobile_history(card_id):
    """Return full modification history for a card, with change detection."""
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()

        cursor.execute("""
            SELECT ID_EVENT, ID_CARD, PAN, F_NAME, L_NAME, AMOUNTS,
                   POS_LIMIT, ATM_LIMIT, STATUS, SOURCE, OPERATION, TIMETMP
            FROM (
                SELECT ID_EVENT, ID_CARD, PAN, F_NAME, L_NAME, AMOUNTS,
                       POS_LIMIT, ATM_LIMIT, STATUS, SOURCE, OPERATION, TIMETMP
                FROM POS.Events
                WHERE ID_CARD = :id_card
                UNION ALL
                SELECT 0 AS ID_EVENT, ID_CARD, PAN, F_NAME, L_NAME, AMOUNT AS AMOUNTS,
                       POS_LIMIT, ATM_LIMIT, STATUS, SOURCE, OPERATION, TIMESTMP AS TIMETMP
                FROM POS.PowerCard_System
                WHERE ID_CARD = :id_card AND UPPER(OPERATION) = 'VIREMENT'
                UNION ALL
                SELECT 0 AS ID_EVENT, ID_CARD, PAN, F_NAME, L_NAME, AMOUNT AS AMOUNTS,
                       POS_LIMIT, ATM_LIMIT, STATUS, SOURCE, OPERATION, TIMESTMP AS TIMETMP
                FROM POS.Externel_System
                WHERE ID_CARD = :id_card AND UPPER(OPERATION) = 'VIREMENT'
            )
            ORDER BY TIMETMP ASC
        """, {"id_card": card_id})

        columns = [col[0] for col in cursor.description]
        rows = []
        for row in cursor:
            rows.append(dict(zip(columns, row)))

        if not rows:
            return jsonify([]), 200

        history = []
        prev = None

        for rec in rows:
            operation = (rec.get('OPERATION') or 'Unknown').strip()
            source = (rec.get('SOURCE') or 'Unknown').strip()
            tstamp = rec.get('TIMETMP')

            # Format date and time
            if hasattr(tstamp, 'strftime'):
                date_str = tstamp.strftime("%d %B %Y")
                time_str = tstamp.strftime("%H:%M")
                iso_str = tstamp.isoformat()
            else:
                date_str = str(tstamp)
                time_str = ""
                iso_str = str(tstamp)

            # Source label
            if 'Externel' in source or 'External' in source:
                source_label = "External Admin"
            else:
                source_label = "PWC Admin"

            # Current values
            cur_amount = float(rec.get('AMOUNTS') or 0)
            cur_status = (rec.get('STATUS') or 'Active').strip()
            cur_pos = float(rec.get('POS_LIMIT') or 0)
            cur_atm = float(rec.get('ATM_LIMIT') or 0)
            cur_fname = (rec.get('F_NAME') or '').strip()
            cur_lname = (rec.get('L_NAME') or '').strip()

            changes = []
            icon_type = "create"

            if operation.upper() == 'CREATE':
                icon_type = "create"
                changes.append({
                    "field": "Account",
                    "old_value": "",
                    "new_value": "Card Created"
                })
                if cur_amount > 0:
                    changes.append({
                        "field": "Initial Balance",
                        "old_value": "",
                        "new_value": f"€{cur_amount:,.2f}"
                    })
                if cur_status:
                    changes.append({
                        "field": "Status",
                        "old_value": "",
                        "new_value": cur_status
                    })
                if cur_pos > 0:
                    changes.append({
                        "field": "POS Limit",
                        "old_value": "",
                        "new_value": f"€{cur_pos:,.2f}"
                    })
                if cur_atm > 0:
                    changes.append({
                        "field": "ATM Limit",
                        "old_value": "",
                        "new_value": f"€{cur_atm:,.2f}"
                    })

            elif operation.upper() == 'VIREMENT':
                icon_type = "balance"
                prev_amount = float(prev.get('AMOUNTS') or 0) if prev else 0.0
                diff = cur_amount - prev_amount
                if diff > 0:
                    title = "Transfer Received"
                    changes.append({
                        "field": "Transfer",
                        "old_value": "",
                        "new_value": f"+€{abs(diff):,.2f}"
                    })
                else:
                    title = "Transfer Sent"
                    changes.append({
                        "field": "Transfer",
                        "old_value": "",
                        "new_value": f"-€{abs(diff):,.2f}"
                    })

            else:  # UPDATE or other
                if prev:
                    prev_amount = float(prev.get('AMOUNTS') or 0)
                    prev_status = (prev.get('STATUS') or 'Active').strip()
                    prev_pos = float(prev.get('POS_LIMIT') or 0)
                    prev_atm = float(prev.get('ATM_LIMIT') or 0)
                    prev_fname = (prev.get('F_NAME') or '').strip()
                    prev_lname = (prev.get('L_NAME') or '').strip()

                    # Detect status change
                    if cur_status.lower() != prev_status.lower():
                        icon_type = "status"
                        changes.append({
                            "field": "Status",
                            "old_value": prev_status,
                            "new_value": cur_status
                        })

                    # Detect balance change
                    if abs(cur_amount - prev_amount) > 0.01:
                        if icon_type == "create":
                            icon_type = "balance"
                        changes.append({
                            "field": "Balance",
                            "old_value": f"€{prev_amount:,.2f}",
                            "new_value": f"€{cur_amount:,.2f}"
                        })

                    # Detect POS limit change
                    if abs(cur_pos - prev_pos) > 0.01:
                        if icon_type in ("create",):
                            icon_type = "limits"
                        changes.append({
                            "field": "POS Limit",
                            "old_value": f"€{prev_pos:,.2f}",
                            "new_value": f"€{cur_pos:,.2f}"
                        })

                    # Detect ATM limit change
                    if abs(cur_atm - prev_atm) > 0.01:
                        if icon_type in ("create",):
                            icon_type = "limits"
                        changes.append({
                            "field": "ATM Limit",
                            "old_value": f"€{prev_atm:,.2f}",
                            "new_value": f"€{cur_atm:,.2f}"
                        })

                    # Detect name change
                    if cur_fname.lower() != prev_fname.lower() or cur_lname.lower() != prev_lname.lower():
                        if icon_type in ("create",):
                            icon_type = "profile"
                        changes.append({
                            "field": "Cardholder Name",
                            "old_value": f"{prev_fname} {prev_lname}".strip(),
                            "new_value": f"{cur_fname} {cur_lname}".strip()
                        })

                    # If no specific change was detected, log a generic update
                    if not changes:
                        icon_type = "balance"
                        changes.append({
                            "field": "Card Profile",
                            "old_value": "",
                            "new_value": "Updated"
                        })
                else:
                    icon_type = "balance"
                    changes.append({
                        "field": "Card Profile",
                        "old_value": "",
                        "new_value": "Updated"
                    })

            # Build title based on icon_type
            title_map = {
                "create": "Card Created",
                "delete": "Card Blocked",
                "status": "Status Updated",
                "balance": "Balance Adjusted",
                "limits": "Limits Modified",
                "profile": "Profile Updated"
            }
            if operation.upper() == 'VIREMENT':
                # Already computed title
                pass
            elif operation.upper() == 'PAIEMENT':
                title = "POS Payment"
                icon_type = "balance"
            else:
                title = title_map.get(icon_type, "Card Updated")

            history.append({
                "date": date_str,
                "time": time_str,
                "timestamp": iso_str,
                "operation": operation,
                "source": source,
                "source_label": source_label,
                "icon_type": icon_type,
                "title": title,
                "changes": changes
            })

            prev = rec

        # Reverse so most recent is first
        history.reverse()

        return jsonify(history), 200

    except Exception as e:
        print(f"Oracle Error [MOBILE HISTORY]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()


# =============================================
# TRANSFER ENDPOINTS
# =============================================

@app.route('/api/mobile/transfer', methods=['POST'])
def mobile_transfer():
    """
    Validate recipient PAN + name, check sender balance, execute transfer.
    Pipeline: API → Kafka (Avro) → recorded in both tables (if card exists in both).
    """
    data = request.json or {}
    sender_card_id = data.get('sender_card_id', '').strip()
    recipient_pan = data.get('recipient_pan', '').strip()
    recipient_first_name = data.get('recipient_first_name', '').strip()
    recipient_last_name = data.get('recipient_last_name', '').strip()
    transfer_amount = data.get('amount', 0)

    if not sender_card_id or not recipient_pan or not recipient_first_name or not recipient_last_name:
        return jsonify({"status": "error", "message": "All fields are required."}), 400

    try:
        transfer_amount = float(transfer_amount)
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Invalid amount."}), 400

    if transfer_amount <= 0:
        return jsonify({"status": "error", "message": "Amount must be greater than zero."}), 400

    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()

        # ── 1. Get latest sender info from both tables ──
        cursor.execute("""
            SELECT PAN, F_NAME, L_NAME, AMOUNT, STATUS, POS_LIMIT, ATM_LIMIT, TIMESTMP
            FROM (
                SELECT PAN, F_NAME, L_NAME, AMOUNT, STATUS, POS_LIMIT, ATM_LIMIT, TIMESTMP,
                       ROW_NUMBER() OVER (ORDER BY TIMESTMP DESC) as rn
                FROM POS.PowerCard_System WHERE ID_CARD = :id
            ) WHERE rn = 1
        """, {"id": sender_card_id})
        sender_pwc = cursor.fetchone()

        cursor.execute("""
            SELECT PAN, F_NAME, L_NAME, AMOUNT, STATUS, POS_LIMIT, ATM_LIMIT, TIMESTMP
            FROM (
                SELECT PAN, F_NAME, L_NAME, AMOUNT, STATUS, POS_LIMIT, ATM_LIMIT, TIMESTMP,
                       ROW_NUMBER() OVER (ORDER BY TIMESTMP DESC) as rn
                FROM POS.Externel_System WHERE ID_CARD = :id
            ) WHERE rn = 1
        """, {"id": sender_card_id})
        sender_ext = cursor.fetchone()

        if not sender_pwc and not sender_ext:
            return jsonify({"status": "error", "message": "Sender account not found."}), 404

        sender_info = None
        if sender_pwc and sender_ext:
            ts_pwc = sender_pwc[7] or datetime.datetime.min
            ts_ext = sender_ext[7] or datetime.datetime.min
            if ts_pwc >= ts_ext:
                sender_info = sender_pwc
            else:
                sender_info = sender_ext
        elif sender_pwc:
            sender_info = sender_pwc
        else:
            sender_info = sender_ext

        s_pan, s_fname, s_lname, s_amount, s_status, s_pos, s_atm, _ = sender_info
        s_amount = float(s_amount) if s_amount is not None else 0.0

        # ── 2. Get latest recipient info from both tables by PAN ──
        cursor.execute("""
            SELECT ID_CARD, F_NAME, L_NAME, AMOUNT, STATUS, POS_LIMIT, ATM_LIMIT, TIMESTMP
            FROM (
                SELECT ID_CARD, F_NAME, L_NAME, AMOUNT, STATUS, POS_LIMIT, ATM_LIMIT, TIMESTMP,
                       ROW_NUMBER() OVER (ORDER BY TIMESTMP DESC) as rn
                FROM POS.PowerCard_System WHERE PAN = :pan
            ) WHERE rn = 1
        """, {"pan": recipient_pan})
        recipient_pwc = cursor.fetchone()

        cursor.execute("""
            SELECT ID_CARD, F_NAME, L_NAME, AMOUNT, STATUS, POS_LIMIT, ATM_LIMIT, TIMESTMP
            FROM (
                SELECT ID_CARD, F_NAME, L_NAME, AMOUNT, STATUS, POS_LIMIT, ATM_LIMIT, TIMESTMP,
                       ROW_NUMBER() OVER (ORDER BY TIMESTMP DESC) as rn
                FROM POS.Externel_System WHERE PAN = :pan
            ) WHERE rn = 1
        """, {"pan": recipient_pan})
        recipient_ext = cursor.fetchone()

        if not recipient_pwc and not recipient_ext:
            return jsonify({"status": "error", "message": "Invalid recipient. No account found with this PAN."}), 404

        recipient_info = None
        if recipient_pwc and recipient_ext:
            ts_pwc = recipient_pwc[7] or datetime.datetime.min
            ts_ext = recipient_ext[7] or datetime.datetime.min
            if ts_pwc >= ts_ext:
                recipient_info = recipient_pwc
            else:
                recipient_info = recipient_ext
        elif recipient_pwc:
            recipient_info = recipient_pwc
        else:
            recipient_info = recipient_ext

        r_card_id, r_fname, r_lname, r_amount, r_status, r_pos, r_atm, _ = recipient_info
        r_amount = float(r_amount) if r_amount is not None else 0.0

        # ── 3. Verify first name and last name (case-insensitive) ──
        if (r_fname or '').strip().lower() != recipient_first_name.lower() or \
           (r_lname or '').strip().lower() != recipient_last_name.lower():
            return jsonify({"status": "error", "message": "Invalid recipient. The first name or last name does not match."}), 400

        # ── 4. Make sure recipient is not the sender ──
        if str(r_card_id).strip() == sender_card_id:
            return jsonify({"status": "error", "message": "You cannot transfer to your own account."}), 400

        # ── 5. Check sender balance ──
        if transfer_amount > s_amount:
            return jsonify({"status": "error", "message": "Insufficient balance. Your current balance is €" + f"{s_amount:,.2f}"}), 400

        # ── 6. Execute transfer: deduct from sender & add to recipient ──
        new_sender_balance = s_amount - transfer_amount
        new_recipient_balance = r_amount + transfer_amount
        now_ts = datetime.datetime.now()

        sender_exists_pwc = (sender_pwc is not None)
        sender_exists_ext = (sender_ext is not None)
        recipient_exists_pwc = (recipient_pwc is not None)
        recipient_exists_ext = (recipient_ext is not None)

        # Insert sender updates
        if sender_exists_pwc:
            cursor.execute("""
                INSERT INTO POS.PowerCard_System (
                    id_Card, PAN, F_Name, L_Name, Amount,
                    POS_limit, ATM_limit, Status, Source, Operation, Timestmp
                ) VALUES (
                    :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                    :POS_limit, :ATM_limit, :Status, 'Mobile_App', 'Virement', :ts
                )
            """, {
                "id_Card":   sender_card_id,
                "PAN":       s_pan,
                "F_Name":    s_fname,
                "L_Name":    s_lname,
                "Amount":    new_sender_balance,
                "POS_limit": float(s_pos) if s_pos is not None else 0.0,
                "ATM_limit": float(s_atm) if s_atm is not None else 0.0,
                "Status":    s_status or 'Active',
                "ts":        now_ts
            })

        if sender_exists_ext:
            cursor.execute("""
                INSERT INTO POS.Externel_System (
                    id_Card, PAN, F_Name, L_Name, Amount,
                    POS_limit, ATM_limit, Status, Source, Operation, Timestmp
                ) VALUES (
                    :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                    :POS_limit, :ATM_limit, :Status, 'Mobile_App', 'Virement', :ts
                )
            """, {
                "id_Card":   sender_card_id,
                "PAN":       s_pan,
                "F_Name":    s_fname,
                "L_Name":    s_lname,
                "Amount":    new_sender_balance,
                "POS_limit": float(s_pos) if s_pos is not None else 0.0,
                "ATM_limit": float(s_atm) if s_atm is not None else 0.0,
                "Status":    s_status or 'Active',
                "ts":        now_ts
            })

        # Insert recipient updates
        recipient_source = 'Externel_System' if recipient_exists_ext else 'PWC_System'

        if recipient_exists_pwc:
            cursor.execute("""
                INSERT INTO POS.PowerCard_System (
                    id_Card, PAN, F_Name, L_Name, Amount,
                    POS_limit, ATM_limit, Status, Source, Operation, Timestmp
                ) VALUES (
                    :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                    :POS_limit, :ATM_limit, :Status, :Source, 'Virement', :ts
                )
            """, {
                "id_Card":   r_card_id,
                "PAN":       recipient_pan,
                "F_Name":    r_fname,
                "L_Name":    r_lname,
                "Amount":    new_recipient_balance,
                "POS_limit": float(r_pos) if r_pos is not None else 0.0,
                "ATM_limit": float(r_atm) if r_atm is not None else 0.0,
                "Status":    r_status or 'Active',
                "Source":    recipient_source,
                "ts":        now_ts
            })

        if recipient_exists_ext:
            cursor.execute("""
                INSERT INTO POS.Externel_System (
                    id_Card, PAN, F_Name, L_Name, Amount,
                    POS_limit, ATM_limit, Status, Source, Operation, Timestmp
                ) VALUES (
                    :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                    :POS_limit, :ATM_limit, :Status, :Source, 'Virement', :ts
                )
            """, {
                "id_Card":   r_card_id,
                "PAN":       recipient_pan,
                "F_Name":    r_fname,
                "L_Name":    r_lname,
                "Amount":    new_recipient_balance,
                "POS_limit": float(r_pos) if r_pos is not None else 0.0,
                "ATM_limit": float(r_atm) if r_atm is not None else 0.0,
                "Status":    r_status or 'Active',
                "Source":    recipient_source,
                "ts":        now_ts
            })

        # ── 7. Insert audit events in POS.Events ──
        cursor.execute("""
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts,
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, :Status, 'Mobile_App', 'Virement', :ts
            )
        """, {
            "id_Card":   sender_card_id,
            "PAN":       s_pan,
            "F_Name":    s_fname,
            "L_Name":    s_lname,
            "Amount":    new_sender_balance,
            "POS_limit": float(s_pos) if s_pos is not None else 0.0,
            "ATM_limit": float(s_atm) if s_atm is not None else 0.0,
            "Status":    s_status or 'Active',
            "ts":        now_ts
        })

        cursor.execute("""
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts,
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, :Status, :Source, 'Virement', :ts
            )
        """, {
            "id_Card":   r_card_id,
            "PAN":       recipient_pan,
            "F_Name":    r_fname,
            "L_Name":    r_lname,
            "Amount":    new_recipient_balance,
            "POS_limit": float(r_pos) if r_pos is not None else 0.0,
            "ATM_limit": float(r_atm) if r_atm is not None else 0.0,
            "Status":    r_status or 'Active',
            "Source":    recipient_source,
            "ts":        now_ts
        })

        connection.commit()

        # ── 8. Send to Kafka (Avro) ──
        sender_kafka = {
            "id_Card": sender_card_id, "PAN": s_pan, "F_Name": s_fname, "L_Name": s_lname,
            "Amount": new_sender_balance, "POS_limit": float(s_pos) if s_pos else 0.0,
            "ATM_limit": float(s_atm) if s_atm is not None else 0.0, "Status": s_status or 'Active',
            "Source": 'Mobile_App', "Operation": "Virement"
        }
        send_to_kafka(sender_kafka, topic="HPOS")

        recipient_kafka = {
            "id_Card": r_card_id, "PAN": recipient_pan, "F_Name": r_fname, "L_Name": r_lname,
            "Amount": new_recipient_balance, "POS_limit": float(r_pos) if r_pos else 0.0,
            "ATM_limit": float(r_atm) if r_atm else 0.0, "Status": r_status or 'Active',
            "Source": recipient_source, "Operation": "Virement"
        }
        send_to_kafka(recipient_kafka, topic="HPOS")

        return jsonify({
            "status": "success",
            "message": f"Transfer of €{transfer_amount:,.2f} to {r_fname} {r_lname} completed successfully.",
            "new_balance": new_sender_balance
        }), 200

    except Exception as e:
        print(f"Oracle Error [MOBILE TRANSFER]: {e}")
        return jsonify({"status": "error", "message": f"Server error: {str(e)}"}), 500
    finally:
        if connection:
            connection.close()


@app.route('/api/transactions', methods=['GET'])
def get_all_transactions():
    """Return paired Transfer data from both systems for PWC dashboard."""
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()

        # Get all Virement and Paiement rows from both tables
        cursor.execute("""
            SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, STATUS, SOURCE, TIMESTMP, 'PowerCard_System' as TBL, OPERATION
            FROM POS.PowerCard_System
            WHERE UPPER(OPERATION) IN ('VIREMENT', 'PAIEMENT')
            UNION ALL
            SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, STATUS, SOURCE, TIMESTMP, 'Externel_System' as TBL, OPERATION
            FROM POS.Externel_System
            WHERE UPPER(OPERATION) IN ('VIREMENT', 'PAIEMENT')
            ORDER BY TIMESTMP DESC
        """)

        all_rows = []
        seen = set()
        for row in cursor:
            t_val = row[7]
            t_str = t_val.isoformat() if hasattr(t_val, 'isoformat') else str(t_val)
            key = (row[0], t_str)
            if key in seen:
                continue
            seen.add(key)
            all_rows.append({
                "ID_CARD": row[0], "PAN": row[1], "F_NAME": row[2], "L_NAME": row[3],
                "AMOUNT": float(row[4]) if row[4] else 0.0, "STATUS": row[5],
                "SOURCE": row[6], "TIMESTMP": row[7], "TBL": row[8], "OPERATION": row[9]
            })

        # Pair sender with recipient, only keep transfers/payments
        transfers = []
        used = set()
        for i, r in enumerate(all_rows):
            if i in used:
                continue
            
            op_type = str(r["OPERATION"] or '').upper()

            if op_type == 'PAIEMENT':
                # Paiement is a direct single-card transaction
                prev_bal = _get_prev_balance(cursor, r["ID_CARD"], r["TIMESTMP"], r["TBL"])
                trx_amount = prev_bal - r["AMOUNT"] if prev_bal is not None else 0.0
                if trx_amount < 0:
                    trx_amount = 0.0
                t = {
                    "sender_card_id": r["ID_CARD"],
                    "sender_name": f"{r['F_NAME'] or ''} {r['L_NAME'] or ''}".strip(),
                    "sender_pan": r["PAN"],
                    "sender_new_balance": r["AMOUNT"],
                    "sender_source": r["SOURCE"] or "POS_Terminal",
                    "transfer_amount": abs(trx_amount),
                    "timestamp": r["TIMESTMP"],
                    "operation": "Paiement",
                    "recipient_card_id": "POS Terminal",
                    "recipient_name": "Merchant POS",
                    "recipient_pan": "N/A",
                    "recipient_new_balance": 0.0,
                    "recipient_source": "POS_Terminal"
                }
                transfers.append(t)
                used.add(i)

            elif op_type == 'VIREMENT' and r["SOURCE"] == "Mobile_App":
                recipient = None
                for j, r2 in enumerate(all_rows):
                    if j != i and j not in used and r2["SOURCE"] != "Mobile_App" and r2["TIMESTMP"] == r["TIMESTMP"] and str(r2["OPERATION"] or '').upper() == 'VIREMENT':
                        recipient = r2
                        used.add(j)
                        break
                prev_bal = _get_prev_balance(cursor, r["ID_CARD"], r["TIMESTMP"], r["TBL"])
                trx_amount = prev_bal - r["AMOUNT"] if prev_bal is not None else 0.0
                t = {
                    "sender_card_id": r["ID_CARD"],
                    "sender_name": f"{r['F_NAME'] or ''} {r['L_NAME'] or ''}".strip(),
                    "sender_pan": r["PAN"],
                    "sender_new_balance": r["AMOUNT"],
                    "sender_source": r["SOURCE"],
                    "transfer_amount": abs(trx_amount),
                    "timestamp": r["TIMESTMP"],
                    "operation": "Transfer",
                }
                if recipient:
                    t["recipient_card_id"] = recipient["ID_CARD"]
                    t["recipient_name"] = f"{recipient['F_NAME'] or ''} {recipient['L_NAME'] or ''}".strip()
                    t["recipient_pan"] = recipient["PAN"]
                    t["recipient_new_balance"] = recipient["AMOUNT"]
                    t["recipient_source"] = recipient["SOURCE"]
                else:
                    t["recipient_card_id"] = "N/A"
                    t["recipient_name"] = "N/A"
                    t["recipient_pan"] = "N/A"
                    t["recipient_new_balance"] = 0.0
                    t["recipient_source"] = "N/A"
                transfers.append(t)
                used.add(i)

        return jsonify(transfers), 200
    except Exception as e:
        print(f"Oracle Error [GET TRANSACTIONS]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()


def _get_prev_balance(cursor, card_id, virement_ts, table_name):
    """Get the balance of a card just before a Virement timestamp."""
    try:
        cursor.execute(f"""
            SELECT AMOUNT FROM (
                SELECT AMOUNT, ROW_NUMBER() OVER (ORDER BY TIMESTMP DESC) as rn
                FROM POS.{table_name}
                WHERE ID_CARD = :id_card AND TIMESTMP < :ts
            ) WHERE rn = 1
        """, {"id_card": card_id, "ts": virement_ts})
        row = cursor.fetchone()
        return float(row[0]) if row and row[0] else None
    except:
        return None


@app.route('/api/external/transactions', methods=['GET'])
def get_external_transactions():
    """Return paired Transfer data from Externel_System for External dashboard."""
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()

        # Get all Virement and Paiement rows from both tables (we need both to pair sender/recipient if Virement)
        cursor.execute("""
            SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, STATUS, SOURCE, TIMESTMP, 'PowerCard_System' as TBL, OPERATION
            FROM POS.PowerCard_System
            WHERE UPPER(OPERATION) IN ('VIREMENT', 'PAIEMENT')
            UNION ALL
            SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, STATUS, SOURCE, TIMESTMP, 'Externel_System' as TBL, OPERATION
            FROM POS.Externel_System
            WHERE UPPER(OPERATION) IN ('VIREMENT', 'PAIEMENT')
            ORDER BY TIMESTMP DESC
        """)

        all_rows = []
        seen = set()
        for row in cursor:
            t_val = row[7]
            t_str = t_val.isoformat() if hasattr(t_val, 'isoformat') else str(t_val)
            key = (row[0], t_str)
            if key in seen:
                continue
            seen.add(key)
            all_rows.append({
                "ID_CARD": row[0], "PAN": row[1], "F_NAME": row[2], "L_NAME": row[3],
                "AMOUNT": float(row[4]) if row[4] else 0.0, "STATUS": row[5],
                "SOURCE": row[6], "TIMESTMP": row[7], "TBL": row[8], "OPERATION": row[9]
            })

        # Pair sender with recipient, only keep transfers/payments involving Externel_System
        transfers = []
        used = set()
        for i, r in enumerate(all_rows):
            if i in used:
                continue
            
            op_type = str(r["OPERATION"] or '').upper()

            if op_type == 'PAIEMENT':
                # Paiement is a direct single-card transaction
                # Only include if it is in Externel_System or PowerCard_System (with source POS_Terminal)
                prev_bal = _get_prev_balance(cursor, r["ID_CARD"], r["TIMESTMP"], r["TBL"])
                trx_amount = prev_bal - r["AMOUNT"] if prev_bal is not None else 0.0
                # If trx_amount is negative or zero, it might be due to initial load, fallback to 0.0
                if trx_amount < 0:
                    trx_amount = 0.0
                t = {
                    "sender_card_id": r["ID_CARD"],
                    "sender_name": f"{r['F_NAME'] or ''} {r['L_NAME'] or ''}".strip(),
                    "sender_pan": r["PAN"],
                    "sender_new_balance": r["AMOUNT"],
                    "sender_source": r["SOURCE"] or "POS_Terminal",
                    "transfer_amount": abs(trx_amount),
                    "timestamp": r["TIMESTMP"],
                    "operation": "Paiement",
                    "recipient_card_id": "POS Terminal",
                    "recipient_name": "Merchant POS",
                    "recipient_pan": "N/A",
                    "recipient_new_balance": 0.0,
                    "recipient_source": "POS_Terminal"
                }
                transfers.append(t)
                used.add(i)

            elif op_type == 'VIREMENT' and r["SOURCE"] == "Mobile_App":
                recipient = None
                for j, r2 in enumerate(all_rows):
                    if j != i and j not in used and r2["SOURCE"] != "Mobile_App" and r2["TIMESTMP"] == r["TIMESTMP"] and str(r2["OPERATION"] or '').upper() == 'VIREMENT':
                        recipient = r2
                        used.add(j)
                        break
                # Only include if sender or recipient is in Externel_System
                if r["TBL"] != "Externel_System" and (not recipient or recipient["TBL"] != "Externel_System"):
                    used.add(i)
                    continue
                prev_bal = _get_prev_balance(cursor, r["ID_CARD"], r["TIMESTMP"], r["TBL"])
                trx_amount = prev_bal - r["AMOUNT"] if prev_bal is not None else 0.0
                t = {
                    "sender_card_id": r["ID_CARD"],
                    "sender_name": f"{r['F_NAME'] or ''} {r['L_NAME'] or ''}".strip(),
                    "sender_pan": r["PAN"],
                    "sender_new_balance": r["AMOUNT"],
                    "sender_source": r["SOURCE"],
                    "transfer_amount": abs(trx_amount),
                    "timestamp": r["TIMESTMP"],
                    "operation": "Transfer",
                }
                if recipient:
                    t["recipient_card_id"] = recipient["ID_CARD"]
                    t["recipient_name"] = f"{recipient['F_NAME'] or ''} {recipient['L_NAME'] or ''}".strip()
                    t["recipient_pan"] = recipient["PAN"]
                    t["recipient_new_balance"] = recipient["AMOUNT"]
                    t["recipient_source"] = recipient["SOURCE"]
                else:
                    t["recipient_card_id"] = "N/A"
                    t["recipient_name"] = "N/A"
                    t["recipient_pan"] = "N/A"
                    t["recipient_new_balance"] = 0.0
                    t["recipient_source"] = "N/A"
                transfers.append(t)
                used.add(i)

        return jsonify(transfers), 200
    except Exception as e:
        print(f"Oracle Error [GET EXT TRANSACTIONS]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()


@app.route('/api/health', methods=['GET'])
def get_health():
    """Return live status and metrics of Oracle Database, Kafka Broker, MQTT, and Proxy Bridge."""
    health_status = {
        "api_status": "UP",
        "database": {
            "status": "DISCONNECTED",
            "active_cards": 0,
            "total_events": 0,
            "total_transactions": 0,
            "latency_ms": 0.0
        },
        "kafka": {
            "status": "UNAVAILABLE",
            "topic": "HPOS",
            "partitions": 0,
            "latency_ms": 0.0
        },
        "mqtt": {
            "status": "DISCONNECTED",
            "latency_ms": 0.0
        },
        "mqtt_bridge": {
            "status": "INACTIVE",
            "latency_ms": 0.0
        }
    }
    
    # 1. Check Oracle DB & Retrieve Metrics
    db_conn = None
    start_db = time.time()
    try:
        db_conn = get_oracle_connection()
        cursor = db_conn.cursor()
        
        # Connection status test
        cursor.execute("SELECT 1 FROM DUAL")
        cursor.fetchone()
        health_status["database"]["status"] = "CONNECTED"
        
        # Metric: Active Cards
        try:
            cursor.execute("SELECT COUNT(DISTINCT ID_CARD) FROM POS.PowerCard_System WHERE UPPER(STATUS) = 'ACTIVE'")
            health_status["database"]["active_cards"] = cursor.fetchone()[0] or 0
        except Exception as e:
            print(f"Error querying active cards count: {e}")
            
        # Metric: Total Audit Events
        try:
            cursor.execute("SELECT COUNT(*) FROM POS.Events")
            health_status["database"]["total_events"] = cursor.fetchone()[0] or 0
        except Exception as e:
            print(f"Error querying events count: {e}")
            
        # Metric: Total Transactions
        try:
            cursor.execute("SELECT COUNT(*) FROM POS.Events WHERE UPPER(OPERATION) IN ('TRANSFER', 'VIREMENT', 'PAIEMENT', 'PAYMENT')")
            health_status["database"]["total_transactions"] = cursor.fetchone()[0] or 0
        except Exception as e:
            print(f"Error querying transactions count: {e}")
            
        db_time = (time.time() - start_db) * 1000
        health_status["database"]["latency_ms"] = round(db_time, 2)
    except Exception as e:
        print(f"❌ Health Check - Oracle DB error: {e}")
        health_status["database"]["status"] = "DISCONNECTED"
        db_time = (time.time() - start_db) * 1000
        health_status["database"]["latency_ms"] = round(db_time, 2)
    finally:
        if db_conn:
            try:
                db_conn.close()
            except:
                pass
                
    # 2. Check Kafka Broker & Topic Partitions
    start_kafka = time.time()
    try:
        if producer:
            cluster_metadata = producer.list_topics(timeout=1.0)
            health_status["kafka"]["status"] = "STABLE"
            
            topic_metadata = cluster_metadata.topics.get("HPOS")
            if topic_metadata:
                health_status["kafka"]["partitions"] = len(topic_metadata.partitions)
            else:
                health_status["kafka"]["partitions"] = 0
        else:
            health_status["kafka"]["status"] = "UNAVAILABLE"
        kafka_time = (time.time() - start_kafka) * 1000
        health_status["kafka"]["latency_ms"] = round(kafka_time, 2)
    except Exception as e:
        print(f"❌ Health Check - Kafka error: {e}")
        health_status["kafka"]["status"] = "ERROR"
        kafka_time = (time.time() - start_kafka) * 1000
        health_status["kafka"]["latency_ms"] = round(kafka_time, 2)
        
    # 3. Check MQTT Broker (Port 1883 socket test)
    start_mqtt = time.time()
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.0)
        s.connect(("localhost", 1883))
        s.close()
        health_status["mqtt"]["status"] = "ACTIVE"
        mqtt_time = (time.time() - start_mqtt) * 1000
        health_status["mqtt"]["latency_ms"] = round(mqtt_time, 2)
    except Exception as e:
        print(f"❌ Health Check - MQTT broker error: {e}")
        health_status["mqtt"]["status"] = "DISCONNECTED"
        mqtt_time = (time.time() - start_mqtt) * 1000
        health_status["mqtt"]["latency_ms"] = round(mqtt_time, 2)
        
    # 4. Check MQTT-Kafka Bridge Process
    start_bridge = time.time()
    import subprocess
    try:
        res = subprocess.check_output('powershell -Command "Get-CimInstance Win32_Process | Where-Object CommandLine -like \'*mqtt_kafka_proxy.py*\' | Select-Object -ExpandProperty ProcessId"', shell=True)
        pids = [line.strip() for line in res.decode().split('\n') if line.strip()]
        health_status["mqtt_bridge"]["status"] = "ACTIVE" if pids else "INACTIVE"
        bridge_time = (time.time() - start_bridge) * 1000
        health_status["mqtt_bridge"]["latency_ms"] = round(bridge_time, 2)
    except Exception as e:
        print(f"❌ Health Check - Ingestion Proxy error: {e}")
        health_status["mqtt_bridge"]["status"] = "ERROR"
        bridge_time = (time.time() - start_bridge) * 1000
        health_status["mqtt_bridge"]["latency_ms"] = round(bridge_time, 2)
        
    return jsonify(health_status), 200


if __name__ == '__main__':
    print("API PowerCard System started on http://localhost:5001")
    app.run(port=5001, debug=True)

