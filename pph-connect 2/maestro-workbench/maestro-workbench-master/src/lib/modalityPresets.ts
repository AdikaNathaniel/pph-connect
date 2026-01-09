import type { ColumnConfig, Modality, ModalityConfig } from '@/types';

export interface ModalityPreset {
  id: string;
  label: string;
  description: string;
  modality: Modality;
  features: string[];
  modalityConfig: ModalityConfig;
  defaultColumns: ColumnConfig[];
}

const textColumns: ColumnConfig[] = [
  {
    id: 'source_text',
    name: 'Source Text',
    type: 'read',
    tooltip: 'Reference passage or conversation snippet',
  },
  {
    id: 'rich_response',
    name: 'Worker Response',
    type: 'write',
    inputType: 'textarea',
    required: true,
    tooltip: 'Supports markdown for bold/italic, bullet lists, etc.',
  },
  {
    id: 'entities_json',
    name: 'Entities (JSON)',
    type: 'write',
    inputType: 'textarea',
    tooltip: 'List entities with label + span, e.g., [{"label":"ORG","value":"PPH"}]',
  },
  {
    id: 'sentiment_label',
    name: 'Sentiment',
    type: 'write',
    inputType: 'radio',
    required: true,
    options: ['negative', 'neutral', 'positive'],
    tooltip: 'Overall sentiment classification',
  },
];

const imageColumns: ColumnConfig[] = [
  {
    id: 'image_url',
    name: 'Image URL',
    type: 'read',
    tooltip: 'Publicly accessible image reference',
  },
  {
    id: 'bounding_boxes',
    name: 'Bounding Boxes (JSON)',
    type: 'write',
    inputType: 'textarea',
    required: true,
    tooltip: 'Each entry should include label + x/y/width/height',
  },
  {
    id: 'polygons',
    name: 'Polygon Annotations',
    type: 'write',
    inputType: 'textarea',
    tooltip: 'Optional polygon coordinates for complex regions',
  },
  {
    id: 'keypoints',
    name: 'Keypoints',
    type: 'write',
    inputType: 'textarea',
    tooltip: 'Skeleton or landmark points (list of x/y pairs)',
  },
  {
    id: 'segmentation_mask',
    name: 'Segmentation Mask URL',
    type: 'write',
    inputType: 'text',
    tooltip: 'Link to uploaded mask or RLE string',
  },
];

const videoColumns: ColumnConfig[] = [
  {
    id: 'video_url',
    name: 'Video URL',
    type: 'read',
    tooltip: 'Clip reference hosted in storage',
  },
  {
    id: 'frame_notes',
    name: 'Frame-by-frame Notes',
    type: 'write',
    inputType: 'textarea',
    tooltip: 'Important timestamps + context',
  },
  {
    id: 'object_tracks',
    name: 'Object Tracks (JSON)',
    type: 'write',
    inputType: 'textarea',
    tooltip: 'Track IDs with bounding boxes per frame',
  },
  {
    id: 'action_label',
    name: 'Action Label',
    type: 'write',
    inputType: 'select',
    options: ['walking', 'running', 'talking', 'other'],
    required: true,
    tooltip: 'Primary action or behavior',
  },
];

const multimodalColumns: ColumnConfig[] = [
  {
    id: 'primary_text',
    name: 'Primary Text Prompt',
    type: 'read',
    tooltip: 'Short paragraph or conversation snippet to evaluate',
  },
  {
    id: 'reference_image_url',
    name: 'Reference Image URL',
    type: 'read',
    tooltip: 'Optional supporting asset',
  },
  {
    id: 'worker_response',
    name: 'Worker Response',
    type: 'write',
    inputType: 'textarea',
    required: true,
    tooltip: 'Justify answer referencing both modalities',
  },
  {
    id: 'grounding_rating',
    name: 'Cross-Modal Grounding',
    type: 'write',
    inputType: 'radio',
    options: ['excellent', 'good', 'fair', 'poor'],
    required: true,
    tooltip: 'How well does the response align across text & image?',
  },
];

export const MODALITY_PRESETS: Record<'text' | 'image' | 'video' | 'multimodal', ModalityPreset> = {
  text: {
    id: 'text',
    label: 'Text Annotation',
    description: 'Rich text triage with entity tagging and sentiment scoring.',
    modality: 'text',
    features: ['Rich text editor', 'Entity recognition helpers', 'Sentiment scale (negative → positive)'],
    modalityConfig: {
      text: {
        maxLength: 1500,
        minLength: 50,
        allowMarkdown: true,
      },
    } as ModalityConfig,
    defaultColumns: textColumns,
  },
  image: {
    id: 'image',
    label: 'Image Labeling',
    description: 'Bounding boxes, polygons, keypoints, and segmentation masks.',
    modality: 'image',
    features: ['Bounding boxes + polygons', 'Keypoint skeletons', 'Semantic segmentation support'],
    modalityConfig: {
      image: {
        fileFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxResolution: '4096x4096',
        annotationTools: ['bounding-box', 'polygon', 'keypoint', 'segmentation'],
      },
    } as ModalityConfig,
    defaultColumns: imageColumns,
  },
  video: {
    id: 'video',
    label: 'Video Tracking',
    description: 'Frame-by-frame labeling with object tracking and action recognition.',
    modality: 'video',
    features: ['Frame timeline controls', 'Object tracking JSON schema', 'Action recognition label set'],
    modalityConfig: {
      video: {
        fileFormats: ['mp4', 'mov'],
        maxDuration: 180,
        playbackControls: {
          speed: true,
          frame: true,
        },
      },
    } as ModalityConfig,
    defaultColumns: videoColumns,
  },
  multimodal: {
    id: 'multimodal',
    label: 'Multimodal QA',
    description: 'Blend text + image (or audio) inputs with grounded reasoning.',
    modality: 'multimodal',
    features: ['Side-by-side text + image context', 'Grounding score for responses', 'Supports reference assets'],
    modalityConfig: {
      multimodal: {
        channels: ['text', 'image'],
        supportsFileUpload: true,
        allowReferenceAssets: true,
      },
    } as ModalityConfig,
    defaultColumns: multimodalColumns,
  },
};
