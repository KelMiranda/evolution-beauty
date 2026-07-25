import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import logoAcoes from '../../assets/logo.png'

export function PublicLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const scrollToContact = () => {
    if (location.pathname !== '/') {
      window.location.hash = '#/'
      setTimeout(() => {
        document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return
    }

    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    setMobileOpen(false)
  }, [location.pathname])

  const isActive = (path: string) => location.pathname === path

  const navLinks = [
    { label: 'Inicio', path: '/' },
    { label: 'Cursos', path: '/cursos' },
  ]

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-charcoal/95 backdrop-blur-xl border-b border-warm-tan/10 shadow-card' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-1.5 z-50">
            <img src={logoAcoes} alt="Logo ACOES" className="h-8 w-8 md:h-9 md:w-9 object-contain rounded-full bg-white p-0.5" />
            <span className="font-display text-xl text-ivory">ACOES</span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-gold uppercase">Portal</span>
          </Link>

          {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-[13px] font-medium transition-colors relative group ${
                  isActive(link.path) ? 'text-gold' : 'text-ivory/60 hover:text-ivory'
                }`}
              >
                {link.label}
                <span className={`absolute -bottom-0.5 left-0 h-px bg-gold transition-all duration-300 ${isActive(link.path) ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </Link>
              ))}
              <button
                type="button"
                onClick={scrollToContact}
                className="text-[13px] font-medium transition-colors relative group text-ivory/60 hover:text-ivory"
              >
                Contacto
                <span className="absolute -bottom-0.5 left-0 h-px bg-gold transition-all duration-300 w-0 group-hover:w-full" />
              </button>
            </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-[13px] font-medium text-ivory/60 hover:text-ivory px-4 py-2 border border-warm-tan/20 rounded-lg hover:border-gold/30 transition-all">
              Ingresar
            </Link>
            <Link to="/registro" className="text-[13px] font-medium text-charcoal bg-gold hover:bg-gold-light px-4 py-2 rounded-lg transition-colors">
              Registrar
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden z-50 p-2 text-ivory">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 bg-charcoal/98 backdrop-blur-xl z-40 flex flex-col items-center justify-center gap-8">
            {navLinks.map(link => (
              <Link key={link.path} to={link.path} className={`text-2xl font-display ${isActive(link.path) ? 'text-gold' : 'text-ivory/70'}`}>
                {link.label}
              </Link>
            ))}
            <button type="button" onClick={scrollToContact} className="text-2xl font-display text-ivory/70">
              Contacto
            </button>
            <div className="flex flex-col gap-3 mt-4 w-48">
              <Link to="/login" className="text-center py-3 border border-warm-tan/20 text-ivory rounded-lg">Ingresar</Link>
              <Link to="/registro" className="text-center py-3 bg-gold text-charcoal rounded-lg font-medium">Registrar</Link>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-charcoal border-t border-warm-tan/10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-baseline gap-1.5">
                <img src={logoAcoes} alt="Logo ACOES" className="h-7 w-7 md:h-8 md:w-8 object-contain rounded-full bg-white p-0.5" />
                <span className="font-display text-lg text-ivory">ACOES</span>
                <span className="font-mono text-[9px] tracking-[0.2em] text-gold uppercase">Portal</span>
              </div>
              <p className="text-xs text-warm-gray mt-2">Asociación de Cosmetólogas y Estilistas de El Salvador</p>
            </div>
            <div>
              <h4 className="font-mono text-[10px] tracking-[0.15em] uppercase text-warm-gray mb-3">Navegación</h4>
              <div className="space-y-2">
                {['Inicio', 'Cursos', 'Registro'].map(link => (
                  <Link key={link} to={link === 'Inicio' ? '/' : `/${link.toLowerCase()}`} className="block text-sm text-ivory/50 hover:text-gold transition-colors">
                    {link}
                  </Link>
                ))}
                <button type="button" onClick={scrollToContact} className="block text-sm text-left text-ivory/50 hover:text-gold transition-colors">
                  Contacto
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-mono text-[10px] tracking-[0.15em] uppercase text-warm-gray mb-3">Acceso</h4>
              <div className="space-y-2">
                <Link to="/registro" className="block text-sm text-ivory/50 hover:text-gold transition-colors">Registro público</Link>
                <Link to="/login" className="block text-sm text-ivory/50 hover:text-gold transition-colors">Panel admin</Link>
              </div>
            </div>
            <div>
              <h4 className="font-mono text-[10px] tracking-[0.15em] uppercase text-warm-gray mb-3">Contacto</h4>
              <div className="space-y-2 text-sm text-ivory/50">
                <p>+503 0000-0000</p>
                <p>info@acoes.org</p>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-warm-tan/10 text-center text-xs text-warm-gray">
            Copyright &copy; ACOES {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  )
}
