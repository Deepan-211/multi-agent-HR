import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Network, 
  CheckCircle, 
  Scale, 
  Users, 
  Settings, 
  FileBarChart,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Observability', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Audit', href: '/audit/new', icon: Search },
  { name: 'Agent Swarm', href: '/audit/swarm', icon: Network },
  { name: 'Results', href: '/audit/results', icon: CheckCircle },
  { name: 'Equity Models', href: '/equity', icon: Scale },
  { name: 'HITL Queue', href: '/hitl', icon: Users },
  { name: 'Reports', href: '/reports', icon: FileBarChart },
  { name: 'Governance', href: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-charcoal-900 text-offwhite">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-charcoal-900/50 backdrop-blur-xl flex flex-col">
        <div className="flex h-16 items-center px-6 border-b border-white/10">
          <ShieldAlert className="w-6 h-6 text-emerald-500 mr-2" />
          <span className="text-lg font-bold tracking-wide">PayParity</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  isActive ? 'bg-white/10 text-emerald-400' : 'text-offwhite-muted hover:bg-white/5 hover:text-white',
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-emerald-400' : 'text-gray-400 group-hover:text-gray-300',
                    'mr-3 flex-shrink-0 h-5 w-5'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-sm font-bold">
              EC
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">Exec Committee</p>
              <p className="text-xs text-gray-400">Workspace: Global</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-white/10 px-8 bg-charcoal-900/50 backdrop-blur-xl">
          <h1 className="text-xl font-semibold text-white">
            {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span>Privacy Guard Active (ε=0.1)</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-charcoal-900 to-charcoal-900 -z-10 pointer-events-none" />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
