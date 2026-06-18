import oracledb
import sys

try:
    connection = oracledb.connect(user="POS", password="Izinm123W", dsn="172.22.32.1:1521/XE")
    cursor = connection.cursor()
    cursor.execute("""
        SELECT search_condition, table_name
        FROM user_constraints 
        WHERE constraint_name = 'CHK_EVENTS_SOURCE'
    """)
    row = cursor.fetchone()
    if row:
        print("Constraint Condition:", row[0])
        print("Table:", row[1])
    else:
        print("Constraint not found in POS schema.")
except Exception as e:
    print(e)
