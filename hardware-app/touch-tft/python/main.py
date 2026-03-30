from arduino.app_utils import App
from arduino.bridge import Bridge
import time

# Variables pour suivre le dernier clic
old_x, old_y = -1, -1

def loop():
    global old_x, old_y
    
    # On récupère les valeurs envoyées par le C++
    val_x = Bridge.get("pos_touch_x")
    val_y = Bridge.get("pos_touch_y")

    # Si les valeurs existent et sont nouvelles
    if val_x is not None and val_x != old_x:
        print(f"[PYTHON] Clic détecté ! Coordonnées: X={val_x}, Y={val_y}")
        
        # --- VOTRE LOGIQUE POS ICI ---
        # Exemple: if val_x > 200: exécuter_action()
        
        # Mise à jour pour ne pas traiter deux fois le même clic
        old_x = val_x
        old_y = val_y

    time.sleep(0.05)

App.run(user_loop=loop)