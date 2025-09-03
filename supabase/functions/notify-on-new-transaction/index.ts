// supabase/functions/notify-on-new-transaction/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// [PERBAIKAN FINAL] Menggunakan library webpush dari JSR dan API yang sesuai
import * as webpush from "jsr:@negrel/webpush";

console.log("Function script starting... Initializing constants.");

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const supabaseUrl = Deno.env.get('PUBLIC_SUPABASE_URL');
const serviceRoleKey = Deno.env.get('PRIVATE_SUPABASE_SERVICE_ROLE_KEY');

if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !serviceRoleKey) {
  console.error("FATAL: Missing one or more required environment variables.");
  throw new Error('Required environment variables are not set.');
}

// [PERBAIKAN] Import VAPID keys ke dalam library sesuai dokumentasi
webpush.importVapidKeys({
  publicKey: vapidPublicKey,
  privateKey: vapidPrivateKey,
});

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
console.log("Supabase admin client created.");

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

Deno.serve(async (req: Request) => {
  console.log("--- REQUEST RECEIVED ---");

  const bodyText = await req.text();
  if (!bodyText) {
    return new Response(JSON.stringify({ message: "Test invocation with empty body received." }), { status: 200 });
  }

  try {
    const payload = JSON.parse(bodyText);
    console.log("Payload received and parsed.");

    const newTransaction = payload.record;

    if (payload.type !== 'INSERT' || !newTransaction) {
      return new Response(JSON.stringify({ message: "Not an insert event." }), { status: 200 });
    }
    
    const creatorId = newTransaction.user_id;
    const householdId = newTransaction.household_id;

    if (!creatorId || !householdId) {
        return new Response(JSON.stringify({ error: "Missing user_id or household_id." }), { status: 400 });
    }
    console.log(`Transaction from creator: ${creatorId}`);

    const { data: householdMembers, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('household_id', householdId)
      .neq('id', creatorId);

    if (membersError) throw membersError;

    if (!householdMembers || householdMembers.length === 0) {
      return new Response(JSON.stringify({ message: "No other members to notify." }), { status: 200 });
    }

    const memberIds = householdMembers.map(m => m.id);
    console.log(`Found ${memberIds.length} other members to notify.`);

    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription_data')
      .in('user_id', memberIds);

    if (subsError) throw subsError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No active subscriptions found." }), { status: 200 });
    }
    console.log(`Found ${subscriptions.length} subscriptions to send to.`);

    const { data: creatorProfile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', creatorId).single();
    const creatorName = creatorProfile?.full_name || 'Seseorang';
    
    const notificationPayload = JSON.stringify({
      title: `Transaksi Baru: ${formatCurrency(newTransaction.amount)}`,
      body: `${creatorName} baru saja menambahkan pengeluaran untuk "${newTransaction.note || 'sesuatu'}".`,
      icon: '/favicon.ico',
      data: { url: '/transactions' }
    });

    console.log("Preparing to send notifications with JSR library.");

    const sendPromises = subscriptions.map(sub =>
      // [PERBAIKAN] Menggunakan API `pushTextMessage`
      webpush.pushTextMessage(sub.subscription_data, notificationPayload)
    );

    const sendResults = await Promise.allSettled(sendPromises);
    
    console.log("--- NOTIFICATION SEND RESULTS ---");
    sendResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`Successfully sent notification to subscription ${index + 1}.`);
        } else {
            console.error(`Failed to send notification to subscription ${index + 1}:`, result.reason);
        }
    });

    return new Response(JSON.stringify({ message: "Notifications processed." }), { status: 200 });

  } catch (err) {
    console.error("!!! UNHANDLED ERROR IN FUNCTION !!!", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});