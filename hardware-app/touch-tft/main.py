from arduino.app_utils import *
import time
from datetime import datetime, timedelta, timezone

def loop():
    # Casablanca est à GMT + 1h
    tz_morocco = timezone(timedelta(hours=1))
    now = datetime.now(tz_morocco)
    time_str = now.strftime("%H:%M")
    
    # Date avec jour en anglais
    days_en = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = days_en[now.weekday()]
    date_str = f"{day_name} : {now.day}/{now.month}/{now.year}"
    
    # Simulation des données
    # Si le temps est divisible par 10, on simule une déconnexion ("E")
    if int(time.time()) % 10 == 0:
        wifi_status = "E"
    else:
        wifi_status = "Connected"
    
    battery_val = f"{80 + (int(time.time()) % 15)}%"
    
    try:
        # On passe désormais 4 paramètres
        Bridge.call("update_status", time_str, date_str, wifi_status, battery_val)
    except Exception as e:
        if "not available" in str(e):
            print("[PYTHON] En attente de l'Arduino...")
        else:
            print(f"[PYTHON] Erreur RPC: {e}")
    
    time.sleep(1)

App.run(user_loop=loop)
