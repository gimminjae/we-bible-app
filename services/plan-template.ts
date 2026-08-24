import { createSupabaseClient } from '@/lib/supabase-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { AppLanguage } from '@/utils/app-settings-storage';

export type BiblePlanTemplate = {
  id: string;
  languageCode: AppLanguage;
  templateName: string;
  templateExplanation: string;
  selectedBookCodes: string[];
};

type BiblePlanTemplateRow = {
  id: number;
  language_code: AppLanguage | null;
  template_name: string | null;
  template_explanation: string | null;
  selected_book_codes: unknown;
};

function normalizeSelectedBookCodes(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeTemplate(row: BiblePlanTemplateRow): BiblePlanTemplate {
  return {
    id: String(row.id),
    languageCode: row.language_code === 'en' ? 'en' : 'ko',
    templateName: row.template_name?.trim() ?? '',
    templateExplanation: row.template_explanation?.trim() ?? '',
    selectedBookCodes: normalizeSelectedBookCodes(row.selected_book_codes),
  };
}

export async function fetchBiblePlanTemplates(languageCode: AppLanguage): Promise<BiblePlanTemplate[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('bible_plan_template')
    .select('id, language_code, template_name, template_explanation, selected_book_codes')
    .eq('language_code', languageCode)
    .order('id', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as BiblePlanTemplateRow[]).map(normalizeTemplate);
}

export async function fetchBiblePlanTemplateById(templateId: string): Promise<BiblePlanTemplate | null> {
  if (!templateId || !isSupabaseConfigured()) return null;

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('bible_plan_template')
    .select('id, language_code, template_name, template_explanation, selected_book_codes')
    .eq('id', Number(templateId))
    .maybeSingle();

  if (error) throw error;

  const row = (data ?? null) as BiblePlanTemplateRow | null;
  return row ? normalizeTemplate(row) : null;
}
