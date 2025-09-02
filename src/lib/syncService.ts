
import { db } from './db';
import { supabase } from './supabase';
import { Transaction } from '@/types';
import { toast } from 'sonner';

// Fungsi untuk memproses satu item dari antrian
async function processQueueItem(item: { id?: number; type: string; payload: unknown; timestamp: number }): Promise<void> {
  switch (item.type) {
    case 'transaction_add':
      {
        const transactionPayload = item.payload as Transaction;
        const { id: tempId, ...payloadForSupabase } = transactionPayload;

        // Kirim ke Supabase tanpa ID sementara
        const { data: syncedTransaction, error } = await supabase
          .from('transactions')
          .insert(payloadForSupabase)
          .select()
          .single();

        if (error) {
          console.error('Sync failed for transaction_add:', error);
          // Biarkan item di antrian untuk dicoba lagi nanti
          throw new Error(`Sync failed: ${error.message}`);
        }

        // Jika berhasil, perbarui database lokal dengan data yang benar dari server
        await db.transaction('rw', db.transactions, db.syncQueue, async () => {
          // Hapus record dengan ID sementara
          await db.transactions.delete(tempId);
          // Tambahkan record baru dengan ID permanen dari server
          await db.transactions.put(syncedTransaction as Transaction);
          // Hapus tugas dari antrian
          if (item.id) {
            await db.syncQueue.delete(item.id);
          }
        });
      }
      break;

    // TODO: Tambahkan case untuk 'transaction_update' dan 'transaction_delete' di masa depan

    default:
      console.warn(`Unknown sync queue item type: ${item.type}`);
      break;
  }
}

let isProcessing = false;

// Fungsi utama untuk memproses seluruh antrian
export async function processSyncQueue(): Promise<void> {
  if (isProcessing || !navigator.onLine) {
    return;
  }

  isProcessing = true;
  toast.info("Syncing offline changes...");

  try {
    const queueItems = await db.syncQueue.toArray();
    if (queueItems.length === 0) {
      isProcessing = false;
      return;
    }

    for (const item of queueItems) {
      try {
        await processQueueItem(item);
      } catch (error) {
        console.error(`Failed to process queue item ${item.id}:`, error);
        // Lanjutkan ke item berikutnya jika satu item gagal
      }
    }

    toast.success("Offline changes synced successfully!");

  } catch (error) {
    console.error('Error processing sync queue:', error);
    toast.error("An error occurred during sync.");
  } finally {
    isProcessing = false;
  }
}
