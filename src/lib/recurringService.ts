// src/lib/recurringService.ts

import { supabase } from './supabase';
import { RecurringTemplate, RecurringInstance, FrequencyType } from '@/types';

export interface CreateRecurringTemplateData {
  template_name: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  category_id: number | null;
  account_id: string;
  to_account_id: string | null;
  note: string | null;
  frequency: FrequencyType;
  interval_value: number;
  start_date: string;
  end_date: string | null;
}

export interface UpdateRecurringTemplateData extends CreateRecurringTemplateData {
  template_id: number;
}

/**
 * Get all recurring templates for current user's household
 */
export async function getRecurringTemplates(isActive?: boolean): Promise<RecurringTemplate[]> {
  try {
    const { data, error } = await supabase.rpc('get_recurring_templates', {
      p_is_active: isActive ?? null
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      throw new Error(`Database error: ${error.message || 'Unknown error'}`);
    }

    // Map template_id to id if needed and ensure proper field mapping
    const mappedData = (data || []).map((template: { template_id: number, transaction_type: 'expense' | 'income' | 'transfer' } & Omit<RecurringTemplate, 'id' | 'type'>) => ({
      ...template,
      id: template.template_id, // Ensure id field exists
      type: template.transaction_type, // Map transaction_type to type
    }));

    return mappedData;
  } catch (error) {
    console.error('Error in getRecurringTemplates:', error);
    throw error;
  }
}

/**
 * Create a new recurring template
 */
export async function createRecurringTemplate(templateData: CreateRecurringTemplateData): Promise<number> {
  try {
    console.log('Creating recurring template with data:', templateData);
    
    const rpcParams = {
      p_template_id: null,
      p_template_name: templateData.template_name,
      p_type: templateData.type,
      p_amount: templateData.amount,
      p_category_id: templateData.category_id,
      p_account_id: templateData.account_id,
      p_to_account_id: templateData.to_account_id,
      p_note: templateData.note,
      p_frequency: templateData.frequency,
      p_interval_value: templateData.interval_value,
      p_start_date: templateData.start_date,
      p_end_date: templateData.end_date
    };
    
    console.log('RPC parameters:', rpcParams);
    
    const { data, error } = await supabase.rpc('upsert_recurring_template', rpcParams);
    
    console.log('RPC response:', { data, error });

    if (error) {
      console.error('Supabase RPC error:', error);
      throw new Error(`Database error: ${error.message || JSON.stringify(error)}`);
    }

    return data;
  } catch (error) {
    console.error('Error in createRecurringTemplate:', error);
    throw error;
  }
}

/**
 * Update an existing recurring template
 */
export async function updateRecurringTemplate(templateData: UpdateRecurringTemplateData): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('upsert_recurring_template', {
      p_template_id: templateData.template_id,
      p_template_name: templateData.template_name,
      p_type: templateData.type,
      p_amount: templateData.amount,
      p_category_id: templateData.category_id,
      p_account_id: templateData.account_id,
      p_to_account_id: templateData.to_account_id,
      p_note: templateData.note,
      p_frequency: templateData.frequency,
      p_interval_value: templateData.interval_value,
      p_start_date: templateData.start_date,
      p_end_date: templateData.end_date
    });

    if (error) {
      console.error('Error updating recurring template:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateRecurringTemplate:', error);
    throw error;
  }
}

/**
 * Delete a recurring template permanently from database
 */
export async function deleteRecurringTemplate(templateId: number): Promise<void> {
  try {
    console.log('Deleting template with ID:', templateId, 'Type:', typeof templateId);
    
    if (!templateId || isNaN(Number(templateId))) {
      throw new Error(`Invalid template ID: ${templateId}`);
    }

    // Hard delete from database
    const { error } = await supabase
      .from('recurring_templates')
      .delete()
      .eq('id', Number(templateId));

    if (error) {
      console.error('Error deleting recurring template:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteRecurringTemplate:', error);
    throw error;
  }
}

/**
 * Toggle active status of a recurring template (pause/resume)
 */
export async function toggleRecurringTemplate(templateId: number, isActive: boolean): Promise<void> {
  try {
    console.log('Toggling template with ID:', templateId, 'Type:', typeof templateId);
    
    if (!templateId || isNaN(Number(templateId))) {
      throw new Error(`Invalid template ID: ${templateId}`);
    }

    const { error } = await supabase
      .from('recurring_templates')
      .update({ is_active: isActive })
      .eq('id', Number(templateId));

    if (error) {
      console.error('Error toggling recurring template:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in toggleRecurringTemplate:', error);
    throw error;
  }
}

/**
 * Generate recurring instances for a household
 */
export async function generateRecurringInstances(householdId: string, endDate: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('generate_recurring_instances', {
      p_household_id: householdId,
      p_end_date: endDate
    });

    if (error) {
      console.error('Error generating recurring instances:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('Error in generateRecurringInstances:', error);
    throw error;
  }
}

/**
 * Get recurring instances for a date range
 */
export async function getRecurringInstances(startDate: string, endDate: string, status?: string): Promise<RecurringInstance[]> {
  try {
    const { data, error } = await supabase.rpc('get_recurring_instances', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_status: status || null
    });

    if (error) {
      console.error('Error fetching recurring instances:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecurringInstances:', error);
    throw error;
  }
}

/**
 * Confirm a recurring instance and create actual transaction
 */
export async function confirmRecurringInstance(
  instanceId: number,
  confirmedAmount?: number,
  confirmedCategory?: number | null,
  confirmedAccountId?: string,
  confirmedToAccountId?: string | null,
  confirmedNote?: string | null
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('confirm_recurring_instance', {
      p_instance_id: instanceId,
      p_confirmed_amount: confirmedAmount || null,
      p_confirmed_category: confirmedCategory || null,
      p_confirmed_account_id: confirmedAccountId || null,
      p_confirmed_to_account_id: confirmedToAccountId || null,
      p_confirmed_note: confirmedNote || null
    });

    if (error) {
      console.error('Error confirming recurring instance:', error);
      throw error;
    }

    return data; // Returns transaction ID
  } catch (error) {
    console.error('Error in confirmRecurringInstance:', error);
    throw error;
  }
}