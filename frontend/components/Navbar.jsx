import Link from 'next/link';
import { useRouter } from 'next/router';
import { Activity, Map, BarChart3, Navigation } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  
  const isActive = (path) => router.pathname === path;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <nav className="bg-white/70 backdrop-blur-xl shadow-2xl rounded-full border border-white/30 px-8 py-3 backdrop-saturate-150">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary hover:scale-105 transition-transform">
            <div className="bg-gradient-to-br from-primary to-blue-900 p-2 rounded-full">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-primary to-blue-900 bg-clip-text text-transparent">
              CongestionAI
            </span>
          </Link>
          
          {/* Divider */}
          <div className="h-8 w-px bg-gray-300"></div>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link 
              href="/" 
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                isActive('/') 
                  ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Map className="h-4 w-4" />
              <span className="font-medium">Map</span>
            </Link>
            
            <Link 
              href="/routes" 
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                isActive('/routes') 
                  ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Navigation className="h-4 w-4" />
              <span className="font-medium">Routes</span>
            </Link>
            
            <Link 
              href="/insights" 
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                isActive('/insights') 
                  ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">Insights</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
