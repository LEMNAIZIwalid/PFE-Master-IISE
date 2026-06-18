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
    
    for table in ["PowerCard_System", "Externel_System", "Events"]:
        print(f"\n=== Columns in POS.{table} ===")
        cursor.execute(f"SELECT * FROM POS.{table} WHERE 1=0")
        for col in cursor.description:
            print(col[0], col[1])
            
    cursor.close()
    connection.close()

if __name__ == "__main__":
    check()
