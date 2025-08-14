// src/components/modals/GoalCompletionModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Calendar, BarChart, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Account } from '@/types';

interface GoalCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetNewGoal: () => void;
  goal: Account | null;
}

type GoalStats = {
  total_collected: number;
  saving_period_in_months: number;
  average_monthly_saving: number;
  largest_contribution: number;
}

const StatCard = ({ icon, title, value }: { icon: React.ReactNode, title: string, value: string }) => (
    <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-primary">{icon}</div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-lg font-semibold text-gray-800">{value}</p>
        </div>
    </div>
);

export const GoalCompletionModal = ({ isOpen, onClose, onSetNewGoal, goal }: GoalCompletionModalProps) => {
    const [stats, setStats] = useState<GoalStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && goal) {
            const fetchStats = async () => {
                setIsLoading(true);
                const { data, error } = await supabase.rpc('get_goal_achievement_stats', { p_account_id: goal.id });
                if (error) {
                    console.error("Error fetching goal stats:", error);
                } else if (data && data.length > 0) {
                    setStats(data[0]);
                }
                setIsLoading(false);
            };
            fetchStats();
        }
    }, [isOpen, goal]);
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex flex-col items-center text-center">
                        <Sparkles className="w-12 h-12 text-yellow-400 mb-2" />
                        <DialogTitle className="text-2xl font-bold">Luar Biasa!</DialogTitle>
                        <DialogDescription>
                           Anda berhasil mencapai tujuan: <span className="font-semibold text-primary">{goal?.name}</span>
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-3">
                    <p className="text-sm text-center font-semibold text-gray-700">Berikut adalah rekap perjalanan Anda:</p>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : stats ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <StatCard icon={<Award size={24} />} title="Total Dana Terkumpul" value={formatCurrency(stats.total_collected)} />
                            <StatCard icon={<Calendar size={24} />} title="Periode Menabung" value={`${stats.saving_period_in_months} Bulan`} />
                            <StatCard icon={<BarChart size={24} />} title="Rata-rata / Bulan" value={formatCurrency(stats.average_monthly_saving)} />
                            <StatCard icon={<TrendingUp size={24} />} title="Kontribusi Terbesar" value={formatCurrency(stats.largest_contribution)} />
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground">Tidak dapat memuat statistik.</p>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>Tutup</Button>
                    <Button type="button" onClick={onSetNewGoal}>
                        <Sparkles className="mr-2 h-4 w-4" /> Apa Mimpimu Selanjutnya?
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};