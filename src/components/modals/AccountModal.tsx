// src/components/modals/AccountModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Account } from '@/types';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';


interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Partial<Account>) => void;
  account: Partial<Account> | null;
}

export default function AccountModal({ isOpen, onClose, onSave, account }: AccountModalProps) {
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [type, setType] = useState<'generic' | 'goal'>('generic');
  const [targetAmount, setTargetAmount] = useState('');
  const [goalReason, setGoalReason] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (account) {
            setName(account.name || '');
            setInitialBalance(String(account.initial_balance || 0));
            setType(account.type || 'generic');
            setTargetAmount(String(account.target_amount || ''));
            setGoalReason(account.goal_reason || '');
        } else {
            setName('');
            setInitialBalance('0');
            setType('generic');
            setTargetAmount('');
            setGoalReason('');
        }
    }
  }, [account, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
        toast.error('Nama akun wajib diisi.');
        return;
    }

    const payload: Partial<Account> = {
        id: account?.id,
        name,
        initial_balance: Number(initialBalance) || 0,
        type,
        target_amount: type === 'goal' ? (Number(targetAmount) || null) : null,
        goal_reason: type === 'goal' ? goalReason : null,
    };
    onSave(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>{account?.id ? 'Edit Akun' : 'Buat Akun Baru'}</DialogTitle>
                <DialogDescription>
                    Pilih tipe &apos;Tujuan&apos; untuk membuat amplop virtual untuk menabung.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                <div>
                    <Label className="mb-2 block">Tipe Akun</Label>
                    <RadioGroup value={type} onValueChange={(val) => setType(val as 'generic' | 'goal')} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="generic" id="r1" />
                            <Label htmlFor="r1">Akun Umum (Rekening, Dompet)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="goal" id="r2" />
                            <Label htmlFor="r2">Tujuan / Amplop (Goal)</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="name-acc">Nama Akun / Tujuan</Label>
                    <Input id="name-acc" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Bank BCA, Dana Darurat" required />
                </div>
                
                <div className="grid gap-2">
                    <Label htmlFor="initial_balance">Saldo Awal</Label>
                    <Input id="initial_balance" type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} required />
                    <p className="text-xs text-muted-foreground">Isi dengan saldo Anda saat ini di akun tersebut.</p>
                </div>

                {type === 'goal' && (
                    <div className="grid gap-4 border-t pt-4">
                         <div className="grid gap-2">
                            <Label htmlFor="target-amount">Target Dana (Opsional)</Label>
                            <Input id="target-amount" type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="Contoh: 50000000" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="goal-reason">Apa alasanmu menabung untuk ini?</Label>
                            <Textarea id="goal-reason" value={goalReason} onChange={(e) => setGoalReason(e.target.value)} placeholder="Contoh: Untuk membeli rumah pertama, agar lebih semangat!" />
                        </div>
                    </div>
                )}
                
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
};