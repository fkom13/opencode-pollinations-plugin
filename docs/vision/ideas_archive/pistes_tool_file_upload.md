Sources
1

file.io - Super simple file sharing

https://www.file.io/

favicon
2

9 Free Anonymous File Sharing Services With Temporary Online Storage

https://www.geckoandfly.com/25928/anonymous-file-sharing-storage/

preview
favicon
3

Free Temporary File Upload - No Signup Required

https://tmpfile.link/blog/free-temporary-file-upload-no-signup

favicon
4

GitHub - nokonoko/Uguu: Uguu is a simple lightweight temporary file host with support for drop, paste, click and API uploading.

https://github.com/nokonoko/Uguu

preview
favicon
5

Wormhole - Simple, private file sharing

https://wormhole.app/

preview
favicon
6

tfLink - Free Temp File Upload | Temporary Download Links

https://tmpfile.link/

preview
favicon
7

SafeNote | Encrypt and send files and notes with a link that automatically destruct after being read.

https://safenote.co/upload-file

preview
8

Hostize - Super simple file sharing

https://blog.hostize.com/post/10/anonymous-file-sharing-storage/

favicon
9

Uguu · Temporary file hosting

https://uguu.se/

favicon
10

Build software better, together

https://github.com/topics/filehosting

preview
11

0x0

https://0x0.st/

favicon
12

0x0.st

https://brontosaurusrex.github.io/2025/10/17/0x0.st/

favicon
13

GitHub - AndyRusso/0x0: 0x0.st upload bash script implementing the full 0x0 API and extra QoL.

https://github.com/AndyRusso/0x0

preview
favicon
14

Alternative solutions · Issue #116 · dutchcoders/transfer.sh

https://github.com/dutchcoders/transfer.sh/issues/116

preview
favicon
15

File sharing from the command line

https://www.jrodal.com/posts/file-sharing-from-cml/

favicon
16

GitHub - jrodal98/transfer: A bash script for uploading and downloading from https://transfer.sh/ and https://0x0.st/

https://github.com/jrodal98/transfer

preview
favicon
17

0x0.st: A Simple File Hosting Service

https://mzunino.com.uy/til/2025/03/0x0.st-a-simple-file-hosting-service/

preview
favicon
18

GitHub - sm0rux/0x0: Script to upload files etc to 0x0.st

https://github.com/sm0rux/0x0

preview
favicon
19

0x0/0x0.sh at main · sm0rux/0x0

https://github.com/sm0rux/0x0/blob/main/0x0.sh

preview
favicon
20

TIL: Public File Hosting with 0x0.st

https://lalitm.com/til-public-file-hosting-with-0x0-st/

Voici un aperçu complet des meilleurs services gratuits et anonymes pour créer un outil TypeScript d'hébergement temporaire de fichiers.

📋 Comparatif des meilleurs services
Service	Limite	Durée	API	Particularité
file.io	
1
4 Go	Auto-suppression	REST	
1
"Once you have uploaded your files and shared the link... the file will not linger indefinitely in the cloud. As soon as it has been received by the intended recipient, your file is gone forever!"
0x0.st	
12
512 Mo	
15
30 jours à 1 an selon la taille	curl POST	
17
"It's a super simple file-hosting service—perfect for quickly sharing files with just a single curl command."
tmpfile.link	
6
100 Mo par fichier	
6
7 jours pour les uploads anonymes	REST	
6
Supporte les uploads anonymes, intégration API/CLI, et accélération CDN globale.
Uguu.se	Varie	Temporaire	API	
9
"Simple-to-use free temporary file hosting service... share your photos, documents, music, videos and more with others online with no ads, account sign-up or tracking."
Wormhole	-	Auto-expire	-	
5
"Lets you share files with end-to-end encryption and a link that automatically expires."
Safenote Upload	
7
20 Mo max, 5 fichiers	Auto-suppression	REST	
7
"Simply upload a file, share the link, and after it is downloaded, the file is completely deleted."
Gofile	
2
Illimité	Variable	REST	
2
"Free and anonymous file-sharing platform. You can store and share data of all types... There is no limit, you download at the maximum speed of your connection."
🛠️ Implémentation TypeScript
Installation des dépendances
Bash

npm install axios form-data
npm install --save-dev @types/node typescript
1️⃣ Upload vers file.io (Le plus sécurisé - 1 seul téléchargement)
1
 "It is anonymous and we erase everything. Our log files contain no identifying information. There are no backups, and all files are stored encrypted."
TypeScript

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

interface FileIOResponse {
  success: boolean;
  link: string;
  expiry: string;
}

async function uploadToFileIO(filePath: string, expiresIn: string = '14d'): Promise<string> {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('expires', expiresIn); // ex: '1d', '1w', '14d'

  const response = await axios.post<FileIOResponse>('https://file.io', form, {
    headers: form.getHeaders(),
  });

  return response.data.link;
}

// Usage
uploadToFileIO('./secret.zip', '7d').then(link => console.log('Lien:', link));
2️⃣ Upload vers 0x0.st (Minimaliste, fiable)
20
 "It's essentially a simple, no-account, temporary file hosting site where you can just upload a file using a simple HTTP POST and the site will host it for you for between 30 days and 1 year depending on the size of the file."
TypeScript

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function uploadTo0x0(filePath: string): Promise<string> {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const response = await axios.post('https://0x0.st', form, {
    headers: form.getHeaders(),
  });

  return response.data; // Retourne directement l'URL en texte brut
}

// Usage
uploadTo0x0('./mon-fichier.png').then(url => console.log('URL:', url));
3️⃣ Upload vers tmpfile.link (API moderne avec CDN)
3
 Offre "100MB free temporary file upload with global CDN, QR sharing, and API/CLI support."
TypeScript

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

interface TmpFileLinkResponse {
  downloadLink: string;
  fileName: string;
  size: number;
}

async function uploadToTmpFileLink(filePath: string): Promise<string> {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const response = await axios.post<TmpFileLinkResponse>(
    'https://tmpfile.link/api/upload',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'Accept': 'application/json',
      },
    }
  );

  return response.data.downloadLink;
}
🔧 Outil CLI complet multi-services
TypeScript

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

type Service = 'fileio' | '0x0' | 'tmpfile';

const SERVICES = {
  fileio: {
    url: 'https://file.io',
    extract: (res: any) => res.link,
  },
  '0x0': {
    url: 'https://0x0.st',
    extract: (res: any) => res, // texte brut
  },
  tmpfile: {
    url: 'https://tmpfile.link/api/upload',
    extract: (res: any) => res.downloadLink,
  },
};

async function upload(filePath: string, service: Service = 'fileio'): Promise<string> {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const config = SERVICES[service];
  
  const response = await axios.post(config.url, form, {
    headers: {
      ...form.getHeaders(),
      'Accept': 'application/json',
    },
  });

  return config.extract(response.data);
}

// Usage CLI
const [,, filePath, service = 'fileio'] = process.argv;

if (!filePath) {
  console.log('Usage: npx ts-node upload.ts <fichier> [fileio|0x0|tmpfile]');
  process.exit(1);
}

upload(filePath, service as Service)
  .then(link => console.log(`✅ Lien: ${link}`))
  .catch(err => console.error('❌ Erreur:', err.message));
🔐 Conseils pour l'anonymat
Chiffrement local avant upload (AES-256)
User-Agent générique pour masquer ton outil
Proxy/Tor pour masquer ton IP (socks-proxy-agent)
TypeScript

// Exemple avec proxy SOCKS (Tor)
import { SocksProxyAgent } from 'socks-proxy-agent';

const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');
axios.post(url, form, { httpsAgent: agent });
📌 Résumé
Besoin	Service recommandé
Sécurité max (1 téléchargement)	file.io
Simplicité CLI	0x0.st
CDN rapide	tmpfile.link
Gros fichiers illimités	Gofile
