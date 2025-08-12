// src/lib/budgetPlanService.ts

import { supabase } from '@/lib/supabase';
import { Budget } from '@/types';

export const saveBudgetPlanWithCategories = async (
    id: number | null,
    name: string,
    household_id: string,
    categoryIds: number[]
) => {
    let v_plan_id = id;

    if (id === null) {
        const { data: newBudget, error } = await supabase
            .from('budgets')
            .insert({ name, household_id })
            .select('id')
            .single();
        if (error) throw error;
        v_plan_id = newBudget.id;
    } else {
        const { error } = await supabase
            .from('budgets')
            .update({ name })
            .eq('id', id);
        if (error) throw error;
    }

    const { error: deleteError } = await supabase
        .from('budget_categories')
        .delete()
        .eq('budget_id', v_plan_id);
    if (deleteError) throw deleteError;

    if (categoryIds.length > 0) {
        const links = categoryIds.map(catId => ({ budget_id: v_plan_id, category_id: catId }));
        const { error: insertError } = await supabase.from('budget_categories').insert(links);
        if (insertError) throw insertError;
    }

    return v_plan_id;
}


export const deleteBudgetPlan = async (id: number) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) {
        console.error('Error deleting budget plan:', error);
        throw error;
    }
};

export const getBudgetPlans = async (household_id: string): Promise<Budget[]> => {
    const { data, error } = await supabase
        .from('budgets')
        .select(`id, name, household_id, categories ( * )`)
        .eq('household_id', household_id);
    
    if (error) {
        console.error('Error fetching budget plans:', error);
        throw error;
    }
    return data || [];
}