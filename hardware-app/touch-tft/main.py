from arduino.app_utils import *
import time
from datetime import datetime, timedelta, timezone
import threading

_last_send = time.time() + 2.0 # Attendre avant le 1er envoi
is_sending = False

def send_data_async(time_str, date_str, wifi_status, battery_val):
    global is_sending
    try:
        Bridge.call("update_status", time_str, date_str, wifi_status, battery_val)
    except Exception as e:
        if "not available" in str(e) or "timed out" in str(e):
            pass # Silent pour ne pas polluer l'attente
        else:
            print(f"[PYTHON] Erreur RPC: {e}")
    finally:
        is_sending = False

def loop():
    global _last_send, is_sending
    
    if time.time() - _last_send < 1.0:
        return
    _last_send = time.time()

    if is_sending:
        return
    is_sending = True

    # Casablanca
    tz_morocco = timezone(timedelta(hours=1))
    now = datetime.now(tz_morocco)
    time_str = now.strftime("%H:%M")
    
    days_en = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = days_en[now.weekday()]
    date_str = f"{day_name} : {now.day}/{now.month}/{now.year}"
    
    if int(time.time()) % 10 == 0:
        wifi_status = "E"
    else:
        wifi_status = "Connected"
    
    battery_val = f"{80 + (int(time.time()) % 15)}%"
    
    t = threading.Thread(target=send_data_async, args=(time_str, date_str, wifi_status, battery_val))
    t.daemon = True
    t.start()

App.run(user_loop=loop)
