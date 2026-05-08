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
        
        sql = """
            INSERT INTO POS.PowerCard_System (
                id_Card, PAN, F_Name, L_Name, Amount, 
                POS_limit, ATM_limit, Status, Source, Operation, TIMESTMP
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount, 
                :POS_limit, :ATM_limit, :Status, :Source, :Operation, CURRENT_TIMESTAMP
            )
        """
        
        # Préparation des paramètres (conversion des nombres si nécessaire)
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
        
        cursor.execute(sql, params)
        connection.commit()
        
        print(f"✅ Carte {data.get('id_Card')} enregistrée avec succès dans Oracle.")
        return jsonify({"status": "success", "message": f"Card {data.get('id_Card')} created successfully"}), 201
        
    except Exception as e:
        print(f"❌ Erreur Oracle : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
@app.route('/api/cards', methods=['GET'])
def get_cards():
    connection = None
    try:
        connection = get_oracle_connection()
        cursor = connection.cursor()
        
        # On récupère toutes les colonnes nécessaires
        cursor.execute("SELECT ID_CARD, PAN, F_NAME, L_NAME, OPERATION, AMOUNT, STATUS, SOURCE, TIMESTMP FROM POS.PowerCard_System ORDER BY ID_CARD DESC")

        
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


if __name__ == '__main__':
    print("🚀 API PowerCard System démarrée sur http://localhost:5001")
    app.run(port=5001, debug=True)
