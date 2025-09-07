// src/app/(app)/assets/AssetsView.tsx
"use client";

import { useState } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Account, AssetSummary } from '@/types';
import { Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import AccountModal from '@/components/modals/AccountModal';
import { toast } from 'sonner';
import * as accountService from '@/lib/accountService';
import { supabase } from '@/lib/supabase';
import TableSkeleton from '@/components/skeletons/TableSkeleton';

const AssetCard = ({ asset, onNavigate }: { asset: AssetSummary, onNavigate: (asset: AssetSummary) => void }) => {
    return (
        <Card className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate(asset)}>
            <CardHeader>
                <CardTitle className="flex justify-between items-start">
                    <span className="text-lg font-bold">{asset.name}</span>
                    <span className={cn("text-xl font-semibold", asset.unrealized_pnl >= 0 ? "text-primary" : "text-destructive")}>
                        {formatCurrency(asset.current_value)}
                    </span>
                </CardTitle>
                <CardDescription>{asset.total_quantity} {asset.unit}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg. Cost Basis</span>
                    <span className="font-medium">{formatCurrency(asset.average_cost_basis)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="font-medium">{formatCurrency(asset.total_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unrealized P&L</span>
                    <span className={cn("font-medium", asset.unrealized_pnl >= 0 ? "text-primary" : "text-destructive")}>
                        {asset.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(asset.unrealized_pnl)} ({asset.unrealized_pnl_percent.toFixed(2)}%)
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};

export default function AssetsView() {
    const { assets, isLoading: isAppDataLoading, householdId, user, refetchData, accounts } = useAppData();
    const router = useRouter();
    
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
    
    const handleOpenAccountModal = (asset?: AssetSummary) => {
        if (asset) {
            const fullAccountData = accounts.find(acc => acc.id === asset.account_id);
            setEditingAccount(fullAccountData || { id: asset.account_id, name: asset.name, type: 'asset' });
        } else {
            setEditingAccount({ type: 'asset' });
        }
        setIsAccountModalOpen(true);
    };

    const handleSaveAccount = (payload: Partial<Account> & { initial_quantity?: number; total_cost?: number }) => {
        if (!user || !householdId) {
          toast.error('User session not found.');
          return;
        }
    
        const isNewAsset = payload.type === 'asset' && !payload.id;
    
        const saveAction = async () => {
          if (isNewAsset) {
            const { error } = await supabase.rpc('create_asset_with_initial_balance', {
              p_household_id: householdId,
              p_user_id: user.id,
              p_asset_name: payload.name,
              p_asset_class: payload.asset_class,
              p_unit: payload.unit,
              p_initial_quantity: payload.initial_quantity || 0,
              p_total_cost: payload.total_cost || 0
            });
            if (error) throw new Error(error.message);
          } else {
            const accountData: Partial<Account> = { ...payload, household_id: householdId, user_id: user.id };
            await accountService.saveAccount(accountData);
          }
        };
        
        toast.promise(saveAction(), {
          loading: 'Menyimpan...',
          success: () => {
            refetchData();
            setIsAccountModalOpen(false);
            setEditingAccount(null);
            return isNewAsset ? 'Aset berhasil dibuat!' : 'Akun berhasil disimpan!';
          },
          error: (err: Error) => `Gagal menyimpan: ${err.message}`,
        });
      };
    
    const handleNavigateToDetail = (asset: AssetSummary) => {
        router.push(`/assets/${asset.account_id}`);
    };

    if (isAppDataLoading) {
        return <div className="p-6"><TableSkeleton /></div>;
    }
    
    return (
        <>
            <div className="p-4 md:p-6">
                <div className="sticky top-0 z-10 bg-background/75 backdrop-blur-sm p-4 md:p-6 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h1 className="text-2xl font-bold">Manage Assets</h1>
                      <p className="text-sm text-muted-foreground mt-1">Kelola investasi dan aset Anda</p>
                    </div>
                    <Button onClick={() => handleOpenAccountModal()} className="flex items-center gap-2">
                        <Plus size={20} /> Add New Asset
                    </Button>
                </div>
                
                {assets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assets.map(asset => (
                            <AssetCard 
                                key={asset.account_id} 
                                asset={asset} 
                                onNavigate={handleNavigateToDetail}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-xl font-semibold text-foreground">No Assets Yet</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Tambahkan saham, emas, atau investasi lainnya untuk mulai melacak.
                        </p>
                    </div>
                )}
            </div>

            <AccountModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                onSave={handleSaveAccount}
                account={editingAccount}
            />
        </>
    );
}
