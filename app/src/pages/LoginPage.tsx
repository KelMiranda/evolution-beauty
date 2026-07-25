import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, ArrowRight, Lock, Mail } from 'lucide-react'
import { AnimatedText, FadeIn, PageTransition } from '@/components/animations'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [correo, setCorreo] = useState('admin@acoes.local')
  const [contrasena, setContrasena] = useState('Admin1234!')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ correo, contrasena })
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center px-6 bg-charcoal relative overflow-hidden">
        {/* Animated glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gold/[0.04] rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gold/[0.02] rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full bg-gold/20 animate-float" style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }} />
          ))}
        </div>

        <div className="w-full max-w-md relative z-10">
          <FadeIn direction="up" distance={30} duration={0.8}>
            <div className="bg-charcoal-light/80 backdrop-blur-xl rounded-2xl border border-warm-tan/10 p-8 md:p-10 shadow-card-hover">
              <div className="text-center mb-8">
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-gold/70">ACOES Admin</span>
                <AnimatedText className="mt-4 font-display text-3xl text-ivory" type="words" stagger={0.05} scrollTrigger={false}>
                  Iniciar sesión
                </AnimatedText>
                <p className="mt-2 text-sm text-warm-gray">
                  Accede al panel de administración de ACOES.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-[11px] font-medium text-warm-gray/70 uppercase tracking-wider">Correo electrónico</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray/30" />
                    <input type="email" value={correo} onChange={e => { setCorreo(e.target.value); setError('') }}
                      className="w-full pl-11 pr-4 py-3.5 bg-charcoal border border-warm-tan/15 rounded-xl text-sm text-ivory placeholder:text-warm-gray/30 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/40 transition-all"
                      placeholder="correo@ejemplo.com" aria-label="Correo electrónico" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-warm-gray/70 uppercase tracking-wider">Contraseña</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray/30" />
                    <input type={showPass ? 'text' : 'password'} value={contrasena} onChange={e => { setContrasena(e.target.value); setError('') }}
                      className="w-full pl-11 pr-12 py-3.5 bg-charcoal border border-warm-tan/15 rounded-xl text-sm text-ivory placeholder:text-warm-gray/30 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/40 transition-all"
                      placeholder="••••••••" aria-label="Contraseña" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-gray/40 hover:text-ivory transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <FadeIn direction="none" scrollTrigger={false}>
                    <div className="p-3 bg-error/5 border border-error/15 rounded-lg">
                      <p className="text-sm text-error">{error}</p>
                    </div>
                  </FadeIn>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-all flex items-center justify-center gap-2 disabled:opacity-50 group">
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
                  ) : (
                    <>Entrar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-warm-tan/10">
                <p className="text-xs text-warm-gray/50 text-center">
                  Usuario: <span className="text-gold/70 font-medium">admin@acoes.local</span> / <span className="text-gold/70 font-medium">Admin1234!</span>
                </p>
              </div>
            </div>
          </FadeIn>

          <p className="mt-6 text-center text-sm text-warm-gray/40">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-gold/70 hover:text-gold transition-colors">Regístrate aquí</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
