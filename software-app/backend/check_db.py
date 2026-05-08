import oracledb

ORACLE_USER = "POS"
ORACLE_PASSWORD = "Izinm123W"
ORACLE_DSN = "localhost:1521/XE"

def check_statuses():
    try:
        connection = oracledb.connect(
            user=ORACLE_USER,
            password=ORACLE_PASSWORD,
            dsn=ORACLE_DSN
        )
        cursor = connection.cursor()
        cursor.execute("SELECT DISTINCT STATUS FROM POS.PowerCard_System")
        statuses = [row[0] for row in cursor]
        print(f"Current statuses in DB: {statuses}")
        
        # Check constraints
        cursor.execute("""
            SELECT search_condition 
            FROM all_constraints 
            WHERE owner = 'POS' 
            AND table_name = 'POWERCARD_SYSTEM' 
            AND constraint_type = 'C'
        """)
        for row in cursor:
            print(f"Constraint: {row[0]}")
            
        connection.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_statuses()
