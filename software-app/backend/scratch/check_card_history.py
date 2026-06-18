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
    
    print("=== PowerCard_System History ===")
    cursor.execute("""
        SELECT AMOUNT, STATUS, SOURCE, OPERATION, TIMESTMP
        FROM POS.PowerCard_System
        WHERE ID_CARD = 'CRD-621531'
        ORDER BY TIMESTMP ASC
    """)
    for row in cursor.fetchall():
        print(row)
        
    print("\n=== Externel_System History ===")
    cursor.execute("""
        SELECT AMOUNT, STATUS, SOURCE, OPERATION, TIMESTMP
        FROM POS.Externel_System
        WHERE ID_CARD = 'CRD-621531'
        ORDER BY TIMESTMP ASC
    """)
    for row in cursor.fetchall():
        print(row)
        
    print("\n=== Events History ===")
    cursor.execute("""
        SELECT AMOUNTS, STATUS, SOURCE, OPERATION, TIMETMP
        FROM POS.Events
        WHERE ID_CARD = 'CRD-621531'
        ORDER BY TIMETMP ASC
    """)
    for row in cursor.fetchall():
        print(row)
        
    cursor.close()
    connection.close()

if __name__ == "__main__":
    check()
