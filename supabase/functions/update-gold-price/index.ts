import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ANTAM_URL = 'https://www.logammulia.com/id/harga-emas-hari-ini';

console.log("Update Gold Price function initialized with full headers.");

// Menambahkan tipe 'Request' pada parameter 'req'
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not set.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    console.log("Fetching gold price from:", ANTAM_URL);

    const response = await fetch(ANTAM_URL, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Fetch failed with status: ${response.status}. Body: ${errorBody.slice(0, 200)}...`);
      throw new Error(`Failed to fetch from Logam Mulia. Status: ${response.status}`);
    }

    const html = await response.text();
    const priceMatch = html.match(/<td data-label="Harga Dasar">Rp ([\d.,]+)<\/td>/);
    
    if (!priceMatch || !priceMatch[1]) {
      throw new Error('Could not parse gold price from the website HTML. The website structure might have changed.');
    }
    
    const priceString = priceMatch[1].replace(/\./g, '').replace(/,00/, '');
    const price = parseInt(priceString, 10);
    
    if (isNaN(price)) {
      throw new Error(`Parsed price is not a valid number. Value: "${priceString}"`);
    }

    console.log("Successfully parsed gold price:", price);
    
    const { error } = await supabase.from('current_prices').update({
      price: price,
      last_updated_at: new Date().toISOString()
    }).eq('asset_key', 'GOLD_IDR');

    if (error) {
      console.error("Supabase update error:", error);
      throw error;
    }

    const data = {
      message: `Gold price updated successfully to ${price}`,
      price: price
    };

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error("Error in function execution:", (err as Error).message);
    // --- PERBAIKAN DI SINI: Memberikan tipe pada 'err' ---
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});