# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
import time

def loop():
    # Tout est géré dans sketch.ino (le tactile + les couleurs).
    # Toutefois, vous pouvez également contrôler l'écran depuis Python !
    # Bridge.call("set_theme_mode", True)  # Optionnel
    pass

App.run(user_loop=loop)
