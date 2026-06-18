import requests

print("=== PWC Transactions ===")
resp = requests.get("http://localhost:5001/api/transactions")
data = resp.json()
print("Number of transactions:", len(data))
for trx in data[:5]:
    print(trx)

print("\n=== External Transactions ===")
resp = requests.get("http://localhost:5001/api/external/transactions")
data = resp.json()
print("Number of transactions:", len(data))
for trx in data[:5]:
    print(trx)
