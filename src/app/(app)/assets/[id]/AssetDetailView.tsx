// src/app/(app)/assets/[id]/AssetDetailView.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/contexts/AppDataContext';
import { Account, AssetTransaction } from '@/types';
import * as assetService from '@/lib/assetService';
import * as accountService from '@/lib/accountService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import AssetTransactionModal from '@/components/modals/AssetTransactionModal';
import AccountModal from '@/components/modals/AccountModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';

interface AssetDetailViewProps {
  initialAssetAccount: Account;
  initialTransactions: AssetTransaction[];
}

export default function AssetDetailView({ initialAssetAccount, initialTransactions }: AssetDetailViewProps) {
  const router = useRouter();
  const { assets, accounts, householdId, user, refetchData, dataVersion } = useAppData();
  
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Partial<AssetTransaction> | null>(null);
  
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);

  const assetSummary = useMemo(() => {
    return assets.find(a => a.account_id === initialAssetAccount.id);
  }, [assets, initialAssetAccount.id]);

  useEffect(() => {
    if (householdId) {
      assetService.getAssetTransactions(initialAssetAccount.id).then(setTransactions);
    }
  }, [dataVersion, initialAssetAccount.id, householdId]);

  const handleOpenEditModal = () => {
    setEditingAccount(initialAssetAccount);
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (payload: Partial<Account>) => {
    if (!householdId || !user) return toast.error("User or household not found.");
    const promise = accountService.saveAccount({ ...payload, household_id: householdId, user_id: user.id })
      .then(() => {
          refetchData();
          setIsAccountModalOpen(false);
      });
    toast.promise(promise, {
      loading: 'Saving changes...',
      success: 'Asset info updated!',
      error: (err: Error) => `Failed to save: ${err.message}`,
    });
  };

  const handleDeleteAsset = async () => {
    if (!assetSummary) return;
    if (confirm(`Anda yakin ingin menghapus aset "${assetSummary.name}"? Semua riwayat transaksinya juga akan terhapus secara permanen.`)) {
      const toastId = toast.loading('Menghapus aset...');
      try {
        await accountService.deleteAccount(assetSummary.account_id);
        refetchData();
        toast.success('Aset berhasil dihapus!', { id: toastId });
        router.push('/assets');
      } catch (err) {
        toast.error(`Gagal menghapus: ${(err as Error).message}`, { id: toastId });
      }
    }
  };

  const handleOpenTxModal = (tx?: AssetTransaction) => {
    setEditingTx(tx || null);
    setIsTxModalOpen(true);
  };

  const handleSaveTx = async (payload: Partial<AssetTransaction> & { from_account_id?: string; to_account_id?: string }) => {
    if (!householdId || !user || !assetSummary) return toast.error("Invalid context.");
    const totalCost = (payload.quantity || 0) * (payload.price_per_unit || 0);
    if (totalCost <= 0) return toast.error("Total cost must be greater than zero.");

    const { data: financialTx, error: financialTxError } = await supabase.from('transactions').insert({
        household_id: householdId, user_id: user.id, type: 'transfer', amount: totalCost,
        account_id: payload.transaction_type === 'buy' ? payload.from_account_id : assetSummary.account_id,
        to_account_id: payload.transaction_type === 'buy' ? assetSummary.account_id : payload.to_account_id,
        date: payload.transaction_date,
        note: `${payload.transaction_type === 'buy' ? 'Buy' : 'Sell'} ${payload.quantity} ${assetSummary.unit || 'units'} of ${assetSummary.name}`
    }).select('id').single();

    if (financialTxError) {
        toast.error(`Failed to create financial transaction: ${financialTxError.message}`);
        return;
    }

    const assetTxPayload = { 
        id: payload.id, transaction_type: payload.transaction_type, quantity: payload.quantity,
        price_per_unit: payload.price_per_unit, transaction_date: payload.transaction_date,
        asset_account_id: assetSummary.account_id, household_id: householdId, related_transaction_id: financialTx.id
    };
    
    const promise = assetService.saveAssetTransaction(assetTxPayload).then(() => {
        refetchData();
        setIsTxModalOpen(false);
    });

    toast.promise(promise, {
        loading: 'Saving transaction...', success: 'Transaction saved!',
        error: (err: Error) => `Failed to save: ${err.message}`,
    });
  };

  const handleDeleteTx = (tx: AssetTransaction) => {
    if (confirm(`Are you sure you want to delete this ${tx.transaction_type} transaction?`)) {
        const promise = assetService.deleteAssetTransaction(tx.id, tx.related_transaction_id);
        toast.promise(promise, {
            loading: 'Deleting transaction...',
            success: () => {
                refetchData();
                return 'Transaction deleted successfully!';
            },
            error: (err: Error) => `Deletion failed: ${err.message}`,
        });
    }
  };

  if (!assetSummary) {
      return <LoadingSpinner text="Loading asset details..." />;
  }
  
  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/assets')}><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h1 className="text-3xl font-bold">{assetSummary.name}</h1>
                    <p className="text-muted-foreground">Riwayat Transaksi & Detail Kinerja</p>
                </div>
            </div>
            <div className="flex gap-2 self-start md:self-center">
                <Button variant="outline" onClick={handleOpenEditModal}><Edit className="mr-2 h-4 w-4"/> Edit Info</Button>
                <Button variant="destructive" onClick={handleDeleteAsset}><Trash2 className="mr-2 h-4 w-4"/> Hapus Aset</Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Nilai Saat Ini</CardTitle></CardHeader>
                <CardContent><p className={cn("text-2xl font-bold", assetSummary.unrealized_pnl >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(assetSummary.current_value)}</p></CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Kuantitas</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{assetSummary.total_quantity} <span className="text-lg text-muted-foreground">{assetSummary.unit}</span></p></CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Modal</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatCurrency(assetSummary.total_cost)}</p></CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Keuntungan (Unrealized)</CardTitle></CardHeader>
                <CardContent><p className={cn("text-2xl font-bold", assetSummary.unrealized_pnl >= 0 ? "text-primary" : "text-destructive")}>{assetSummary.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(assetSummary.unrealized_pnl)}</p><p className="text-xs text-muted-foreground">{assetSummary.unrealized_pnl_percent.toFixed(2)}%</p></CardContent>
            </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Riwayat Transaksi</CardTitle>
              <Button onClick={() => handleOpenTxModal()}><Plus className="mr-2 h-4 w-4"/> Tambah Transaksi</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Kuantitas</TableHead>
                  <TableHead className="text-right">Harga / Unit</TableHead>
                  <TableHead className="text-right">Total Nilai</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? transactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.transaction_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <span className={cn("capitalize px-2 py-1 text-xs font-semibold rounded-full", tx.transaction_type === 'buy' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>
                        {tx.transaction_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{tx.quantity} {assetSummary.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(tx.price_per_unit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(tx.quantity * tx.price_per_unit)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTx(tx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      Belum ada riwayat transaksi untuk aset ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {assetSummary && (
        <AssetTransactionModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          onSave={handleSaveTx}
          transaction={editingTx}
          assetName={assetSummary.name}
          accounts={accounts.filter(acc => acc.type === 'generic' && acc.name !== 'Modal Awal Aset')}
        />
      )}

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={handleSaveAccount}
        account={editingAccount}
      />
    </>
  );
}
