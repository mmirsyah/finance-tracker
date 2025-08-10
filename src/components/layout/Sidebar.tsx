// src/components/layout/Sidebar.tsx

"use client";

import { usePathname, useRouter } from 'next/navigation'; // <-- Import useRouter
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; // <-- Import Supabase client
import { 
  LayoutDashboard, Wallet, ArrowRightLeft, PieChart, 
  Target, FileText, Shapes, Settings, X, LogOut // <-- Import ikon LogOut
} from 'lucide-react';

interface NavItem { href: string; label: string; icon: React.ElementType; }

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/categories', label: 'Categories', icon: Shapes },
  { href: '/budgets', label: 'Budget', icon: FileText },
  { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { href: '/reports', label: 'Reports', icon: PieChart },
  { href: '/goals', label: 'Goals', icon: Target },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter(); // <-- Panggil hook useRouter

  // --- FUNGSI BARU UNTUK LOG OUT ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); // Arahkan kembali ke halaman login
    setSidebarOpen(false);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-30 transition-opacity duration-200 lg:hidden ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      ></div>

      <aside 
        className={`fixed left-0 top-0 z-40 h-screen w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-blue-600">
              {/* ... path svg ... */}
            </svg>
            <span className="text-xl font-bold text-gray-800">Finance</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-800" aria-label="Close sidebar">
            <X size={24} />
          </button>
        </div>
        
        {/* Navigasi Wrapper untuk memisahkan dengan tombol logout */}
        <div className="flex flex-col justify-between flex-1">
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Menu Utama */}
            {navItems.map((item) => {
              const isActive = item.href === '/transactions' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Menu Bawah (Settings, Profil, & Log Out) */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Link href="/settings"
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                pathname.startsWith('/settings') ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
            
            {/* --- TOMBOL LOG OUT BARU --- */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}