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
    for tbl in ['POWERCARD_SYSTEM', 'EXTERNEL_SYSTEM']:
        print(f"\nConstraints for {tbl}:")
        cursor.execute(f"""
            SELECT constraint_name, search_condition 
            FROM user_constraints 
            WHERE table_name = '{tbl}' AND constraint_type = 'C'
        """)
        for row in cursor.fetchall():
            print(row[0], str(row[1]) if row[1] else "")
    cursor.close()
    connection.close()

if __name__ == "__main__":
    check()
