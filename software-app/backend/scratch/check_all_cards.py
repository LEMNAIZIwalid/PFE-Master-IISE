import oracledb

ORACLE_USER = "POS"
ORACLE_PASSWORD = "Izinm123W"
ORACLE_DSN = "172.22.32.1:1521/XE"

def check():
    connection = oracledb.connect(
        user=ORACLE_USER,
        password=ORACLE_PASSWORD,
        dsn=ORACLE_DSN
    )
    cursor = connection.cursor()
    
    print("=== PowerCard_System Distinct Cards ===")
    cursor.execute("""
        SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, TIMESTMP, OPERATION
        FROM (
            SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, TIMESTMP, OPERATION,
                   ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
            FROM POS.PowerCard_System
        ) WHERE rn = 1
    """)
    for row in cursor.fetchall():
        print(row)
        
    print("\n=== Externel_System Distinct Cards ===")
    cursor.execute("""
        SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, TIMESTMP, OPERATION
        FROM (
            SELECT ID_CARD, PAN, F_NAME, L_NAME, AMOUNT, TIMESTMP, OPERATION,
                   ROW_NUMBER() OVER (PARTITION BY ID_CARD ORDER BY TIMESTMP DESC) as rn
            FROM POS.Externel_System
        ) WHERE rn = 1
    """)
    for row in cursor.fetchall():
        print(row)
        
    cursor.close()
    connection.close()

if __name__ == "__main__":
    check()
