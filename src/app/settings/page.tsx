// src/app/settings/page.tsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Import spinner

type Profile = { id: string; full_name: string | null; household_id: string; }

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false); // State untuk loading tombol
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<Profile[]>([]);

  // State untuk form
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // State untuk pesan feedback
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [inviteMessage, setInviteMessage] = useState({ type: '', text: '' });

  const fetchHouseholdData = useCallback(async (householdId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('household_id', householdId);
    
    if (error) {
      console.error('Error fetching household members:', error);
    } else {
      setHouseholdMembers(data as Profile[]);
    }
  }, []);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (userProfile) {
          setProfile(userProfile);
          setFullName(userProfile.full_name || '');
          await fetchHouseholdData(userProfile.household_id);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    fetchUserAndProfile();
  }, [router, fetchHouseholdData]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage({ type: '', text: '' });
    if (!user) {
      setIsSavingProfile(false);
      return;
    }

    // Langkah 1: Update metadata di auth.users
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    
    // Langkah 2: Update nama di tabel profiles
    const { error: profileError } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);

    if (authError || profileError) {
      setProfileMessage({ type: 'error', text: `Error: ${authError?.message || profileError?.message}` });
    } else {
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      // Refresh data anggota household untuk menampilkan nama baru
      if(profile) await fetchHouseholdData(profile.household_id);
    }
    setIsSavingProfile(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);
    setPasswordMessage({ type: '', text: '' });
    if (newPassword !== confirmPassword) { setPasswordMessage({ type: 'error', text: "Passwords do not match." }); setIsSavingPassword(false); return; }
    if (newPassword.length < 6) { setPasswordMessage({ type: 'error', text: "Password should be at least 6 characters." }); setIsSavingPassword(false); return; }
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) { setPasswordMessage({ type: 'error', text: `Error: ${error.message}` }); } 
    else {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword(''); setConfirmPassword('');
    }
    setIsSavingPassword(false);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingInvite(true);
    setInviteMessage({ type: '', text: '' });
    if (!inviteEmail) {
      setIsSendingInvite(false);
      return;
    }

    const { data, error } = await supabase.rpc('create_household_invite', {
      p_invitee_email: inviteEmail
    });

    if (error || (data && data.error)) {
      setInviteMessage({ type: 'error', text: `Error: ${error?.message || data.error}` });
    } else {
      setInviteMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}!` });
      setInviteEmail('');
    }
    setIsSendingInvite(false);
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Settings</h1>

      {/* Household Management Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Household Management</h2>
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Current Members</h3>
          <ul className="space-y-2">
            {householdMembers.map(member => (
              <li key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <span className="text-gray-700">{member.full_name || 'Unnamed User'}</span>
                <span className="text-xs text-gray-500">{member.id === profile?.household_id ? 'Admin' : 'Member'}</span>
              </li>
            ))}
          </ul>
        </div>
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div>
            <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700">Invite New Member</label>
            <div className="mt-1 flex gap-2">
              <input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm" placeholder="member@example.com" required />
              <button type="submit" disabled={isSendingInvite} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center w-32 disabled:bg-blue-400">
                {isSendingInvite ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Invite'}
              </button>
            </div>
          </div>
          {inviteMessage.text && (<p className={`text-sm mt-2 ${inviteMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{inviteMessage.text}</p>)}
        </form>
      </div>

      {/* Profile Information Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div><label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label><input id="email" type="email" value={user?.email || ''} disabled className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" /></div>
          <div><label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label><input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="Your name" /></div>
          <div className="flex items-center justify-between">
            <button type="submit" disabled={isSavingProfile} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center w-32 disabled:bg-blue-400">
              {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile'}
            </button>
            {profileMessage.text && (<p className={`text-sm ${profileMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{profileMessage.text}</p>)}
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div><label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label><input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="New password (min. 6 characters)" /></div>
          <div><label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label><input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="Confirm new password" /></div>
          <div className="flex items-center justify-between">
            <button type="submit" disabled={isSavingPassword} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center w-40 disabled:bg-blue-400">
              {isSavingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
            </button>
            {passwordMessage.text && (<p className={`text-sm ${passwordMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{passwordMessage.text}</p>)}
          </div>
        </form>
      </div>
    </div>
  );
}
