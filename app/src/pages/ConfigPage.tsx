import { AnimatedSection } from '@/components/AnimatedSection'
import { useAuth } from '@/hooks/useAuth'
import { UserCircle, Bell, Shield, Palette } from 'lucide-react'

export function ConfigPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      <AnimatedSection>
        <h2 className="font-display text-2xl text-ivory">Configuración</h2>
        <p className="text-sm text-warm-gray mt-1">Administra tu cuenta y preferencias del portal</p>
      </AnimatedSection>

      <div className="grid gap-6 max-w-2xl">
        <AnimatedSection className="bg-charcoal-light rounded-xl p-6 border border-warm-tan/10">
          <div className="flex items-center gap-3 mb-6">
            <UserCircle className="w-5 h-5 text-gold" />
            <h3 className="font-display text-lg text-ivory">Perfil</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-warm-gray uppercase tracking-wider">Nombre</label>
              <p className="text-sm text-ivory font-medium">{user?.nombre || 'Admin'}</p>
            </div>
            <div>
              <label className="text-[10px] text-warm-gray uppercase tracking-wider">Correo</label>
              <p className="text-sm text-ivory font-medium">{user?.correo || 'admin@acoes.local'}</p>
            </div>
            <div>
              <label className="text-[10px] text-warm-gray uppercase tracking-wider">Rol</label>
              <p className="text-sm text-ivory font-medium capitalize">{user?.rol || 'admin'}</p>
            </div>
          </div>
        </AnimatedSection>

        {[
          { icon: Bell, title: 'Notificaciones', desc: 'Configura alertas de nuevos registros' },
          { icon: Shield, title: 'Seguridad', desc: 'Cambio de contraseña y autenticación' },
          { icon: Palette, title: 'Apariencia', desc: 'Personaliza el tema del portal' },
        ].map((section, i) => (
          <AnimatedSection key={i} delay={i * 0.1} className="bg-charcoal-light rounded-xl p-6 border border-warm-tan/10 opacity-50">
            <div className="flex items-center gap-3">
              <section.icon className="w-5 h-5 text-gold" />
              <div>
                <h3 className="font-display text-lg text-ivory">{section.title}</h3>
                <p className="text-xs text-warm-gray">{section.desc} — Próximamente</p>
              </div>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  )
}
