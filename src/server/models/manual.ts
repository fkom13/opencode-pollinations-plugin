/**
 * Manual Model Registry (Overrides)
 * 
 * Defines local patches for models that the dynamic API does not provide.
 * These patches are deeply merged into the dynamic registry at runtime.
 */

import type { PollinationsModel } from './types.js';

export interface ManualOverride {
    name: string;
    category: PollinationsModel['category'];
    patch: Partial<PollinationsModel>;
}

export const MANUAL_OVERRIDES: ManualOverride[] = [
    // Video Models
    {
        name: 'grok-video',
        category: 'video',
        patch: {
            durationRange: [1, 15],
            aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
            costHeader: 'x-usage-completion-video-seconds',
            genTimeEstimate: '~10s',
        }
    },
    {
        name: 'ltx-2',
        category: 'video',
        patch: {
            durationRange: [5, 20],
            aspectRatios: ['16:9'],
            costHeader: 'x-usage-completion-video-seconds',
            genTimeEstimate: '~35s',
        }
    },
    {
        name: 'wan',
        category: 'video',
        patch: {
            durationRange: [5, 10], // API validates max 10
            aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
            costHeader: 'x-usage-completion-video-seconds',
            genTimeEstimate: '~30-60s',
            input_modalities: ['image', 'text'],
            description: 'Powerful video model. 💡 Text-to-Video Hack: To use in T2V mode, you MUST provide a dummy blank image URL in the `image` parameter (e.g., https://dummyimage.com/1280x720/000/000.jpg) matching your desired aspect ratio.'
        }
    },
    {
        name: 'veo',
        category: 'video',
        patch: {
            durationRange: [4, 8],
            aspectRatios: ['16:9', '9:16', '1:1'],
            costHeader: 'x-usage-completion-video-seconds',
            genTimeEstimate: '~45-68s',
        }
    },
    {
        name: 'seedance',
        category: 'video',
        patch: {
            durationRange: [4, 12],
            aspectRatios: ['16:9', '9:16', '1:1'],
            costHeader: 'x-usage-completion-video-tokens',
            genTimeEstimate: '~30s',
        }
    },
    {
        name: 'seedance-pro',
        category: 'video',
        patch: {
            durationRange: [4, 12],
            aspectRatios: ['16:9', '9:16', '1:1'],
            costHeader: 'x-usage-completion-video-tokens',
            genTimeEstimate: '~30s',
        }
    },

    // Image Models
    {
        name: 'kontext',
        category: 'image',
        patch: {
            costHeader: 'x-usage-completion-image-tokens',
        }
    },
    {
        name: 'klein',
        category: 'image',
        patch: {
            costHeader: 'x-usage-completion-image-tokens',
        }
    }
];

export function getManualOverrides(category: PollinationsModel['category']): ManualOverride[] {
    return MANUAL_OVERRIDES.filter(o => o.category === category);
}

export function getManualPatch(category: PollinationsModel['category'], name: string): Partial<PollinationsModel> | undefined {
    return MANUAL_OVERRIDES.find(o => o.category === category && o.name === name)?.patch;
}
