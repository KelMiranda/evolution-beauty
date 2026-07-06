import { useRef, useCallback } from 'react';
import gsap from 'gsap';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}

export function MagneticButton({
  children,
  className = '',
  strength = 0.3,
  onClick,
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const boundingRef = useRef<DOMRect | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!btnRef.current || !boundingRef.current) return;
      const { clientX, clientY } = e;
      const { left, top, width, height } = boundingRef.current;
      const x = (clientX - left - width / 2) * strength;
      const y = (clientY - top - height / 2) * strength;
      gsap.to(btnRef.current, { x, y, duration: 0.4, ease: 'power2.out' });
    },
    [strength]
  );

  const handleMouseEnter = useCallback(() => {
    if (!btnRef.current) return;
    boundingRef.current = btnRef.current.getBoundingClientRect();
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </button>
  );
}
