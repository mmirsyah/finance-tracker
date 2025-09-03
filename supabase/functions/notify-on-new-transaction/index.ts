// supabase/functions/notify-on-new-transaction/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Use the stable 'web-push' library from NPM
import webpush from 'npm:web-push';

// Define PushSubscription type locally as we can't import it easily from the new library
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

console.log("Function script starting... Initializing constants.");

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const supabaseUrl = Deno.env.get('PUBLIC_SUPABASE_URL');
const serviceRoleKey = Deno.env.get('PRIVATE_SUPABASE_SERVICE_ROLE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT_EMAIL'); // Example: 'mailto:admin@example.com'

if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !serviceRoleKey || !vapidSubject) {
  console.error("FATAL: Missing one or more required environment variables.");
  throw new Error('Required environment variables are not set.');
}

// Configure web-push library with VAPID details
webpush.setVapidDetails(
  vapidSubject,
  vapidPublicKey,
  vapidPrivateKey
);

console.log("Web-push configured.");

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
console.log("Supabase admin client created.");

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

Deno.serve(async (req: Request) => {
  console.log("--- REQUEST RECEIVED ---");

  const bodyText = await req.text();
  if (!bodyText) {
    console.log("Test invocation with empty body received.");
    return new Response(JSON.stringify({ message: "Test invocation with empty body received." }), { status: 200 });
  }

  try {
    const payload = JSON.parse(bodyText);
    console.log("Payload received and parsed.");

    if (payload.type !== 'INSERT' || !payload.record) {
      console.log("Not an insert event or no record found.");
      return new Response(JSON.stringify({ message: "Not an insert event." }), { status: 200 });
    }

    const newTransaction = payload.record;
    const creatorId = newTransaction.user_id;
    const householdId = newTransaction.household_id;

    if (!creatorId || !householdId) {
      console.error("Missing user_id or household_id in the new transaction record.");
      return new Response(JSON.stringify({ error: "Missing user_id or household_id." }), { status: 400 });
    }
    console.log(`Transaction from creator: ${creatorId} in household: ${householdId}`);

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
      console.log("No other members in the household to notify.");
      return new Response(JSON.stringify({ message: "No other members to notify." }), { status: 200 });
    }

    const memberIds = householdMembers.map(m => m.id);
    console.log(`Found ${memberIds.length} other member(s) to notify: ${memberIds.join(', ')}`);

    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription_data') // No need to alias
      .in('user_id', memberIds);

    if (subsError) {
      console.error("Error fetching push subscriptions:", subsError);
      throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No active push subscriptions found for the members.");
      return new Response(JSON.stringify({ message: "No active subscriptions found." }), { status: 200 });
    }
    console.log(`Found ${subscriptions.length} subscription(s) to send to.`);

    const { data: creatorProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', creatorId)
      .single();

    if (profileError) {
        console.error("Error fetching creator's profile:", profileError);
        // Continue without the name, it's not fatal
    }
    const creatorName = creatorProfile?.full_name || 'Seseorang';

    const notificationPayload = JSON.stringify({
      title: `Transaksi Baru: ${formatCurrency(newTransaction.amount)}`,
      body: `${creatorName} baru saja menambahkan pengeluaran untuk "${newTransaction.note || 'sesuatu'}".`,
      icon: '/favicon.ico',
      data: { url: '/transactions' }
    });

    console.log("Preparing to send notifications...");

    const sendPromises = subscriptions.map(sub => {
      // The subscription data from the DB should be a valid PushSubscription object
      const subscription = sub.subscription_data as PushSubscription;
      return webpush.sendNotification(subscription, notificationPayload);
    });

    const sendResults = await Promise.allSettled(sendPromises);

    console.log("--- NOTIFICATION SEND RESULTS ---");
    sendResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Successfully sent notification to subscription ${index + 1}.`);
      } else {
        // The web-push library throws specific error objects
        console.error(`Failed to send notification to subscription ${index + 1}:`, result.reason.body || result.reason);
      }
    });

    return new Response(JSON.stringify({ message: "Notifications processed." }), { status: 200 });

  } catch (err) {
    console.error("!!! UNHANDLED ERROR IN FUNCTION !!!", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});