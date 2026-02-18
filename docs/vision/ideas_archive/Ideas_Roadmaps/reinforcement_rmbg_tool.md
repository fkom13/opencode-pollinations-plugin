Ajouter un fall-back et documenter pour rembg:

Plus signaler dans l'outil et prévoir une commande pollinations pour entre ou changer la ou les clefs ou/avec carrement une fonction de l'outil qui réponds et l'agent lui signale la procédure pour rentrer la clefs pour chacuns des providers selectionnés suivants (y'en a qu'1 pour l'instant par api j'en ai pas trpuvé d'autre interessants)
>> prévoir un rotate key c'est a dire que la commande ajoutes des clefs au lieu de les effacer , t'es authorisé a en cramer une si besoin pour voir les codes d'erreurs ou tesster les limites et parametres



# BackgroundCut API v1

- mes clefs pour tester: 
ba5de329e61441d88bf48d9ccaa698b6fcd84b53, cba56bde8c434a47b150edee0527998a608709de, c2462cc4e8594f6a9c522fbbb134fda2fb4ea3bb, cb11b9a1f1464935b54fa3eb7f7b67988d811949, ead7db6e96bd48a0811396c13b98cecccfaa2200

c85dc7ee03e545869fd894a43a66ac65f1564256,64177def32604325948ddccc7284dfeed236949c

47e0aad9e6e944e7b408c877db5ef3ab5e32e7c2, 396227390fb34224b4f283de099953e719afb03c, 0b5cff29951c4271bdef0be2d389b32ab4eb3794, 8ce053ff67b8415bb38eb14aaf67899c9d1dd6f1, 71f17cc87f004b218486a55e8e0f36c8e918d029, 

The power of BackgroundCut, automated

$ curl -H 'Authorization: Token YOUR_API_KEY'
       -F 'file=@/your/image/file.jpg'
        https://backgroundcut.co/api/v1/cut/
Sample Code Examples
Image File   
   
Image URL   
   
API Reference
API Endpoint	https://backgroundcut.co/api/v1/cut/
Method	POST
Heading
Authorization (string)	Token YOUR_API_KEY
Parameters
file	Source image file. Supports only PNG, JPG, JPEG, WEBP
file_url	Source image URL. Support only PNG, JPG, JPEG, WEBP
max_resolution	Maximum output resolution (specified in pixels). Upto 12000000, i.e 12MP. For eg, 4000000 outputs image of maximum resolution of 4MP.
return_format	'PNG'(default), 'WEBP' (recommended).
quality	'High', 'Medium'(default), 'Low'. 'High' quality takes the most time while 'Low' takes the least time to process.
Response
Code : 200	Successfully removed image background
Code : 400	Error: Invalid parameters or unable to process input image file.
Code: 401	Error: API-KEY missing or invalid API-KEY
Code: 402	Error: No credits remaining
Code: 405	Error: Invalid request METHOD (Ensure the request is of type POST)
Code: 413	Error: Request Entity Too Large. File size should not exceed 12MB when uploading.
Code: 429	Error: API rate limit crossed
API Rate Limit
The BackgroundCut API has a dynamic rate-limiting feature starting at 40 requests per minute, which can double each minute based on the previous minute's usage, up to a maximum of 500 requests per minute. For example, if you make 40 requests in the first minute, your limit will double to 80 requests for the second minute, and so on, until the cap of 500 requests per minute is reached. Special increases in the rate limit can be requested. This dynamic scaling helps ensure optimal server performance.



NOUVELLE STRATEGIE POUR LE TOOL entrer cette clefs pour améliorer le tool et profiter d'une rate limit sans queue: 5$ free à l'inscription valable 60 jours !

ajouter  un parramettre par defaut sur cut optionnel pour choisir l'api

tester d'abord la feature

Example code:

# Install dependencies (npm install axios form-data)
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// API configuration
const API_ENDPOINT = "https://backgroundcut.co/api/v1/cut/";
const API_KEY = 'YOUR-API-KEY';

const IMAGE_PATH = "/path/to/image.jpg";

const REQUEST_PARAMETERS = {
  'max_resolution': '12000000',  // 12 MegaPixels (for example 4000 * 3000)
  'quality': 'medium',
  'return_format': 'webp',
};

const TIMEOUT_DURATION = 20000;  // milliseconds

const LOCAL_FILENAME = "/path/to/output.webp";

// Authorization header
const authHeader = { 'Authorization': `Token ${API_KEY}` };

// Create form data
const form = new FormData();
form.append('file', fs.createReadStream(IMAGE_PATH));
Object.keys(REQUEST_PARAMETERS).forEach(key => {
  form.append(key, REQUEST_PARAMETERS[key]);
});

// Send POST request to API endpoint
axios.post(API_ENDPOINT, form, {
  headers: { ...form.getHeaders(), ...authHeader },
  timeout: TIMEOUT_DURATION,
})
  .then(response => {
    if (response.status >= 200 && response.status < 300) {
      const outputImageUrl = response.data.output_image_url;

      // Download the output image
      axios.get(outputImageUrl, { responseType: 'stream' })
        .then(outputImageResponse => {
          const writer = fs.createWriteStream(LOCAL_FILENAME);
          outputImageResponse.data.pipe(writer);

          return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
        })
        .catch(err => {
          throw new Error(`Error downloading image: ${err.message}`);
        });
    } else if (response.status >= 400 && response.status < 500) {
      const error = new Error(`Client error. Status Code: ${response.status}.`);
      error.response = response.data;
      throw error;
    } else if (response.status >= 500 && response.status < 600) {
      throw new Error(`Server error. Status Code: ${response.status}`);
    } else {
      throw new Error(`Unexpected response. Status Code: ${response.status}`);
    }
  })
  .catch(err => {
    if (err.response && err.response.data) {
      console.error(`Error: ${err.message}`, err.response.data);
    } else {
      console.error(`Error: ${err.message}`);
    }
  });


+ DEVELLOPER MA QUEUE , Limit rate (1 requete pour 5 minutes, queue sur 3 process max dont un reservé pour moi sans queu), verifier si le vps tiens la charge sur 3 workers en paralleles


🎯 Résumé de l'implémentation
Provider par défaut : Ton VPS AWS (cut.esprit-artificiel.com) - gratuit mais lent (1 req/5min, queue 3 workers)
Provider premium : BackgroundCut API (backgroundcut.co)
- 5$ crédits offerts à l'inscription (60 jours)
- Rate limit dynamique : 40 → 500 req/min
- Formats : PNG, WEBP
- Max 12MP, 12MB
Nouveaux paramètres pour remove_background :
{
  "provider": "auto" | "cut" | "backgroundcut",  // default: "auto"
  "api_key": string,  // pour BackgroundCut
  "quality": "low" | "medium" | "high",  // BackgroundCut only
  "max_resolution": number,  // ex: 4000000 pour 4MP
  "return_format": "png" | "webp"  // default: "webp"
}
Logique "auto" :
1. Essaie BackgroundCut si api_key fournie
2. Si 402 (no credits) → fallback sur ton VPS
3. Si rate limit (429) → queue sur ton VPS
Commande à ajouter :
/pollinations key add backgroundcut <api_key>  # Ajoute une clé (rotation)
/pollinations key list backgroundcut           # Liste les clés
/pollinations key rotate backgroundcut         # Utilise clé suivante
Ta queue perso : 3 workers parallèles, 1 réservé (sans queue), 2 en queue (1 req/5min)
