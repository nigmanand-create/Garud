'use client';

import { useEffect, useRef } from 'react';

export type SectionTabItem<T extends string> = {
  id: T;
  label: string;
};

type SectionTabsProps<T extends string> = {
  items: SectionTabItem<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  ariaLabel: string;
  labelledBy?: string;
  scrollActiveIntoView?: boolean;
};

export function SectionTabs<T extends string>({
  items,
  activeId,
  onSelect,
  ariaLabel,
  labelledBy,
  scrollActiveIntoView = true,
}: SectionTabsProps<T>) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!scrollActiveIntoView || !navRef.current) return;
    const nav = navRef.current;
    const activeBtn = nav.querySelector<HTMLButtonElement>(
      `[data-section-tab="${activeId}"]`,
    );
    if (!activeBtn) return;
    // Scroll only the tab row horizontally — avoid scrollIntoView (moves the whole page).
    const targetLeft =
      activeBtn.offsetLeft - nav.clientWidth / 2 + activeBtn.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeId, scrollActiveIntoView]);

  return (
    <nav
      ref={navRef}
      className="platform-section-tabs"
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            data-section-tab={item.id}
            className={`platform-section-tab${isActive ? ' platform-section-tab--active' : ''}`}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
