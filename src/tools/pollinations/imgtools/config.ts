// imgtools/config.ts — endpoints, crypto params, headers des 4 outils
// Adapté depuis /home/fkomp/Bureau/oracle/dev-serveur/iamges-tools-api/modules/config.js

export const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36';

export const CRYPTO = {
  PBKDF2: { iterations: 10000, hash: 'sha256', keylen: 32 },
  AES_GCM: { ivLen: 12, tagLen: 16 },
  password: 'vH33r_2025_AES_GCM_S3cur3_K3y_9X7mP4qR8nT2wE5yU1oI6aS3dF7gH0jK9lZ',
};

export interface ToolConfig {
  name: string;
  label: string;
  host: string;
  uploadPath: string;
  statusPath: string;
  crypto: typeof CRYPTO & { salt: string } | null;
  statusType: number;
  statusField: string;
  maxPolls: number;
  pollInterval: number;
  downloadUrlsFormat?: string;
  page: string;
  uploadFields?: Record<string, string>;
  statusBodyBuilder?: (codes: string[]) => Record<string, unknown>;
  selectedModel?: string;
  modelName?: string;
  tool?: string;
  resultBase?: string;
  ratios?: string[];
  targetLongestSides?: Array<{ label: string; value: number }>;
  prompt?: string;
}

export const TOOLS: Record<string, ToolConfig> = {
  rmbg: {
    name: 'rmbg',
    label: 'Background Removal',
    host: 'bgeraser.com',
    uploadPath: '/api/bgeraser/legacy/upload',
    statusPath: '/api/bgeraser/legacy/status',
    crypto: null,
    statusType: 4,
    statusField: 'codes',
    uploadFields: { type: '4', mattValue: '0' },
    maxPolls: 30,
    pollInterval: 5000,
    downloadUrlsFormat: 'object',
    page: 'https://bgeraser.com',
  },
  ruo: {
    name: 'ruo',
    label: 'Remove Unwanted Objects',
    host: 'objectremover.com',
    uploadPath: '/api/u2/upload',
    statusPath: '/api/u2/status',
    crypto: { ...CRYPTO, salt: 'objectremover-salt-2026' },
    statusType: 7,
    statusField: 'code',
    maxPolls: 40,
    pollInterval: 3000,
    selectedModel: 'flux_klein/edit',
    modelName: 'Flux Klein Edit',
    tool: 'object-remover',
    page: 'https://objectremover.com',
    resultBase: 'https://access.vheer.com/results',
  },
  upscale: {
    name: 'upscale',
    label: 'Image Upscaler',
    host: 'imgupscaler.com',
    uploadPath: '/api/legacy/upload',
    statusPath: '/api/legacy/status',
    crypto: null,
    statusType: 4,
    statusField: 'codes',
    statusBodyBuilder: (codes: string[]) => ({ taskId: codes[0] }),
    uploadFields: { type: '4' },
    maxPolls: 30,
    pollInterval: 5000,
    downloadUrlsFormat: 'array',
    page: 'https://imgupscaler.com',
    ratios: ['200', '400'],
  },
  enhance: {
    name: 'enhance',
    label: 'AI Image Enhancer',
    host: 'imgupscaler.com',
    uploadPath: '/api/u2/upload',
    statusPath: '/api/u2/status',
    crypto: { ...CRYPTO, salt: 'imgupscaler-salt-2026' },
    statusType: 7,
    statusField: 'code',
    maxPolls: 40,
    pollInterval: 3000,
    selectedModel: 'hypir',
    modelName: 'Hypir Enhancer',
    page: 'https://imgupscaler.com/enhancer',
    resultBase: 'https://access.vheer.com/results',
    prompt: 'preserve facial identity, preserve facial geometry, restore image clarity, enhance natural details, reduce blur and noise, preserve original colors and structure',
    targetLongestSides: [
      { label: '1K', value: 1024 },
      { label: '2K', value: 2048 },
      { label: '4K', value: 4096 },
    ],
  },
};