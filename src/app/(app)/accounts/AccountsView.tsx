// src/app/(app)/accounts/AccountsView.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Account } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Edit, Trash2, Target, Wallet, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppData } from '@/contexts/AppDataContext';
import * as accountService from '@/lib/accountService';
import AccountModal from '@/components/modals/AccountModal';
import ReassignAccountModal from '@/components/modals/ReassignAccountModal';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { GoalCompletionModal } from '@/components/modals/GoalCompletionModal'; 

const GoalProjection = ({ accountId }: { accountId: string }) => {
    const [projection, setProjection] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjection = async () => {
            setIsLoading(true);
            const { data } = await supabase.rpc('get_goal_projection', { p_account_id: accountId });
            if (data && data.length > 0 && data[0].estimated_completion_date) {
                const date = parseISO(data[0].estimated_completion_date);
                setProjection(format(date, 'MMMM yyyy'));
            } else {
                setProjection(null);
            }
            setIsLoading(false);
        };
        fetchProjection();
    }, [accountId]);

    if (isLoading) {
        return <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mt-1"></div>;
    }

    if (projection) {
        return (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3"/>
                Estimasi tercapai: <span className="font-semibold">{projection}</span>
            </p>
        );
    }
    
    return null; 
};

const GoalAccountCard = ({ account, onEdit, onDelete, onCelebrate }: { account: Account, onEdit: (acc: Account) => void, onDelete: (acc: Account) => void, onCelebrate: (acc: Account) => void }) => {
    const currentBalance = account.balance || 0;
    const targetAmount = account.target_amount || 0;
    const isAchieved = targetAmount > 0 && currentBalance >= targetAmount;

    const progress = targetAmount > 0 
        ? Math.min((currentBalance / targetAmount) * 100, 100)
        : 0;

    return (
        <Card className={cn("flex flex-col", isAchieved && "bg-green-50 border-green-200")}>
            <CardHeader>
                <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg font-bold">{account.name}</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Target className="w-5 h-5 text-primary" />
                    </div>
                </div>
                <CardDescription>{account.goal_reason || 'Terus semangat menabung!'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className={cn("text-2xl font-bold", isAchieved ? "text-green-600" : "text-primary")}>
                    {formatCurrency(currentBalance)}
                </div>
                {account.target_amount && account.target_amount > 0 && (
                    <div>
                        <Progress value={progress} />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{Math.round(progress)}%</span>
                            <span>Target: {formatCurrency(targetAmount)}</span>
                        </div>
                        {!isAchieved && <GoalProjection accountId={account.id} />}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center mt-auto pt-4 border-t">
                 <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(account)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(account)}>Edit</Button>
                </div>
                {isAchieved && (
                    <Button type="button" size="sm" onClick={() => onCelebrate(account)} className="bg-green-600 hover:bg-green-700">
                        Rayakan!
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

export default function AccountsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { accounts, isLoading: isAppDataLoading, user, householdId, refetchData } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const [isCelebrationModalOpen, setIsCelebrationModalOpen] = useState(false);
  const [goalToCelebrate, setGoalToCelebrate] = useState<Account | null>(null);

  const { goalAccounts, genericAccounts } = useMemo(() => {
    const goals: Account[] = [];
    const generics: Account[] = [];
    accounts.forEach(acc => {
      // --- PERBAIKAN: Menyembunyikan akun virtual ---
      if (acc.name === 'Modal Awal Aset') {
        return; // Lewati akun ini
      }
      if (acc.type === 'goal') {
        goals.push(acc);
      } else if (acc.type === 'generic') {
        generics.push(acc);
      }
    });
    return { goalAccounts: goals, genericAccounts: generics };
  }, [accounts]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
      router.replace('/accounts', { scroll: false });
    }
  }, [searchParams, router]);
  
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
        setIsModalOpen(false);
        setEditingAccount(null);
        if (isNewAsset) {
          router.push('/assets');
          return 'Aset berhasil dibuat!';
        }
        return 'Akun berhasil disimpan!';
      },
      error: (err: Error) => `Gagal menyimpan: ${err.message}`,
    });
  };

  const handleDeleteAccount = async (account: Account) => {
    if (account.type === 'asset') {
        const { count, error } = await supabase
            .from('asset_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('asset_account_id', account.id);
        if (error) return toast.error(`Error checking asset transactions: ${error.message}`);
        if ((count || 0) > 0) {
            return toast.error("Tidak bisa menghapus aset yang masih memiliki riwayat transaksi beli/jual.");
        }
    }

    const { count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`);

    if (error) return toast.error(`Error checking transactions: ${error.message}`);
    
    if ((count || 0) > 0) {
      setAccountToDelete(account);
      setIsReassignModalOpen(true);
    } else {
      if (confirm(`Anda yakin ingin menghapus akun "${account.name}"?`)) {
        const promise = accountService.deleteAccount(account.id).then(() => refetchData());
        toast.promise(promise, {
          loading: 'Menghapus akun...',
          success: 'Akun berhasil dihapus!',
          error: (err: Error) => `Gagal menghapus: ${err.message}`,
        });
      }
    }
  };

  const handleReassignAndDelete = async (oldAccId: string, newAccId: string) => {
    const promise = accountService.reassignAndDeleteAccount(oldAccId, newAccId)
      .then(() => refetchData());

    toast.promise(promise, {
      loading: 'Memindahkan & menghapus...',
      success: 'Akun berhasil dihapus!',
      error: (err: Error) => err.message,
    });
    
    setIsReassignModalOpen(false);
    setAccountToDelete(null);
  };

  const handleAddNew = () => { setEditingAccount(null); setIsModalOpen(true); };
  const handleEdit = (account: Account) => { setEditingAccount(account); setIsModalOpen(true); };

  const handleCelebrate = (goal: Account) => {
    setGoalToCelebrate(goal);
    setIsCelebrationModalOpen(true);
  };
  
  const handleSetNewGoal = () => {
    setIsCelebrationModalOpen(false);
    handleAddNew();
  };

  return (
    <>
      <div className="p-6">
        <div className="sticky top-0 z-10 bg-gray-50/75 backdrop-blur-sm p-6 -mx-6 -mt-6 mb-6 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-3xl font-bold">Manage Accounts</h1>
            <Button onClick={handleAddNew} disabled={isAppDataLoading} className="flex items-center gap-2">
            <Plus size={20} /> Add New
            </Button>
        </div>
        
        {isAppDataLoading ? (
            <TableSkeleton />
        ) : (
            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Wallet className="w-6 h-6" /> Akun Umum
                    </h2>
                    {genericAccounts.length > 0 ? (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Saat Ini</th>
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {genericAccounts.map((acc) => (
                                    <tr key={acc.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{acc.name}</td>
                                    <td className={cn('px-6 py-4 whitespace-nowrap text-sm font-semibold text-right', (acc.balance ?? 0) < 0 ? 'text-red-600' : 'text-gray-900')}>
                                        {formatCurrency(acc.balance ?? 0)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-4">
                                        <button type="button" onClick={() => handleEdit(acc)} className="text-indigo-600 hover:text-indigo-900"><Edit size={18} /></button>
                                        <button type="button" onClick={() => handleDeleteAccount(acc)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center p-6 bg-white rounded-lg shadow">
                            <p className="text-gray-500">Tidak ada akun umum. Klik &quot;Add New&quot; untuk membuat rekening bank atau dompet digital Anda.</p>
                        </div>
                    )}
                </div>

                {accounts.some(acc => acc.type === 'goal') && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary">
                            <Target className="w-6 h-6" /> Tujuan Finansial Anda
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {goalAccounts.map(acc => (
                                <GoalAccountCard key={acc.id} account={acc} onEdit={handleEdit} onDelete={handleDeleteAccount} onCelebrate={handleCelebrate} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      <AccountModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveAccount} 
        account={editingAccount} 
      />
      <ReassignAccountModal 
        isOpen={isReassignModalOpen} 
        onClose={() => setIsReassignModalOpen(false)} 
        onReassign={handleReassignAndDelete} 
        accountToDelete={accountToDelete} 
        allAccounts={accounts.filter(acc => acc.type !== 'asset')}
      />
      
      <GoalCompletionModal 
        isOpen={isCelebrationModalOpen} 
        onClose={() => setIsCelebrationModalOpen(false)}
        onSetNewGoal={handleSetNewGoal}
        goal={goalToCelebrate}
      />
    </>
  );
}