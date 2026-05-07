import oracledb
import sys

# Forcer l'encodage en UTF-8 pour la console si possible
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ORACLE_USER = "POS"
ORACLE_PASSWORD = "Izinm123W"
ORACLE_DSN = "localhost:1521/XE"

try:
    connection = oracledb.connect(
        user=ORACLE_USER,
        password=ORACLE_PASSWORD,
        dsn=ORACLE_DSN
    )
    print(f"Oracle Connection: SUCCESS (version {connection.version})")
    
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM POS.Events")
        count = cursor.fetchone()[0]
        print(f"Table POS.Events: OK, Count = {count}")
    except Exception as e:
        print(f"Table POS.Events: ERROR ({e})")
        
        # Try uppercase just in case
        try:
            cursor.execute("SELECT COUNT(*) FROM POS.EVENTS")
            count = cursor.fetchone()[0]
            print(f"Table POS.EVENTS: OK, Count = {count}")
        except:
            print("Table POS.EVENTS: NOT FOUND either")

    connection.close()
except Exception as e:
    print(f"Oracle Connection: FAILED ({e})")
