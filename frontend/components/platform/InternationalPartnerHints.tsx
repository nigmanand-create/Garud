import Link from 'next/link';
import {
  getInternationalPartnerHints,
  type InternationalHintContext,
} from '@/lib/platform/international-hints';

export function InternationalPartnerHints(props: InternationalHintContext) {
  const hints = getInternationalPartnerHints(props);
  if (!hints) return null;

  return (
    <aside className="platform-intl-hints" aria-label="International partner guidance">
      <p className="platform-intl-hints__title">{hints.title}</p>
      <ul className="platform-intl-hints__list">
        {hints.items.map((item) => (
          <li key={item.text}>
            {item.text}{' '}
            {item.href && (
              <Link href={item.href}>{item.linkLabel ?? 'Learn more'}</Link>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
