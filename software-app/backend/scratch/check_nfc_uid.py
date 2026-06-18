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
    cursor.execute("SELECT NFC_UID FROM POS.Externel_System WHERE ID_CARD = 'CRD-458371'")
    rows = cursor.fetchall()
    print("NFC_UIDs for CRD-458371:")
    for r in rows:
        print(r)
    cursor.close()
    connection.close()

if __name__ == "__main__":
    check()
