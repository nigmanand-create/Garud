'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type StatStripRevealProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Adds a one-time scroll reveal when the stat strip enters the viewport
 * (respects prefers-reduced-motion via CSS).
 */
export function StatStripReveal({ children, className = '' }: StatStripRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`fw stat-strip platform-hero-fullbleed stat-strip--reveal${visible ? ' stat-strip--visible' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
