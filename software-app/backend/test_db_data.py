import oracledb

ORACLE_USER = "POS"
ORACLE_PASSWORD = "Izinm123W"
ORACLE_DSN = "172.22.32.1:1521/XE"

def test_db():
    try:
        connection = oracledb.connect(
            user=ORACLE_USER,
            password=ORACLE_PASSWORD,
            dsn=ORACLE_DSN
        )
        cursor = connection.cursor()
        
        print("--- PowerCard_System ---")
        cursor.execute("SELECT COUNT(*) FROM POS.PowerCard_System")
        print(f"Total rows in PowerCard_System: {cursor.fetchone()[0]}")
        
        print("\n--- Events ---")
        cursor.execute("SELECT COUNT(*) FROM POS.Events")
        print(f"Total rows in Events: {cursor.fetchone()[0]}")
        
        cursor.close()
        connection.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_db()
