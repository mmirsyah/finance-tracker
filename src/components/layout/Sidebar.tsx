// src/components/layout/Sidebar.tsx

"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Wallet, ArrowRightLeft, PieChart,
  FileText, Shapes, Settings, X, LogOut
} from 'lucide-react';

interface NavItem { href: string; label: string; icon: React.ElementType; }

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/categories', label: 'Categories', icon: Shapes },
  { href: '/budgets', label: 'Budget', icon: FileText },
  { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { href: '/reports', label: 'Reports', icon: PieChart },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
            {/* --- Ikon baru Anda dari kode SVG yang diberikan --- */}
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" className="w-8 h-8 text-blue-600" fill="currentColor">
                <path d="M0 0 C1.28326172 -0.02900391 2.56652344 -0.05800781 3.88867188 -0.08789062 C5.72848633 -0.10045898 5.72848633 -0.10045898 7.60546875 -0.11328125 C9.28419067 -0.13515503 9.28419067 -0.13515503 10.99682617 -0.1574707 C13.8125 0.3125 13.8125 0.3125 15.67553711 1.80688477 C17.32120282 5.43356872 17.23988446 8.92070293 17.2109375 12.828125 C17.21512192 13.66769745 17.21930634 14.5072699 17.22361755 15.37228394 C17.22991818 18.10273276 17.21100202 20.83215471 17.1875 23.5625 C17.18317963 24.49221619 17.17885925 25.42193237 17.17440796 26.37982178 C17.09507427 40.87363377 16.4470646 55.03038662 13.8125 69.3125 C13.65152832 70.22950684 13.49055664 71.14651367 13.32470703 72.09130859 C6.77439449 108.51759036 -7.31586244 142.71419402 -32.1875 170.3125 C-33.26064453 171.52873047 -33.26064453 171.52873047 -34.35546875 172.76953125 C-47.98454636 187.37028793 -67.10443657 196.72313394 -87.0625 197.75 C-90.57239952 197.64574556 -91.87915188 197.51328482 -94.875 195.5625 C-101.52057972 179.1067788 -89.48366825 154.53529637 -83.1875 139.3125 C-77.58549276 126.43863347 -70.61850989 114.62348064 -62.50927734 103.17871094 C-61.34899035 101.54050743 -60.21343977 99.88484215 -59.08203125 98.2265625 C-56.51929433 94.63986227 -55.10747953 92.66633828 -50.9375 91.0625 C-48.1875 91.3125 -48.1875 91.3125 -46.375 92.625 C-43.36985445 96.89546999 -43.43733127 101.24747867 -44.1875 106.3125 C-45.71945592 109.50889009 -47.81613482 112.08577216 -50.0625 114.8125 C-51.26919779 116.38099314 -52.46827714 117.9553732 -53.66015625 119.53515625 C-54.25844238 120.32809082 -54.85672852 121.12102539 -55.47314453 121.93798828 C-67.11741576 138.0661828 -74.32492864 157.45644114 -80.1875 176.3125 C-57.75788436 171.77885428 -41.26852529 157.69662599 -28.62890625 139.0625 C-5.15016415 103.42029683 2.02888178 62.22752812 3.8125 20.3125 C-12.21746257 21.56723428 -26.45775411 23.45825825 -41.1875 30.3125 C-42.09242188 30.73144531 -42.99734375 31.15039062 -43.9296875 31.58203125 C-74.33826113 46.87445886 -90.48963576 80.0232862 -101.0234375 110.75097656 C-113.24418953 148.12409323 -116.40917561 187.92122433 -116.3125 227 C-116.31161377 228.03809814 -116.31072754 229.07619629 -116.30981445 230.14575195 C-116.29328125 246.77434137 -116.01229191 263.38446826 -115.47293091 280.00395203 C-115.38651524 282.75274156 -115.311326 285.5017135 -115.24169922 288.25097656 C-115.20446796 289.66710621 -115.1628909 291.08312622 -115.11767578 292.49902344 C-115.05214119 294.66596998 -115.00802564 296.83243625 -114.96875 299 C-114.93845703 300.26199219 -114.90816406 301.52398437 -114.87695312 302.82421875 C-115.23253062 306.81831569 -116.2703895 310.3953895 -119.1875 313.3125 C-121.5 313.6875 -121.5 313.6875 -124.1875 313.3125 C-129.3618313 308.82546128 -129.21559939 302.8910921 -129.9375 296.5 C-135.01045662 258.02111231 -146.28777261 207.26070903 -177.55859375 181.34765625 C-187.90289905 173.71449493 -197.81418899 171.20232226 -210.48046875 170.8828125 C-215.73063019 170.64729124 -215.73063019 170.64729124 -218.1171875 168.8984375 C-220.81945275 164.89435104 -220.66739309 161.02195928 -220.1875 156.3125 C-219.0285416 153.89380422 -218.06427904 152.18927904 -216.1875 150.3125 C-205.51432944 149.55544953 -196.22243889 150.26479356 -186.1875 154.3125 C-185.45273438 154.60125 -184.71796875 154.89 -183.9609375 155.1875 C-160.18477445 165.79678391 -145.64179444 192.9273005 -136.69384766 215.98217773 C-134.77467297 221.06417686 -132.90540971 226.15877087 -131.1875 231.3125 C-131.17291748 230.56194336 -131.15833496 229.81138672 -131.14331055 229.03808594 C-129.6506089 159.01297271 -122.47813764 77.30470189 -69.11328125 25.90234375 C-49.30328669 8.366928 -26.35826562 0.20039229 0 0 Z " transform="translate(352.1875,94.6875)"/>
            </svg>
            <span className="text-xl font-bold text-gray-800">Finance</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-800" aria-label="Close sidebar">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col justify-between flex-1">
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
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