import sys
import os

# Add hardware python directory to path
sys.path.insert(0, r"c:\Users\user\Desktop\PFE-MASTER-IISE\hardware-app\touch-tft\python")

import main
# We need to discover the DB host first so that the test knows the host IP
main.discover_host_ip()

# Test NFC Payment for 150 EUR on the NFC UID
main.on_payment_success('1DA3DB53640000', '150.00')
