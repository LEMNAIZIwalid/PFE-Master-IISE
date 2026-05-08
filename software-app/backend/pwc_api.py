from flask import Flask, request, jsonify
from flask_cors import CORS
import oracledb
import datetime

app = Flask(__name__)
CORS(app) # Autorise le Frontend React à communiquer avec cette API

# Configuration Oracle (Identique à tes autres scripts)
ORACLE_USER = "POS"
ORACLE_PASSWORD = "Izinm123W"
ORACLE_DSN = "localhost:1521/XE"

def get_oracle_connection():
    return oracledb.connect(
        user=ORACLE_USER,
        password=ORACLE_PASSWORD,
        dsn=ORACLE_DSN
    )

@app.route('/api/create-card', methods=['POST'])
def create_card():
    data = request.json
    print(f"📥 Requête reçue pour création de carte : {data.get('id_Card')}")
    
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
        
        print(f"✅ Carte {data.get('id_Card')} enregistrée avec succès dans PWC_System et Events.")
        return jsonify({"status": "success", "message": f"Card {data.get('id_Card')} created successfully in both tables"}), 201
        
    except Exception as e:
        print(f"❌ Erreur Oracle : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/update-card', methods=['POST'])
def update_card():
    data = request.json
    print(f"📥 Requête reçue pour mise à jour de carte : {data.get('id_Card')}")
    
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
            "Operation": "Update"
        }
        
        cursor.execute(sql_pwc, params)
        cursor.execute(sql_events, params)
        connection.commit()
        
        print(f"✅ Mise à jour de la carte {data.get('id_Card')} enregistrée avec succès (PWC & Events).")
        return jsonify({"status": "success", "message": f"Card {data.get('id_Card')} updated successfully in both tables"}), 200
        
    except Exception as e:
        print(f"❌ Erreur Oracle lors de l'update : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/delete-card', methods=['POST'])
def delete_card():
    data = request.json
    print(f"🗑️ Requête reçue pour suppression de carte : {data.get('id_Card')}")
    
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
                :POS_limit, :ATM_limit, 'blocked', :Source, 'DELETE', CURRENT_TIMESTAMP
            )
        """

        # 2. Insertion dans Events (Audit)
        sql_events = """
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts, 
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, 'blocked', :Source, 'DELETE', CURRENT_TIMESTAMP
            )
        """
        
        # Préparation des paramètres
        params = {
            "id_Card":   data.get('id_Card'),
            "PAN":       data.get('PAN'),
            "F_Name":    data.get('F_Name'),
            "L_Name":    data.get('L_Name'),
            "Amount":    float(data.get('Amount')) if data.get('Amount') else 0.0,
            "POS_limit": float(data.get('POS_limit')) if data.get('POS_limit') else 0.0,
            "ATM_limit": float(data.get('ATM_limit')) if data.get('ATM_limit') else 0.0,
            "Source":    data.get('Source', 'PWC_System')
        }
        
        cursor.execute(sql_pwc, params)
        cursor.execute(sql_events, params)
        connection.commit()
        
        print(f"✅ Suppression (log) de la carte {data.get('id_Card')} enregistrée avec succès (PWC & Events).")
        return jsonify({"status": "success", "message": f"Card {data.get('id_Card')} deleted successfully in both tables"}), 200
        
    except Exception as e:
        print(f"❌ Erreur Oracle lors de la suppression : {e}")
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
        
        # On utilise une sous-requête avec ROW_NUMBER() pour ne récupérer que la dernière opération de chaque carte
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
        print(f"❌ Erreur Oracle : {e}")
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
        
        # Récupérer les événements depuis la table POS.Events
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
        print(f"❌ Erreur Oracle Events : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

if __name__ == '__main__':
    print("🚀 API PowerCard System démarrée sur http://localhost:5001")
    app.run(port=5001, debug=True)
