#!/bin/bash

export PROMPT="A%20cinematic%204k%20drone%20shot%20of%20a%20futuristic%20neon%20city%20at%20night"
export IMAGE="https://dummyimage.com/1280x720/000/000.jpg"

echo "Démarrage boucle CURL pour tester Wan en T2V (15s, sound=true, 16:9)..."

for i in {1..30}; do
  echo "Tentative $i..."
  # On rajoute --max-time 150 au cas où la génération prend beaucoup de temps.
  HTTP_CODE=$(curl -s -L -X GET "https://gen.pollinations.ai/image/${PROMPT}?model=wan&width=1280&height=720&duration=10&sound=true&image=${IMAGE}" \
    -H "Authorization: Bearer sk_eZbhgG1oJaaqSZKMvmy8nfVH9NNAGp0H" \
    --max-time 150 \
    -o wan_15s_success.mp4 \
    -w "%{http_code}")
    
  if [ "$HTTP_CODE" == "200" ]; then
    echo "Succès ! Vidéo générée (HTTP 200)."
    ls -lh wan_15s_success.mp4
    break
  elif [ "$HTTP_CODE" == "400" ]; then
    echo "Erreur 400 (Validation)."
    cat wan_15s_success.mp4
    break
  else
    echo "Erreur $HTTP_CODE (Rate Limit ou Gateway). Nouvelle tentative dans 3s..."
    sleep 3
  fi
done
