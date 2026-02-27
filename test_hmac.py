import time
import hmac
import hashlib

timestamp = "1740614000000"
secret = "super_secret_community_key_2026"
payload = f"request-rembg-v1:{timestamp}"
expected_sig = hmac.new(secret.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
print(f"Python sig: {expected_sig}")
