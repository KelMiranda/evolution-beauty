import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  scale?: number;
  stagger?: number;
  scrollTrigger?: boolean;
  start?: string;
}

export function FadeIn({
  children,
  className = '',
  delay = 0,
  duration = 0.7,
  direction = 'up',
  distance = 50,
  scale,
  stagger = 0,
  scrollTrigger = true,
  start = 'top 85%',
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  const dirMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { y: 0, x: distance },
    right: { y: 0, x: -distance },
    none: { y: 0, x: 0 },
  };

  const { x, y } = dirMap[direction];

  useGSAP(
    () => {
      if (!ref.current) return;
      const targets = stagger > 0 ? ref.current.querySelectorAll('.stagger-item') : [ref.current];

      const animConfig: gsap.TweenVars = {
        opacity: 0,
        x,
        y,
        duration,
        delay,
        ease: 'power3.out',
        ...(scale !== undefined && { scale }),
        ...(stagger > 0 && { stagger }),
      };

      if (scrollTrigger) {
        gsap.from(targets, {
          ...animConfig,
          scrollTrigger: {
            trigger: ref.current,
            start,
            toggleActions: 'play none none none',
          },
        });
      } else {
        gsap.from(targets, animConfig);
      }
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
