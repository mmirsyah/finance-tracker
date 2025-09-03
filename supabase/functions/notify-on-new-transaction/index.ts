// supabase/functions/notify-on-new-transaction/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7?target=deno';

console.log("Function script starting... Initializing constants.");

// [PERBAIKAN] Menggunakan nama environment variable yang diizinkan (tidak diawali SUPABASE_)
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const supabaseUrl = Deno.env.get('PUBLIC_SUPABASE_URL'); // NAMA BARU
const serviceRoleKey = Deno.env.get('PRIVATE_SUPABASE_SERVICE_ROLE_KEY'); // NAMA BARU

// Validasi environment variables
if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !serviceRoleKey) {
  console.error("FATAL: Missing one or more required environment variables (VAPID_*, PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SERVICE_ROLE_KEY).");
  throw new Error('Required environment variables are not set.');
}

console.log("VAPID and Supabase keys are loaded.");

// Konfigurasi web-push
webpush.setVapidDetails(
  'mailto:admin@email.com',
  vapidPublicKey,
  vapidPrivateKey
);
console.log("Web-push configured successfully.");

// Buat Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
console.log("Supabase admin client created.");

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

Deno.serve(async (req: Request) => {
  console.log("--- REQUEST RECEIVED ---");

  // [PERBAIKAN] Menangani pemanggilan tes dengan body kosong agar tidak error
  const bodyText = await req.text();
  if (!bodyText) {
    console.log("Request body is empty, likely a test invocation. Responding successfully.");
    return new Response(JSON.stringify({ message: "Test invocation with empty body received." }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    const payload = JSON.parse(bodyText);
    console.log("Payload received and parsed:", JSON.stringify(payload, null, 2));

    const newTransaction = payload.record;

    if (payload.type !== 'INSERT' || !newTransaction) {
      console.log("Event is not an INSERT or record is missing. Exiting gracefully.");
      return new Response(JSON.stringify({ message: "Not an insert event or no record found." }), { status: 200 });
    }
    
    const creatorId = newTransaction.user_id;
    const householdId = newTransaction.household_id;

    if (!creatorId || !householdId) {
        console.error(`Missing creatorId (${creatorId}) or householdId (${householdId}) in the transaction. Exiting.`);
        return new Response(JSON.stringify({ error: "Missing user_id or household_id in transaction record" }), { status: 400 });
    }
    console.log(`Transaction from creator: ${creatorId} in household: ${householdId}`);

    const { data: creatorProfile, error: creatorError } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', creatorId)
      .single();

    if (creatorError) {
        console.error("Error fetching creator profile:", creatorError);
        throw creatorError;
    }
    console.log(`Creator found: ${creatorProfile?.full_name}`);

    const { data: householdMembers, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('household_id', householdId)
      .neq('id', creatorId);

    if (membersError) {
        console.error("Error fetching household members:", membersError);
        throw membersError;
    }

    if (!householdMembers || householdMembers.length === 0) {
      console.log("No other household members to notify. Exiting gracefully.");
      return new Response(JSON.stringify({ message: "No other household members to notify." }), { status: 200 });
    }

    const memberIds = householdMembers.map(m => m.id);
    console.log(`Found ${memberIds.length} other members to notify:`, memberIds);

    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription_data')
      .in('user_id', memberIds);

    if (subsError) {
        console.error("Error fetching push subscriptions:", subsError);
        throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No active push subscriptions found for the other members. Exiting gracefully.");
      return new Response(JSON.stringify({ message: "No active subscriptions found for other members." }), { status: 200 });
    }
    console.log(`Found ${subscriptions.length} subscriptions to send to.`);

    const creatorName = creatorProfile?.full_name || 'Seseorang';
    const notificationPayload = JSON.stringify({
      title: `Transaksi Baru: ${formatCurrency(newTransaction.amount)}`,
      body: `${creatorName} baru saja menambahkan pengeluaran untuk "${newTransaction.note || 'sesuatu'}".`,
      icon: '/favicon.ico',
      data: { url: '/transactions' }
    });

    console.log("Preparing to send notifications with payload:", notificationPayload);

    const sendPromises = subscriptions.map(sub =>
      webpush.sendNotification(sub.subscription_data, notificationPayload)
    );

    const sendResults = await Promise.allSettled(sendPromises);
    
    console.log("--- NOTIFICATION SEND RESULTS ---");
    sendResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`Successfully sent notification to subscription ${index + 1}.`);
        } else {
            console.error(`Failed to send notification to subscription ${index + 1}:`, result.reason?.body || result.reason);
        }
    });
    console.log("--- END OF RESULTS ---");

    return new Response(JSON.stringify({ message: `Notifications processed for ${subscriptions.length} subscribers.` }), {
      status: 200,
    });

  } catch (err) {
    console.error("!!! UNHANDLED ERROR IN FUNCTION !!!", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
    });
  }
});