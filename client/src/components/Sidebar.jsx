import React from 'react';
import { NavLink } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { LayoutDashboard, FolderKanban, CheckSquare, Kanban, Users, FileCode } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/kanban', label: 'Kanban Board', icon: Kanban },
    { to: '/users', label: 'Team Members', icon: Users },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-navy-950 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-navy-950'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="pt-3 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Developer
        </div>
        <a
          href={import.meta.env.VITE_DOCS_URL || 'http://localhost:5001/api/docs'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-navy-950 transition-colors"
          title="Open interactive Swagger API Documentation"
        >
          <FileCode className="w-4 h-4 text-emerald-600" />
          <span>API Docs (Swagger)</span>
        </a>
      </div>

      {/* Role Notice Card */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
        <div className="font-semibold text-navy-950">Active Session</div>
        <div className="text-slate-600">
          Logged in as <strong className="text-navy-900">{user?.role}</strong>
        </div>
        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
          PostgreSQL Verified Role
        </div>
      </div>
    </aside>
  );
}
