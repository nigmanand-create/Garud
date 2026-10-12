'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { fetchCart } from '@/lib/api/cart';

export function CartNavLink({ className }: { className?: string }) {
  const { user, loading } = useAuth();
  const [count, setCount] = useState(0);

  const isBuyer = user?.role === 'BUYER' || user?.role === 'GOVERNMENT';

  useEffect(() => {
    if (loading || !isBuyer) {
      setCount(0);
      return;
    }
    fetchCart()
      .then((c) => setCount(c.itemCount))
      .catch(() => setCount(0));
  }, [loading, isBuyer, user?.id]);

  if (!isBuyer) return null;

  return (
    <Link href="/buyer/cart" className={className ?? 'header-auth-link platform-cart-nav'}>
      <i className="bi bi-cart3" aria-hidden />
      Cart
      {count > 0 && (
        <span className="platform-cart-badge" aria-label={`${count} items in cart`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
