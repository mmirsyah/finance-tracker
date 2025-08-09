// src/app/(app)/settings/page.tsx

"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast'; // <-- GANTI IMPORT KE react-hot-toast

type Profile = { id: string; full_name: string | null; household_id: string; period_start_day: number; }

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isPending, startTransition] = useTransition();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<Profile[]>([]);

  // State untuk form
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [periodStartDay, setPeriodStartDay] = useState<number>(1);
  const [periodInput, setPeriodInput] = useState<string>('1');

  const fetchHouseholdData = useCallback(async (householdId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('household_id', householdId);
    
    if (error) {
      console.error('Error fetching household members:', error);
      toast.error("Failed to load household members.");
    } else {
      setHouseholdMembers(data as Profile[]);
    }
  }, []);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: userProfile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (error) {
          toast.error("Could not fetch your profile.");
          router.push('/dashboard');
          return;
        }
        if (userProfile) {
          setProfile(userProfile);
          setFullName(userProfile.full_name || '');
          const startDay = userProfile.period_start_day || 1;
          setPeriodStartDay(startDay);
          setPeriodInput(startDay.toString());
          await fetchHouseholdData(userProfile.household_id);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    fetchUserAndProfile();
  }, [router, fetchHouseholdData]);
  
  const handlePeriodInputBlur = () => {
    const value = parseInt(periodInput, 10);
    const clampedValue = isNaN(value) ? periodStartDay : Math.max(1, Math.min(31, value));
    setPeriodStartDay(clampedValue);
    setPeriodInput(clampedValue.toString());
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    handlePeriodInputBlur(); 

    const promise = async () => {
      // 1. Update nama lengkap
      const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
      const { error: profileNameError } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);

      if(authError || profileNameError) {
        throw new Error(authError?.message || profileNameError?.message);
      }

      // 2. Update periode household menggunakan RPC
      const { error: periodError } = await supabase.rpc('update_household_period_start_day', { new_day: periodStartDay });

      if (periodError) {
        throw new Error(periodError.message);
      }
      
      // Karena update nama berhasil, fetch ulang data anggota household
      await fetchHouseholdData(profile.household_id);
    };
    
    // Menggunakan toast.promise dari react-hot-toast
    toast.promise(promise(), {
        loading: 'Saving profile...',
        success: 'Profile saved successfully!',
        error: (err) => `Error: ${err.message}`
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (newPassword.length < 6) { toast.error("Password should be at least 6 characters."); return; }
    
    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { toast.error(`Error updating password: ${error.message}`); } 
      else {
        toast.success('Password updated successfully!');
        setNewPassword(''); setConfirmPassword('');
      }
    });
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    startTransition(async () => {
      const { data, error } = await supabase.rpc('create_household_invite', { p_invitee_email: inviteEmail });
      if (error || (data && data.error)) { toast.error(`Error sending invite: ${error?.message || data.error}`); } 
      else {
        toast.success(`Invitation sent to ${inviteEmail}!`);
        setInviteEmail('');
      }
    });
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Settings</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Profile & Household</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div><label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label><input id="email" type="email" value={user?.email || ''} disabled className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" /></div>
          <div><label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label><input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="Your name" /></div>
          
          <div>
            <label htmlFor="periodStartDay" className="block text-sm font-medium text-gray-700">Household Financial Period Start Day</label>
            <input 
              id="periodStartDay" 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={handlePeriodInputBlur}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="e.g. 25"
            />
            <p className="text-xs text-gray-500 mt-1">
              This setting applies to everyone in your household.
            </p>
          </div>

          <div className="flex items-center justify-start">
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center w-48 disabled:bg-blue-400 disabled:cursor-not-allowed">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile & Household'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Kartu Household Management dan Change Password tidak berubah */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Household Management</h2>
        <div className="mb-6"><h3 className="text-lg font-medium mb-2">Current Members</h3><ul className="space-y-2">{householdMembers.map(member => (<li key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md"><span className="text-gray-700">{member.full_name || 'Unnamed User'}</span></li>))}</ul></div>
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div>
            <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700">Invite New Member</label>
            <div className="mt-1 flex gap-2"><input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm" placeholder="member@example.com" required /><button type="submit" disabled={isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center w-32 disabled:bg-blue-400 disabled:cursor-not-allowed">{isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Invite'}</button></div>
          </div>
        </form>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div><label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label><input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="New password (min. 6 characters)" /></div>
          <div><label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label><input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="Confirm new password" /></div>
          <div className="flex items-center justify-start"><button type="submit" disabled={isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center w-40 disabled:bg-blue-400 disabled:cursor-not-allowed">{isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}</button></div>
        </form>
      </div>
    </div>
  );
}