// seed.ts
import { createClient } from '@supabase/supabase-js';
import { config } from 'https://deno.land/x/dotenv/mod.ts';

// Load environment variables from .env file
await config({ export: true, path: './supabase/.env' });

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const userEmail = 'monmagusr1@yopmail.com';
const userPassword = 'monmagusr1';

async function main() {
  console.log('Starting seed script...');

  // 1. Get or create the user
  let { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  let user = users.find(u => u.email === userEmail);

  if (!user) {
    console.log('Test user not found, creating new one...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Monmag User' },
    });
    if (error) {
      console.error('Error creating user:', error);
      return;
    }
    user = data.user;
    console.log('Test user created.');
    // Wait a moment for the profile to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log('Test user already exists.');
  }

  if (!user) {
    console.error('Could not get or create user.');
    return;
  }

  const userId = user.id;

  // 2. Get household_id from profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('household_id')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error(`Error fetching profile for user ${userId}:`, profileError);
    console.log('The handle_new_user trigger should have created a profile. Please check your database triggers.');
    return;
  }

  const householdId = profile.household_id;
  console.log(`Using user_id: ${userId} and household_id: ${householdId}`);

  // 3. Clean up existing data for this household
  console.log('Deleting old data for this household...');
  await supabaseAdmin.from('transactions').delete().eq('household_id', householdId);
  await supabaseAdmin.from('categories').delete().eq('household_id', householdId);
  await supabaseAdmin.from('accounts').delete().eq('household_id', householdId);
  console.log('Old data deleted.');

  // 4. Seed Accounts
  console.log('Seeding accounts...');
  const { data: accounts, error: accountsError } = await supabaseAdmin
    .from('accounts')
    .insert([
      { name: 'Bank', type: 'generic', initial_balance: 0, user_id: userId, household_id: householdId },
      { name: 'Cash', type: 'generic', initial_balance: 0, user_id: userId, household_id: householdId },
    ])
    .select();

  if (accountsError) {
    console.error('Error seeding accounts:', accountsError);
    return;
  }
  console.log(`${accounts.length} accounts seeded.`);
  const bankAccount = accounts.find(a => a.name === 'Bank');
  const cashAccount = accounts.find(a => a.name === 'Cash');

  // 5. Seed Categories
  console.log('Seeding categories...');
  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from('categories')
    .insert([
      // Income Parents
      { name: 'Employement', type: 'income', household_id: householdId, user_id: userId },
      { name: 'Other Income', type: 'income', household_id: householdId, user_id: userId },
      // Expense Parents
      { name: 'Fix Expense', type: 'expense', household_id: householdId, user_id: userId },
      { name: 'Essential', type: 'expense', household_id: householdId, user_id: userId },
      { name: 'Lifestyle', type: 'expense', household_id: householdId, user_id: userId },
    ])
    .select();

  if (categoriesError) {
    console.error('Error seeding parent categories:', categoriesError);
    return;
  }

  const employmentCat = categories.find(c => c.name === 'Employement');
  const fixExpenseCat = categories.find(c => c.name === 'Fix Expense');
  const essentialCat = categories.find(c => c.name === 'Essential');
  const lifestyleCat = categories.find(c => c.name === 'Lifestyle');

  const { data: subCategories, error: subCategoriesError } = await supabaseAdmin
    .from('categories')
    .insert([
      // Income Children
      { name: 'Salary', type: 'income', parent_id: employmentCat.id, household_id: householdId, user_id: userId },
      // Expense Children
      { name: 'Utility', type: 'expense', parent_id: fixExpenseCat.id, household_id: householdId, user_id: userId },
      { name: 'Internet', type: 'expense', parent_id: fixExpenseCat.id, household_id: householdId, user_id: userId },
      { name: 'Groceries', type: 'expense', parent_id: essentialCat.id, household_id: householdId, user_id: userId },
      { name: 'Transport', type: 'expense', parent_id: essentialCat.id, household_id: householdId, user_id: userId },
      { name: 'Eating out', type: 'expense', parent_id: lifestyleCat.id, household_id: householdId, user_id: userId },
      { name: 'Holiday', type: 'expense', parent_id: lifestyleCat.id, household_id: householdId, user_id: userId },
    ])
    .select();

  if (subCategoriesError) {
    console.error('Error seeding sub-categories:', subCategoriesError);
    return;
  }
  console.log(`${categories.length + subCategories.length} categories seeded.`);

  const salaryCat = subCategories.find(c => c.name === 'Salary');
  const utilityCat = subCategories.find(c => c.name === 'Utility');
  const internetCat = subCategories.find(c => c.name === 'Internet');
  const groceriesCat = subCategories.find(c => c.name === 'Groceries');
  const transportCat = subCategories.find(c => c.name === 'Transport');
  const eatingOutCat = subCategories.find(c => c.name === 'Eating out');
  const holidayCat = subCategories.find(c => c.name === 'Holiday');

  // 6. Seed Transactions
  console.log('Seeding transactions...');
  const transactionsToInsert = [
    // Incomes
    { date: '2025-08-01', type: 'income', amount: 10000000, note: 'Gaji Agustus', category: salaryCat.id, account_id: bankAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-09-01', type: 'income', amount: 10000000, note: 'Gaji September', category: salaryCat.id, account_id: bankAccount.id, household_id: householdId, user_id: userId },
    // Fixed Expenses
    { date: '2025-08-05', type: 'expense', amount: 500000, note: 'Bayar Listrik & Air', category: utilityCat.id, account_id: bankAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-10', type: 'expense', amount: 300000, note: 'Bayar Internet', category: internetCat.id, account_id: bankAccount.id, household_id: householdId, user_id: userId },
    // Spread Expenses from Cash
    { date: '2025-08-04', type: 'expense', amount: 1000000, note: 'Belanja Mingguan 1', category: groceriesCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-11', type: 'expense', amount: 1000000, note: 'Belanja Mingguan 2', category: groceriesCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-18', type: 'expense', amount: 1000000, note: 'Belanja Mingguan 3', category: groceriesCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-25', type: 'expense', amount: 1000000, note: 'Belanja Mingguan 4', category: groceriesCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-06', type: 'expense', amount: 300000, note: 'Bensin Minggu 1', category: transportCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-13', type: 'expense', amount: 300000, note: 'Bensin Minggu 2', category: transportCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-20', type: 'expense', amount: 300000, note: 'Bensin Minggu 3', category: transportCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-27', type: 'expense', amount: 300000, note: 'Bensin Minggu 4', category: transportCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-09', type: 'expense', amount: 800000, note: 'Makan di luar Akhir Pekan 1', category: eatingOutCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-16', type: 'expense', amount: 800000, note: 'Makan di luar Akhir Pekan 2', category: eatingOutCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-23', type: 'expense', amount: 800000, note: 'Makan di luar Akhir Pekan 3', category: eatingOutCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
    { date: '2025-08-30', type: 'expense', amount: 400000, note: 'Tiket Bioskop', category: holidayCat.id, account_id: cashAccount.id, household_id: householdId, user_id: userId },
  ];

  const { error: transactionsError } = await supabaseAdmin
    .from('transactions')
    .insert(transactionsToInsert);

  if (transactionsError) {
    console.error('Error seeding transactions:', transactionsError);
    return;
  }
  console.log(`${transactionsToInsert.length} transactions seeded.`);

  console.log('\nSeeding complete! 🚀');
  console.log('You can now log in with:');
  console.log(`Email: ${userEmail}`);
  console.log(`Password: ${userPassword}`);
}

main();