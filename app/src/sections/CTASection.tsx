import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Marquee text scale up on enter
    gsap.from('.marquee-container', {
      opacity: 0,
      scale: 0.95,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.marquee-container',
        start: 'top 85%',
      },
    })

    // Badge bounce in with rotation
    gsap.from(badgeRef.current, {
      opacity: 0,
      scale: 0,
      rotation: -180,
      duration: 1.2,
      ease: 'back.out(1.7)',
      scrollTrigger: {
        trigger: badgeRef.current,
        start: 'top 85%',
      },
    })

    // Parallax on marquee speed based on scroll
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const marquee = sectionRef.current?.querySelector('.marquee-inner') as HTMLElement
        if (marquee) {
          const speed = 20 + self.progress * 10
          marquee.style.animationDuration = `${speed}s`
        }
      },
    })
  }, { scope: sectionRef })

  const marqueeText = "LET'S BUILD TOGETHER \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"
  const repeatedText = marqueeText.repeat(8)

  return (
    <section ref={sectionRef} id="contact" className="py-24 md:py-32 overflow-hidden relative">
      {/* Marquee */}
      <div className="marquee-container relative">
        <div className="overflow-hidden">
          <div className="marquee-inner animate-marquee whitespace-nowrap flex">
            <span className="text-[80px] md:text-[120px] lg:text-[160px] font-light text-white tracking-[-0.02em] leading-none">
              {repeatedText}
            </span>
            <span className="text-[80px] md:text-[120px] lg:text-[160px] font-light text-white tracking-[-0.02em] leading-none">
              {repeatedText}
            </span>
          </div>
        </div>

        {/* Center Rotating Badge */}
        <div 
          ref={badgeRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div className="relative w-28 h-28 md:w-36 md:h-36 cursor-pointer hover:scale-110 transition-transform duration-500">
            {/* Rotating Text Circle */}
            <div className="animate-spin-slow absolute inset-0">
              <svg viewBox="0 0 140 140" className="w-full h-full">
                <defs>
                  <path
                    id="circlePath"
                    d="M 70, 70 m -55, 0 a 55,55 0 1,1 110,0 a 55,55 0 1,1 -110,0"
                  />
                </defs>
                <text className="fill-white text-[11px] font-mono tracking-[0.15em] uppercase">
                  <textPath href="#circlePath">
                    GOT A PROJECT? &bull; CONTACT US &bull;&nbsp;
                  </textPath>
                </text>
              </svg>
            </div>
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg 
                viewBox="0 0 24 24" 
                className="w-10 h-10 md:w-12 md:h-12 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11" 
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
