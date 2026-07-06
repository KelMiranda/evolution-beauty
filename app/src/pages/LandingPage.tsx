import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatedText, FadeIn, CountUp, MagneticButton, PageTransition } from '@/components/animations'
import {
  ClipboardList, Database, CheckCircle,
  ArrowRight, Users, GraduationCap
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const shapesRef = useRef<HTMLDivElement>(null)

  // Hero entrance timeline
  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.2 })
    tl.from('.hero-label', { opacity: 0, y: 20, duration: 0.7, ease: 'power3.out' })
      .from('.hero-title-line', { opacity: 0, y: 60, rotateX: -30, duration: 1, ease: 'power3.out', stagger: 0.1 }, '-=0.4')
      .from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.7, ease: 'power3.out' }, '-=0.6')
      .from('.hero-bullet', { opacity: 0, x: -30, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, '-=0.4')
      .from('.hero-cta', { opacity: 0, y: 20, scale: 0.9, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.3')
      .from('.hero-card', { opacity: 0, x: 80, scale: 0.95, duration: 1, ease: 'power3.out' }, '-=0.8')
      .from('.hero-card-step', { opacity: 0, x: 20, duration: 0.4, stagger: 0.1, ease: 'power3.out' }, '-=0.6')
  }, { scope: heroRef })

  // Parallax for floating shapes
  useEffect(() => {
    if (!shapesRef.current) return
    const shapes = shapesRef.current.querySelectorAll('.float-shape')
    shapes.forEach((shape, i) => {
      gsap.to(shape, {
        yPercent: -20 - i * 10,
        rotation: i % 2 === 0 ? 5 : -5,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      })
    })
  }, [])

  // Mouse parallax on hero card
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const card = document.querySelector('.hero-card-inner') as HTMLElement
      if (!card) return
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const dx = (e.clientX - cx) / cx * 8
      const dy = (e.clientY - cy) / cy * 8
      gsap.to(card, { rotateY: dx, rotateX: -dy, duration: 0.6, ease: 'power2.out' })
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  return (
    <PageTransition>
      <div>
        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-[95vh] flex items-center overflow-hidden bg-charcoal" style={{ perspective: '1200px' }}>
          {/* Animated floating shapes */}
          <div ref={shapesRef} className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="float-shape absolute top-[15%] left-[5%] w-72 h-72 rounded-full bg-gold/[0.04] blur-[90px]" />
            <div className="float-shape absolute top-[60%] right-[8%] w-96 h-96 rounded-full bg-gold/[0.03] blur-[110px]" />
            <div className="float-shape absolute bottom-[10%] left-[30%] w-48 h-48 rounded-full bg-gold/[0.05] blur-[70px]" />
            {/* Geometric accent */}
            <div className="float-shape absolute top-[20%] right-[25%] w-2 h-2 rounded-full bg-gold/30" />
            <div className="float-shape absolute top-[35%] right-[20%] w-1 h-1 rounded-full bg-gold/20" />
            <div className="float-shape absolute bottom-[30%] left-[8%] w-1.5 h-1.5 rounded-full bg-gold/25" />
          </div>

          <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
            {/* Left */}
            <div>
              <div className="hero-label overflow-hidden">
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-gold/80 inline-block">
                  Asociación de Cosmetólogas y Estilistas de El Salvador
                </span>
              </div>

              <div className="mt-8 space-y-1" style={{ perspective: '1000px' }}>
                <div className="hero-title-line overflow-hidden">
                  <h1 className="font-display text-6xl md:text-7xl lg:text-[5.5rem] text-ivory leading-[0.92] tracking-[-0.02em]"
                    style={{ transformStyle: 'preserve-3d' }}>
                    ACOES
                  </h1>
                </div>
                <div className="hero-title-line overflow-hidden">
                  <span className="font-display italic text-gold text-4xl md:text-5xl lg:text-6xl leading-[1.1] block"
                    style={{ transformStyle: 'preserve-3d' }}>
                    Portal de registro
                  </span>
                </div>
              </div>

              <AnimatedText className="hero-subtitle mt-6 text-warm-gray max-w-lg leading-relaxed text-base" scrollTrigger={false}>
                Centraliza el registro, la validación y el acceso interno al directorio de ACOES con una experiencia clara y profesional.
              </AnimatedText>

              <div className="mt-8 space-y-3">
                {[
                  'Acceso público para conocer ACOES',
                  'Registro guiado y validado antes de guardar',
                  'Base central para seguimiento interno',
                  'Cursos y capacitaciones con cupos en vivo',
                ].map((text, i) => (
                  <div key={i} className="hero-bullet flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-gold" />
                    </div>
                    <span className="text-sm text-ivory/60">{text}</span>
                  </div>
                ))}
              </div>

              <div className="hero-cta mt-10 flex flex-wrap items-center gap-4">
                <MagneticButton
                  strength={0.25}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-colors"
                  onClick={() => window.location.hash = '#/registro'}
                >
                  Ir al registro <ArrowRight className="w-4 h-4" />
                </MagneticButton>
                <Link to="/cursos" className="group inline-flex items-center gap-2 px-7 py-3.5 border border-warm-tan/20 text-ivory/80 text-sm rounded-xl hover:border-gold/40 hover:text-gold hover:bg-gold/5 transition-all duration-300">
                  <GraduationCap className="w-4 h-4 group-hover:scale-110 transition-transform" /> Ver cursos
                </Link>
              </div>
            </div>

            {/* Right - 3D Card */}
            <div className="hero-card hidden lg:flex justify-center">
              <div className="hero-card-inner relative" style={{ transformStyle: 'preserve-3d' }}>
                <div className="w-[340px] bg-charcoal-light/80 backdrop-blur-sm rounded-2xl border border-warm-tan/10 p-7 relative z-10 shadow-card-hover">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <p className="font-display text-[15px] text-ivory">Portal ACOES</p>
                      <p className="font-mono text-[9px] tracking-wider text-gold/60 uppercase">Registro + Cursos</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { num: '156', label: 'Registrados' },
                      { num: '6', label: 'Cursos activos' },
                      { num: '43', label: 'Facilitadoras' },
                    ].map((item, i) => (
                      <div key={i} className="hero-card-step flex items-center gap-3 p-3 bg-charcoal/60 rounded-xl hover:bg-charcoal transition-colors cursor-default">
                        <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                          <span className="text-xs font-display text-gold">{item.num}</span>
                        </div>
                        <span className="text-sm text-ivory/70">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 h-11 bg-gold/5 rounded-xl flex items-center justify-center border border-gold/10">
                    <span className="font-mono text-[10px] tracking-[0.15em] text-gold uppercase">ACOES · Premium</span>
                  </div>
                </div>
                {/* Glow behind card */}
                <div className="absolute -inset-4 bg-gold/[0.03] rounded-3xl blur-xl -z-10" />
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <div className="w-5 h-8 rounded-full border border-warm-tan/20 flex items-start justify-center p-1.5">
              <div className="w-1 h-2 bg-gold/50 rounded-full" />
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-28 bg-charcoal-light relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-warm-tan/10 to-transparent" />
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <FadeIn>
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-gold/70">Servicios</span>
              </FadeIn>
              <FadeIn delay={0.1}>
                <h2 className="mt-5 font-display text-4xl md:text-5xl text-ivory">Un portal completo para ACOES</h2>
              </FadeIn>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: ClipboardList, num: '01', title: 'Registro de participantes', desc: 'Formulario estructurado multi-paso con validación en tiempo real y confirmación previa.' },
                { icon: Database, num: '02', title: 'Base central', desc: 'Todos los registros en un solo lugar. Busca, filtra, exporta y gestiona la información.' },
                { icon: GraduationCap, num: '03', title: 'Cursos y capacitaciones', desc: 'Catálogo de cursos con inscripción en línea, cupos en tiempo real y mapa de ubicación.' },
              ].map((service, i) => (
                <FadeIn key={i} delay={i * 0.15} direction="up" distance={40}>
                  <div className="group relative bg-charcoal rounded-2xl p-8 border border-warm-tan/[0.08] hover:border-gold/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-glow overflow-hidden">
                    {/* Subtle gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <div className="w-13 h-13 rounded-xl bg-gold/10 flex items-center justify-center group-hover:bg-gold group-hover:scale-110 transition-all duration-400 w-12 h-12">
                        <service.icon className="w-5 h-5 text-gold group-hover:text-charcoal transition-colors duration-300" />
                      </div>
                      <span className="font-mono text-[11px] text-gold/50 mt-5 block">{service.num}</span>
                      <h3 className="mt-2 font-display text-xl text-ivory group-hover:text-gold transition-colors duration-300">{service.title}</h3>
                      <p className="mt-3 text-sm text-warm-gray leading-relaxed">{service.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 bg-charcoal relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal-light via-charcoal to-charcoal" />
          <div className="max-w-5xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {[
                { value: 156, label: 'Registrados', suffix: '+' },
                { value: 6, label: 'Cursos', suffix: '' },
                { value: 43, label: 'Facilitadoras', suffix: '' },
                { value: 98, label: 'Participantes', suffix: '%' },
              ].map((stat, i) => (
                <FadeIn key={i} delay={i * 0.12} direction="up" distance={30}>
                  <div className="text-center group">
                    <div className="font-display text-5xl md:text-6xl text-gold group-hover:scale-105 transition-transform duration-300">
                      <CountUp end={stat.value} suffix={stat.suffix} duration={2} delay={0.3} />
                    </div>
                    <p className="mt-2 text-sm text-warm-gray uppercase tracking-wider">{stat.label}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-28 bg-charcoal-light relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-warm-tan/10 to-transparent" />
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-gold/[0.03] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              <FadeIn direction="left" distance={50}>
                <div>
                  <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-gold/70">Comienza ahora</span>
                  <h2 className="mt-5 font-display text-4xl md:text-5xl text-ivory leading-tight">
                    Regístrate o explora<br />nuestros cursos
                  </h2>
                  <p className="mt-4 text-warm-gray max-w-lg leading-relaxed">
                    Forma parte de ACOES y accede a capacitaciones de excelencia impartidas por profesionales del sector.
                  </p>
                </div>
              </FadeIn>
              <FadeIn direction="right" distance={50} delay={0.2}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <MagneticButton
                    strength={0.2}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-colors"
                    onClick={() => window.location.hash = '#/registro'}
                  >
                    Ir al registro <ArrowRight className="w-4 h-4" />
                  </MagneticButton>
                  <MagneticButton
                    strength={0.2}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-warm-tan/20 text-ivory text-sm rounded-xl hover:border-gold/40 hover:bg-gold/5 transition-all"
                    onClick={() => window.location.hash = '#/cursos'}
                  >
                    <GraduationCap className="w-4 h-4" /> Ver cursos
                  </MagneticButton>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
