// src/components/layout/BottomNavigation.tsx
"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Wallet, 
  FileText, 
  MoreHorizontal,
  Shapes,
  TrendingUp,
  Repeat,
  PieChart,
  Settings,
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';

//import motion framer-motion
import {motion} from 'framer-motion';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  type?: 'item';
}

interface NavSpacer {
    type: 'spacer';
}

type NavItemType = NavItem | NavSpacer;

const mainNavItems: NavItemType[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'item' },
  { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft, type: 'item' },
  { type: 'spacer' },
  { href: '/budgets', label: 'Budget', icon: FileText, type: 'item' },
];

const moreNavItems: NavItem[] = [
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/assets', label: 'Assets', icon: TrendingUp },
  { href: '/categories', label: 'Categories', icon: Shapes },
  { href: '/recurring', label: 'Recurring', icon: Repeat },
  { href: '/reports', label: 'Reports', icon: PieChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const supabase = createClient(); // Pindahkan inisialisasi ke sini jika belum ada

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    setShowMoreMenu(false);
  };

  const isMoreActive = moreNavItems.some(item => pathname.startsWith(item.href));
  //definisi motion
  const itemVariants = {
    inactive: {scale: 1, y: 0},
    active:{
      scale: 1.1, 
      y:-2,
      transition: {type:'spring', stiffness:300, damping: 15}
    },
  } as const;

  return (
    <>
      {/* Overlay untuk menutup menu More (jika diklik di luar menu) */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40" // Pastikan z-index lebih rendah dari menu tapi lebih tinggi dari konten
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* Kontainer Wrapper untuk Navigasi Bawah dan Menu Pop-up */}
      <div className="fixed bottom-[34px] left-0 right-0 z-50 mx-4">
        {/* Menu More yang muncul dari bawah */}
        <div className={cn(
          "absolute bottom-[calc(100%+8px)] left-0 right-0 mx-4 bg-white border-t border-gray-200 shadow-xl transition-transform duration-300 ease-in-out", // Menggunakan bottom-full untuk menempatkannya di atas nav
          showMoreMenu ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
          "lg:hidden" // Sembunyikan di layar besar
        )}>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">More Options</h3>
            <div className="grid grid-cols-2 gap-3">
              {moreNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      isActive 
                        ? "bg-blue-100 text-blue-600 font-semibold" 
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                    onClick={() => setShowMoreMenu(false)}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
              >
                <LogOut className="w-6 h-6" />
                <span className="text-sm">Log Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <nav className="bg-white/75 backdrop-blur-lg border border-gray-200/50 shadow-xl lg:hidden rounded-xl"> {/* Tambahkan relative dan sembunyikan di lg */}
          <div className="flex items-center justify-around py-2 px-2">
            {mainNavItems.map((item, index) => {
                if (item.type === 'spacer') {
                    return <div key={index} className="w-[34px]" />;
                }
                
                const isActive = pathname.startsWith(item.href);
                return (
                    <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex flex-col items-center gap-1 p-3 min-w-0 flex-1 transition-colors rounded-lg group",
                        isActive 
                        ? "text-primary font-bold" // Invert warna untuk active state yang lebih jelas
                        : "text-gray-500 hover:text-primary font-medium"
                    )}
                    >
                    {/*wrap ikon dan teks dengan motion*/}
                    <motion.div
                      className="flex flex-col items-center gap-1"
                      variants={itemVariants}
                      animate={isActive?'active':'inactive'}
                    >
                      <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2}/>
                      <span className="text-xs truncate group-hover:font-bold">{item.label}</span>
                    </motion.div>
                    </Link>
                );
                })}
            
            {/* More button */}
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 min-w-0 flex-1 transition-colors rounded-lg group",
                isMoreActive || showMoreMenu
                  ? "text-primary font-bold" 
                  : "text-gray-500 font-medium hover:text-primary"
              )}
            >
              <motion.div
                className="flex flex-col items-center gap-1"
                variants={itemVariants}
                animate={isMoreActive || showMoreMenu ? 'active' : 'inactive'}
              >
              <MoreHorizontal className="w-6 h-6" strokeWidth={isMoreActive || showMoreMenu ? 2.5 : 2}/>
              <span className="text-xs group-hover:font-bold">More</span>
              </motion.div>
            </button>
          </div>
        </nav>
      </div>
      {/* [ BARIS BARU DITAMBAHKAN DI SINI ]
        Elemen ini HANYA untuk membuat efek blur di area 34px paling bawah.
      */}
      <div className="fixed bottom-0 left-0 right-0 h-[34px] z-40 bg-white/80 backdrop-blur-lg" />
     </>
  );
}