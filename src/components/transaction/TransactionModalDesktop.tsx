"use client";

import { useTransactionModal } from '@/hooks/useTransactionModal';
import { TransactionForm } from './TransactionForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Define the props for the desktop modal
// It receives all the state and handlers from the useTransactionModal hook
type TransactionModalDesktopProps = ReturnType<typeof useTransactionModal>;

export function TransactionModalDesktop(props: TransactionModalDesktopProps) {
    const { isOpen, handleClose, editId, isSaving, formState, formSetters, contextData } = props;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose} modal={false}>
            <DialogContent variant="side-panel" className="flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>{editId ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-grow pr-6 -mr-6">
                    <TransactionForm 
                        {...formState} 
                        {...formSetters} 
                        {...contextData} 
                        editId={editId} 
                        isSaving={isSaving} 
                        onClose={handleClose} 
                        onSave={props.handleSave} 
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
