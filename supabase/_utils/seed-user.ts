// supabase/_utils/seed-user.ts
import { createClient, type User } from 'supabase'
import { config } from 'https://deno.land/x/dotenv/mod.ts'

// Muat variabel dari .env
await config({ export: true, path: './supabase/.env' })


// Ambil variabel dari file .env di folder /supabase
// Pastikan Anda punya SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di sana
// Biasanya ini otomatis ada saat menjalankan `supabase start`
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

if (!supabaseUrl || !supabaseKey) {
  console.error("Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY ada di environment variables.")
  Deno.exit(1)
}

// Buat admin client dengan service_role key
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const userEmail = "monmagusr1@yopmail.com"
const userPassword = "monmagusr1"

// Cek apakah user sudah ada
const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
if (listError) {
  console.error("Gagal mengambil daftar user:", listError)
  Deno.exit(1)
}

const existingUser = users.find((u: User) => u.email === userEmail)

if (existingUser) {
  console.log(`User dengan email ${userEmail} sudah ada. Seeding dilewati.`)
} else {
  // Buat user baru menggunakan API
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: userEmail,
    password: userPassword,
    email_confirm: true, // Langsung aktifkan user
    user_metadata: { full_name: 'Monmag User' }
  })

  if (error) {
    console.error("Gagal membuat user:", error)
  } else {
    console.log("User berhasil dibuat:", data.user?.email)
  }
}
