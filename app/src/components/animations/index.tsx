import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  distance?: number
  duration?: number
  scrollTrigger?: boolean
  scale?: number
}

export function FadeIn({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  distance = 30,
  duration = 0.6,
  scrollTrigger = true,
  scale,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null)

  const dirMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { y: 0, x: distance },
    right: { y: 0, x: -distance },
    none: { y: 0, x: 0 },
  }

  useGSAP(() => {
    if (!ref.current) return
    const { x, y } = dirMap[direction]

    const fromVars: gsap.TweenVars = {
      opacity: 0,
      x,
      y,
      duration,
      delay,
      ease: 'power3.out',
    }

    if (scale !== undefined) {
      fromVars.scale = scale
    }

    const tweenVars: gsap.TweenVars = {
      opacity: 1,
      x: 0,
      y: 0,
      scale: scale !== undefined ? 1 : undefined,
      duration,
      delay,
      ease: 'power3.out',
    }

    if (scrollTrigger) {
      tweenVars.scrollTrigger = {
        trigger: ref.current,
        start: 'top 85%',
      }
    }

    gsap.from(ref.current, fromVars)
    gsap.to(ref.current, tweenVars)
  }, { scope: ref })

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

interface AnimatedTextProps {
  children: string
  className?: string
  type?: 'words' | 'chars' | 'lines'
  stagger?: number
  scrollTrigger?: boolean
}

export function AnimatedText({
  children,
  className = '',
  type = 'words',
  stagger = 0.05,
  scrollTrigger = true,
}: AnimatedTextProps) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!ref.current) return

    let elements: HTMLElement[]
    if (type === 'words') {
      const words = ref.current.textContent?.split(' ') || []
      ref.current.innerHTML = words
        .map((w) => `<span class="inline-block overflow-hidden"><span class="inline-block">${w}</span></span>`)
        .join(' ')
      elements = ref.current.querySelectorAll('.inline-block:not(.overflow-hidden)')
    } else if (type === 'chars') {
      const text = ref.current.textContent || ''
      ref.current.innerHTML = text
        .split('')
        .map((c) => `<span class="inline-block">${c === ' ' ? '&nbsp;' : c}</span>`)
        .join('')
      elements = ref.current.querySelectorAll('.inline-block')
    } else {
      elements = Array.from(ref.current.children) as HTMLElement[]
    }

    gsap.from(elements, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger,
      ease: 'power3.out',
      scrollTrigger: scrollTrigger
        ? { trigger: ref.current, start: 'top 85%' }
        : undefined,
    })
  }, { scope: ref })

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

interface CountUpProps {
  end: number
  duration?: number
  delay?: number
  suffix?: string
  prefix?: string
}

export function CountUp({ end, duration = 2, delay = 0, suffix = '', prefix = '' }: CountUpProps) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const start = 0
    const change = end - start
    const startTime = performance.now() + delay * 1000

    function update(currentTime: number) {
      if (currentTime < startTime) {
        requestAnimationFrame(update)
        return
      }
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + change * easeProgress)
      setCount(current)
      if (progress < 1) {
        requestAnimationFrame(update)
      }
    }

    requestAnimationFrame(update)
  }, [end, duration, delay])

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  )
}

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!ref.current) return
    gsap.from(ref.current, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      ease: 'power3.out',
    })
  }, { scope: ref })

  return (
    <div ref={ref}>
      {children}
    </div>
  )
}

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  strength?: number
  onClick?: () => void
}

export function MagneticButton({ children, className = '', strength = 0.3, onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const button = ref.current
    if (!button) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const deltaX = (e.clientX - centerX) * strength
      const deltaY = (e.clientY - centerY) * strength

      gsap.to(button, {
        x: deltaX,
        y: deltaY,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
      })
    }

    button.addEventListener('mousemove', handleMouseMove)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mousemove', handleMouseMove)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [strength])

  return (
    <button ref={ref} className={className} onClick={onClick}>
      {children}
    </button>
  )
}
