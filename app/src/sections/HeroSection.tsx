import { useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const services = [
  'Custom Software Development',
  'Staff Augmentation',
  'AI & Automation',
]

const verticalText = `We help exceptional teams turn ideas into real products through custom apps, AI automations, and staffing strategies designed around real business goals. From a single embedded specialist to a full squad, we scale with companies that play to win.`

export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  // Mouse parallax effect on hero elements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      mouseRef.current = {
        x: (clientX - centerX) / centerX,
        y: (clientY - centerY) / centerY,
      }

      // Parallax on logo
      if (logoRef.current) {
        gsap.to(logoRef.current, {
          x: mouseRef.current.x * 15,
          y: mouseRef.current.y * 10,
          rotateY: mouseRef.current.x * 3,
          rotateX: -mouseRef.current.y * 3,
          duration: 0.8,
          ease: 'power2.out',
        })
      }

      // Parallax on service panel
      const panel = sectionRef.current?.querySelector('.service-panel')
      if (panel) {
        gsap.to(panel, {
          x: mouseRef.current.x * -8,
          y: mouseRef.current.y * -5,
          duration: 1,
          ease: 'power2.out',
        })
      }

      // Parallax on subtitle
      const subtitle = sectionRef.current?.querySelector('.hero-subtitle')
      if (subtitle) {
        gsap.to(subtitle, {
          x: mouseRef.current.x * 10,
          y: mouseRef.current.y * 5,
          duration: 1.2,
          ease: 'power2.out',
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.3 })

    // Top label fades in
    tl.from('.hero-top-label', {
      opacity: 0,
      y: -20,
      duration: 0.6,
      ease: 'power3.out',
    })

    // Vertical text slides in from left
    tl.from('.vertical-text-container', {
      opacity: 0,
      x: -50,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.3')

    // Subtitle character reveal
    tl.from('.hero-subtitle', {
      opacity: 0,
      y: 40,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.5')

    // Service panel slides in
    tl.from('.service-panel', {
      opacity: 0,
      x: -40,
      duration: 0.7,
      ease: 'power3.out',
    }, '-=0.5')

    // Service items stagger
    tl.from('.service-item', {
      opacity: 0,
      x: -20,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power3.out',
    }, '-=0.4')

    // Big logo scales up with 3D effect
    tl.from(logoRef.current, {
      opacity: 0,
      y: 80,
      scale: 0.9,
      rotateX: 15,
      duration: 1.2,
      ease: 'power3.out',
    }, '-=0.8')

  }, { scope: sectionRef })

  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-end pb-12 md:pb-20 px-6 pt-20 overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {/* Top Label */}
      <div className="hero-top-label absolute top-20 left-6 md:left-12">
        <span className="font-mono text-[11px] tracking-[0.1em] text-[#555555] uppercase">
          From Elite to Elite
        </span>
      </div>

      {/* Vertical Text - Left Edge */}
      <div className="vertical-text-container absolute left-2 md:left-4 top-1/2 -translate-y-1/2 hidden lg:block">
        <div 
          className="text-[10px] text-[#555555] font-mono tracking-[0.15em] leading-loose"
          style={{ 
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            maxHeight: '70vh',
          }}
        >
          {verticalText}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl w-full mx-auto grid md:grid-cols-12 gap-8 items-end">
        {/* Service Panel - Left */}
        <div className="md:col-span-4 service-panel" style={{ transformStyle: 'preserve-3d' }}>
          <div className="border border-[#1a1a1a] rounded-lg overflow-hidden hover:border-[#333] transition-colors duration-300">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <span className="font-mono text-[11px] tracking-[0.1em] text-[#555555] uppercase">
                What We Do
              </span>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {services.map((service, i) => (
                <a
                  key={i}
                  href="#services"
                  className="service-item block px-4 py-3.5 text-[13px] text-[#8a8a8a] hover:text-white hover:bg-[#0a0a0a] hover:pl-6 transition-all duration-300"
                >
                  {service}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="md:col-span-8 text-right">
          <p className="hero-subtitle text-lg md:text-xl text-[#8a8a8a] max-w-xl ml-auto mb-8">
            Custom software development and staffing strategies for U.S.-based companies and startups
          </p>
          <div ref={logoRef} style={{ transformStyle: 'preserve-3d' }}>
            <span className="text-[60px] sm:text-[80px] md:text-[100px] lg:text-[140px] font-extrabold text-white tracking-[-0.03em] leading-none inline-block">
              aracari
            </span>
            <sup className="text-[20px] md:text-[30px] text-white/60 ml-1">®</sup>
          </div>
        </div>
      </div>
    </section>
  )
}
