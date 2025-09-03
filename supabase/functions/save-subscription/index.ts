
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log(`save-subscription function initialized`);

Deno.serve(async (req: Request) => {
  // Menangani preflight request untuk CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Mendapatkan data user dari token JWT
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Mendapatkan subscription object dari body request
    const subscription = await req.json();
    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: 'Invalid subscription object' }), { status: 400 });
    }

    // Simpan data ke tabel push_subscriptions
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: user.id,
      subscription_data: subscription,
    });

    if (error) {
      // Jika ada error, langsung lemparkan agar bisa ditangkap oleh blok catch
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Subscription saved successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Error in save-subscription function:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
