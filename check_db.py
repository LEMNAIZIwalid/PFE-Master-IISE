import oracledb

def check_virements():
    connection = oracledb.connect(user="POS", password="Izinm123W", dsn="172.22.32.1:1521/XE")
    cursor = connection.cursor()
    cursor.execute("""
        SELECT ID_CARD, SOURCE, OPERATION, TIMESTMP 
        FROM POS.PowerCard_System 
        WHERE UPPER(OPERATION) = 'VIREMENT'
        UNION ALL
        SELECT ID_CARD, SOURCE, OPERATION, TIMESTMP 
        FROM POS.Externel_System 
        WHERE UPPER(OPERATION) = 'VIREMENT'
    """)
    rows = cursor.fetchall()
    print("VIREMENT rows found:", len(rows))
    for r in rows:
        print(r)
    
if __name__ == "__main__":
    check_virements()
