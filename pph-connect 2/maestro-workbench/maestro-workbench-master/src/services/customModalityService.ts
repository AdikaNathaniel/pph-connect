import { supabase } from '@/integrations/supabase/client';
import type { ColumnConfig, ModalityConfig } from '@/types';

export interface CustomModalityRecord {
  id: string;
  name: string;
  modality_key: string;
  description?: string | null;
  modality_config: ModalityConfig;
  column_config: ColumnConfig[];
  annotation_tools: string[];
  validation_rules: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomModalityInput {
  name: string;
  modalityKey: string;
  description?: string;
  modalityConfig: ModalityConfig;
  columnConfig: ColumnConfig[];
  annotationTools: string[];
  validationRules: Record<string, unknown>;
}

const mapRow = (row: any): CustomModalityRecord => ({
  id: row.id,
  name: row.name,
  modality_key: row.modality_key,
  description: row.description,
  modality_config: (row.modality_config ?? {}) as ModalityConfig,
  column_config: (row.column_config ?? []) as ColumnConfig[],
  annotation_tools: (row.annotation_tools ?? []) as string[],
  validation_rules: (row.validation_rules ?? {}) as Record<string, unknown>,
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export async function listCustomModalities(): Promise<CustomModalityRecord[]> {
  const { data, error } = await supabase
    .from('custom_modalities')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('customModalityService: failed to load modalities', error);
    return [];
  }

  return (data ?? []).map(mapRow);
}

export async function createCustomModality(input: CustomModalityInput): Promise<CustomModalityRecord | null> {
  const payload = {
    name: input.name,
    modality_key: input.modalityKey,
    description: input.description ?? null,
    modality_config: input.modalityConfig,
    column_config: input.columnConfig,
    annotation_tools: input.annotationTools,
    validation_rules: input.validationRules,
  };

  const { data, error } = await supabase
    .from('custom_modalities')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('customModalityService: failed to create modality', error);
    throw error;
  }

  return mapRow(data);
}

export async function updateCustomModality(id: string, input: Partial<CustomModalityInput>) {
  const payload: Record<string, unknown> = {};
  if (input.name != null) payload.name = input.name;
  if (input.modalityKey != null) payload.modality_key = input.modalityKey;
  if (input.description !== undefined) payload.description = input.description;
  if (input.modalityConfig) payload.modality_config = input.modalityConfig;
  if (input.columnConfig) payload.column_config = input.columnConfig;
  if (input.annotationTools) payload.annotation_tools = input.annotationTools;
  if (input.validationRules) payload.validation_rules = input.validationRules;

  const { error } = await supabase
    .from('custom_modalities')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('customModalityService: failed to update modality', error);
    throw error;
  }
}

export async function deleteCustomModality(id: string) {
  const { error } = await supabase.from('custom_modalities').delete().eq('id', id);
  if (error) {
    console.error('customModalityService: failed to delete modality', error);
    throw error;
  }
}
