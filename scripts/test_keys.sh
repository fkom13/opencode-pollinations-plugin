#!/bin/bash
KEYS=("plln_sk_F7a4RcBG4AVCeBSo6lnS36EKwm0nPn1O" "sk_zbtwJAMIz5OOOMfFrqKAymcdpgePkxxK" "sk_o4N4BWpNHXbDf5RaShTDPPLYxS2E9qTA")
NAMES=("LIMITED_KEY" "ADMIN_KEY" "STANDARD_KEY")
ENDPOINTS=("/account/profile" "/account/balance" "/account/usage")

echo "Starting Test..."

for i in "${!KEYS[@]}"; do
    KEY="${KEYS[$i]}"
    NAME="${NAMES[$i]}"
    echo "========================================"
    echo "TESTING KEY: $NAME"
    for EP in "${ENDPOINTS[@]}"; do
        echo "----------------------------------------"
        echo "Endpoint: $EP"
        # We capture the output and status code
        RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $KEY" "https://gen.pollinations.ai$EP")
        echo "Response: $RESPONSE"
    done
    echo ""
done
echo "Test Complete."
