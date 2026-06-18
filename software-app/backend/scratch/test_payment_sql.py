import oracledb

ORACLE_USER = "POS"
ORACLE_PASSWORD = "Izinm123W"
ORACLE_DSN = "172.22.32.1:1521/XE"

def test_payment(tag_uid, amount_str):
    try:
        payment_amount = float(amount_str)
    except ValueError:
        payment_amount = 0.0

    print(f"Testing NFC Payment: UID={tag_uid}, Amount={payment_amount}")
    connection = oracledb.connect(user=ORACLE_USER, password=ORACLE_PASSWORD, dsn=ORACLE_DSN)
    cursor = connection.cursor()

    # Query latest card details in Externel_System
    query = """
        SELECT id_Card, PAN, F_Name, L_Name, Amount, Status, POS_limit, ATM_limit 
        FROM (
            SELECT id_Card, PAN, F_Name, L_Name, Amount, Status, POS_limit, ATM_limit,
                   ROW_NUMBER() OVER (PARTITION BY id_Card ORDER BY TIMESTMP DESC) as rn
            FROM POS.Externel_System 
            WHERE NFC_UID = :nfc_uid
        ) WHERE rn = 1
    """
    cursor.execute(query, {"nfc_uid": tag_uid})
    row = cursor.fetchone()

    if row is not None:
        id_card, pan, f_name, l_name, amount, status, pos_limit, atm_limit = row
        old_amount = float(amount) if amount is not None else 0.0
        print(f"Found card {id_card} ({f_name} {l_name}). Old Balance: {old_amount}")
        
        if old_amount < payment_amount:
            print("Error: Insufficient balance.")
            cursor.close()
            connection.close()
            return

        new_balance = old_amount - payment_amount

        # 1. Insert into Externel_System
        sql_ext_insert = """
            INSERT INTO POS.Externel_System (
                id_Card, PAN, F_Name, L_Name, Amount,
                POS_limit, ATM_limit, Status, Source, Operation, NFC_UID, Timestmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, :Status, 'POS_Terminal', 'Paiement', :nfc_uid, CURRENT_TIMESTAMP
            )
        """
        cursor.execute(sql_ext_insert, {
            "id_Card": id_card,
            "PAN": pan,
            "F_Name": f_name,
            "L_Name": l_name,
            "Amount": new_balance,
            "POS_limit": float(pos_limit) if pos_limit else 0.0,
            "ATM_limit": float(atm_limit) if atm_limit else 0.0,
            "Status": status,
            "nfc_uid": tag_uid
        })

        # 2. Check and Insert in PowerCard_System
        cursor.execute("SELECT COUNT(*) FROM POS.PowerCard_System WHERE id_Card = :id", {"id": id_card})
        exists_pwc = cursor.fetchone()[0] > 0

        if exists_pwc:
            sql_pwc_insert = """
                INSERT INTO POS.PowerCard_System (
                    id_Card, PAN, F_Name, L_Name, Amount,
                    POS_limit, ATM_limit, Status, Source, Operation, Timestmp
                ) VALUES (
                    :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                    :POS_limit, :ATM_limit, :Status, 'POS_Terminal', 'Paiement', CURRENT_TIMESTAMP
                )
            """
            cursor.execute(sql_pwc_insert, {
                "id_Card": id_card,
                "PAN": pan,
                "F_Name": f_name,
                "L_Name": l_name,
                "Amount": new_balance,
                "POS_limit": float(pos_limit) if pos_limit else 0.0,
                "ATM_limit": float(atm_limit) if atm_limit else 0.0,
                "Status": status
            })

        # 3. Insert in Events
        sql_event_insert = """
            INSERT INTO POS.Events (
                id_card, PAN, F_Name, L_Name, Amounts,
                POS_limit, ATM_limit, Status, Source, Operation, Timetmp
            ) VALUES (
                :id_Card, :PAN, :F_Name, :L_Name, :Amount,
                :POS_limit, :ATM_limit, :Status, 'POS_Terminal', 'Paiement', CURRENT_TIMESTAMP
            )
        """
        cursor.execute(sql_event_insert, {
            "id_Card": id_card,
            "PAN": pan,
            "F_Name": f_name,
            "L_Name": l_name,
            "Amount": new_balance,
            "POS_limit": float(pos_limit) if pos_limit else 0.0,
            "ATM_limit": float(atm_limit) if atm_limit else 0.0,
            "Status": status
        })

        connection.commit()
        print(f"Success! New Balance in DB: {new_balance}")
    else:
        print("Error: NFC UID not found.")

    cursor.close()
    connection.close()

if __name__ == "__main__":
    test_payment('1DA3DB53640000', '150.00')
