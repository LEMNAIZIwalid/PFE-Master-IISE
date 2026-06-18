import oracledb

try:
    connection = oracledb.connect(user="POS", password="Izinm123W", dsn="172.22.32.1:1521/XE")
    cursor = connection.cursor()

    for table in ['PowerCard_System', 'Externel_System']:
        cursor.execute(f"""
            SELECT constraint_name, search_condition 
            FROM user_constraints 
            WHERE table_name = '{table.upper()}' AND constraint_type = 'C'
        """)
        rows = cursor.fetchall()
        print(f"\nConstraints for {table}:")
        for row in rows:
            condition = str(row[1]) if row[1] else ""
            print(f"  {row[0]}: {condition}")
            if "Source IN" in condition or "Source in" in condition:
                print(f"    --> Dropping constraint {row[0]}")
                try:
                    cursor2 = connection.cursor()
                    cursor2.execute(f"ALTER TABLE POS.{table} DROP CONSTRAINT {row[0]}")
                    print("    --> Dropped successfully.")
                except Exception as e:
                    print("    --> Error dropping:", e)
    connection.commit()
except Exception as e:
    print(e)
