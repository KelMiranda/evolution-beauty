import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, Users, BarChart3, Settings,
  LogOut, ChevronRight, UserCircle, GraduationCap,
  Menu, X
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Registros', path: '/dashboard/registros' },
  { icon: GraduationCap, label: 'Cursos', path: '/dashboard/cursos' },
  { icon: BarChart3, label: 'Reportes', path: '/dashboard/reportes' },
  { icon: Settings, label: 'Configuración', path: '/dashboard/config' },
]

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-charcoal flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-charcoal-light border-r border-warm-tan/10 fixed h-full flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-1.5">
            <span className="font-display text-lg text-ivory">ACOES</span>
            <span className="font-mono text-[9px] tracking-[0.2em] text-gold uppercase">Admin</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-ivory/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                isActive(item.path)
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-ivory/50 hover:bg-charcoal-lighter hover:text-ivory'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive(item.path) && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-warm-tan/10">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ivory font-medium truncate">{user?.nombre || 'Admin'}</p>
              <p className="text-[10px] text-warm-gray capitalize">{user?.rol}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 mt-1 text-sm text-warm-gray hover:text-error transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="h-14 bg-charcoal-light/80 backdrop-blur-sm border-b border-warm-tan/10 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-ivory/50 hover:text-ivory">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm text-ivory/60">
              {menuItems.find(m => m.path === location.pathname)?.label || 'Dashboard'}
            </span>
          </div>
          <span className="text-xs text-warm-gray hidden sm:block">
            {new Date().toLocaleDateString('es-SV', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
