import requests

url = "http://localhost:5001/api/mobile/transfer"
payload = {
    "sender_card_id": "CRD-458371",
    "recipient_pan": "4532-4004-4498-2981",
    "recipient_first_name": "YAHYA",
    "recipient_last_name": "SINWAR",
    "amount": 50.0
}
try:
    resp = requests.post(url, json=payload)
    print(resp.json())
except Exception as e:
    print(e)
