import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AnimatedTextProps {
  children: string;
  className?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  type?: 'chars' | 'words' | 'lines';
  stagger?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  scrollTrigger?: boolean;
  y?: number;
  rotateX?: number;
}

export function AnimatedText({
  children,
  className = '',
  tag: Tag = 'span',
  type = 'words',
  stagger = 0.04,
  duration = 0.6,
  delay = 0,
  ease = 'power3.out',
  scrollTrigger = true,
  y = 40,
  rotateX = -40,
}: AnimatedTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const elements =
        type === 'chars'
          ? containerRef.current.querySelectorAll('.anim-char')
          : containerRef.current.querySelectorAll('.anim-word');

      const animConfig: gsap.TweenVars = {
        opacity: 0,
        y,
        rotateX,
        duration,
        stagger,
        delay,
        ease,
      };

      if (scrollTrigger) {
        gsap.from(elements, {
          ...animConfig,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        });
      } else {
        gsap.from(elements, animConfig);
      }
    },
    { scope: containerRef }
  );

  const splitContent = () => {
    if (type === 'chars') {
      return children.split('').map((char, i) => (
        <span key={i} className="anim-char inline-block" style={{ transformStyle: 'preserve-3d' }}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ));
    }

    return children.split(' ').map((word, i) => (
      <span key={i} className="anim-word inline-block mr-[0.25em]" style={{ transformStyle: 'preserve-3d' }}>
        {word}
      </span>
    ));
  };

  return (
    <div ref={containerRef} style={{ perspective: '1000px' }}>
      <Tag className={className}>{splitContent()}</Tag>
    </div>
  );
}
