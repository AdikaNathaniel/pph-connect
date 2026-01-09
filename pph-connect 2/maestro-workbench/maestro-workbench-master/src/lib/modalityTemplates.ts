import type { ColumnConfig, Modality, ModalityConfig } from '@/types';

export interface ModalityTemplateDefinition {
  id: string;
  label: string;
  description: string;
  modality: Modality;
  features: string[];
  modalityConfig: ModalityConfig;
  columns: ColumnConfig[];
}

const imageClassificationColumns: ColumnConfig[] = [
  { id: 'image_url', name: 'Image URL', type: 'read', tooltip: 'Publicly accessible asset' },
  { id: 'instructions', name: 'Instructions', type: 'read', tooltip: 'Classification rubric' },
  {
    id: 'class_label',
    name: 'Class Label',
    type: 'write',
    inputType: 'select',
    options: ['cat', 'dog', 'other'],
    required: true,
  },
  {
    id: 'confidence',
    name: 'Confidence (0-1)',
    type: 'write',
    inputType: 'number',
    validation: { min: 0, max: 1 },
  },
  {
    id: 'notes',
    name: 'Notes',
    type: 'write',
    inputType: 'textarea',
  },
];

const objectDetectionColumns: ColumnConfig[] = [
  { id: 'image_url', name: 'Image URL', type: 'read' },
  {
    id: 'detections',
    name: 'Detections JSON',
    type: 'write',
    inputType: 'textarea',
    required: true,
    tooltip: 'Array of {label,x,y,width,height}',
  },
  {
    id: 'attributes',
    name: 'Attributes JSON',
    type: 'write',
    inputType: 'textarea',
    tooltip: 'Optional metadata per detection',
  },
];

const nerColumns: ColumnConfig[] = [
  { id: 'text', name: 'Source Text', type: 'read' },
  {
    id: 'entities',
    name: 'Entities (JSON)',
    type: 'write',
    inputType: 'textarea',
    required: true,
    tooltip: 'Use [{label,start,end,value}] format',
  },
  {
    id: 'overall_quality',
    name: 'Overall Quality (1-5)',
    type: 'write',
    inputType: 'rating',
    validation: { min: 1, max: 5 },
  },
];

const translationColumns: ColumnConfig[] = [
  { id: 'source_text', name: 'Source Text', type: 'read' },
  { id: 'reference_text', name: 'Reference Translation', type: 'read' },
  {
    id: 'worker_translation',
    name: 'Worker Translation',
    type: 'write',
    inputType: 'textarea',
    required: true,
  },
  {
    id: 'fluency_score',
    name: 'Fluency Score',
    type: 'write',
    inputType: 'radio',
    options: ['excellent', 'good', 'fair', 'poor'],
    required: true,
  },
  {
    id: 'adequacy_score',
    name: 'Adequacy Score',
    type: 'write',
    inputType: 'radio',
    options: ['excellent', 'good', 'fair', 'poor'],
    required: true,
  },
];

const chatbotColumns: ColumnConfig[] = [
  { id: 'conversation', name: 'Conversation Transcript', type: 'read' },
  { id: 'model_response', name: 'Model Response', type: 'read' },
  {
    id: 'hallucination_rating',
    name: 'Hallucination Rating',
    type: 'write',
    inputType: 'radio',
    options: ['none', 'minor', 'major'],
    required: true,
  },
  {
    id: 'helpfulness_score',
    name: 'Helpfulness Score (1-5)',
    type: 'write',
    inputType: 'rating',
    validation: { min: 1, max: 5 },
    required: true,
  },
  {
    id: 'feedback',
    name: 'Feedback Notes',
    type: 'write',
    inputType: 'textarea',
  },
];

export const MODALITY_TEMPLATES: Record<
  'imageClassification' | 'objectDetection' | 'namedEntityRecognition' | 'machineTranslationEvaluation' | 'chatbotConversationRating',
  ModalityTemplateDefinition
> = {
  imageClassification: {
    id: 'imageClassification',
    label: 'Image Classification',
    description: 'Single-label classification with optional confidence + notes.',
    modality: 'image',
    features: ['Dropdown class labels', 'Confidence slider', 'Rich reviewer notes'],
    modalityConfig: {
      image: {
        fileFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxResolution: '2048x2048',
        annotationTools: ['bounding-box'],
      },
    } as ModalityConfig,
    columns: imageClassificationColumns,
  },
  objectDetection: {
    id: 'objectDetection',
    label: 'Object Detection',
    description: 'Bounding boxes + attributes via JSON schema.',
    modality: 'image',
    features: ['Structured detections array', 'Optional attributes per detection'],
    modalityConfig: {
      image: {
        fileFormats: ['jpg', 'png'],
        maxResolution: '4096x4096',
        annotationTools: ['bounding-box', 'polygon'],
      },
    } as ModalityConfig,
    columns: objectDetectionColumns,
  },
  namedEntityRecognition: {
    id: 'namedEntityRecognition',
    label: 'Named Entity Recognition',
    description: 'Token span tagging with JSON entity export.',
    modality: 'text',
    features: ['Entity JSON schema', 'Quality rating'],
    modalityConfig: {
      text: {
        maxLength: 2000,
        minLength: 20,
        allowMarkdown: false,
      },
    } as ModalityConfig,
    columns: nerColumns,
  },
  machineTranslationEvaluation: {
    id: 'machineTranslationEvaluation',
    label: 'Machine Translation Evaluation',
    description: 'Compare worker translation vs reference and rate fluency/adequacy.',
    modality: 'text',
    features: ['Dual rating scales', 'Worker translation textarea'],
    modalityConfig: {
      text: {
        maxLength: 1500,
        minLength: 10,
        allowMarkdown: false,
      },
    } as ModalityConfig,
    columns: translationColumns,
  },
  chatbotConversationRating: {
    id: 'chatbotConversationRating',
    label: 'Chatbot Conversation Rating',
    description: 'Score hallucinations + helpfulness for conversational AI outputs.',
    modality: 'multimodal',
    features: ['Hallucination severity', 'Helpfulness score', 'Feedback notes'],
    modalityConfig: {
      multimodal: {
        channels: ['text'],
        supportsFileUpload: false,
      },
    } as ModalityConfig,
    columns: chatbotColumns,
  },
};
