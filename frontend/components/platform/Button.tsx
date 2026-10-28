import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'cta' | 'danger' | 'link';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'platform-btn',
  secondary: 'platform-btn platform-btn-secondary',
  cta: 'platform-btn platform-btn-cta',
  danger: 'platform-btn platform-btn-danger',
  link: 'platform-link-btn',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  size?: 'sm' | 'default';
};

export function buttonClassName(
  variant: ButtonVariant = 'primary',
  options?: { fullWidth?: boolean; size?: 'sm' | 'default'; className?: string },
): string {
  return [
    VARIANT_CLASS[variant],
    options?.fullWidth ? 'platform-btn-full' : '',
    options?.size === 'sm' ? 'platform-btn-sm' : '',
    options?.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Thin wrapper around `platform-btn*` patterns. */
export function Button({
  variant = 'primary',
  fullWidth,
  size = 'default',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, { fullWidth, size, className })}
      {...props}
    />
  );
}
