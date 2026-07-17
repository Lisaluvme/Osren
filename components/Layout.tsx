import React from 'react';
import { MENU_ITEMS } from '../constants';
import { UserRole } from '../types';
import {
  PieChart,
  FileText,
  Workflow,
  Package,
  Briefcase,
  Truck,
  Menu,
  X,
  User,
  LogOut,
  MessageSquare,
  Settings,
  Users
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentRole: UserRole;
  activeModule: string;
  onModuleChange: (id: string) => void;
  userInfo?: { name: string; email: string } | null;
  onLogout?: () => void;
}

const IconMap: Record<string, React.FC<any>> = {
  PieChart, FileText, Workflow, Package, Briefcase, Truck, MessageSquare, Settings, Users
};

const Layout: React.FC<LayoutProps> = ({
  children,
  currentRole,
  activeModule,
  onModuleChange,
  userInfo,
  onLogout
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const filteredMenu = MENU_ITEMS.filter(item => item.roles.includes(currentRole));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-700">
            <h1 className="text-2xl font-bold tracking-tight text-blue-400">GMP <span className="text-white font-light">mobile sales app</span></h1>
            <p className="text-xs text-slate-400 mt-1"></p>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {filteredMenu.map((item) => {
              const Icon = IconMap[item.icon];
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onModuleChange(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 group ${activeModule === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-700 bg-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {userInfo?.name.charAt(0) || currentRole.charAt(0)}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">{userInfo?.name || 'Current User'}</p>
                  <p className="text-xs text-slate-400 capitalize">{currentRole}</p>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm z-40">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 rounded-md hover:bg-slate-100">
             <Menu className="w-6 h-6" />
           </button>
           <h1 className="text-lg font-bold text-slate-800">Osren Ops</h1>
           <div className="w-8" /> {/* Spacer */}
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
          {/* Overlay for mobile sidebar */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
