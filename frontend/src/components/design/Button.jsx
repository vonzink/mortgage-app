import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Design-system button. Renders as <button>, or <a>/<Link> when `to` or `href` is set.
 *
 * Variants: default | primary | ghost | danger
 * Sizes:    sm | md (default) | lg
 */
export default function Button({
  variant = 'default',
  size = 'md',
  to,
  href,
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'btn',
    variant === 'primary' && 'btn-primary',
    variant === 'ghost' && 'btn-ghost',
    variant === 'danger' && 'btn-danger',
    size === 'sm' && 'btn-sm',
    size === 'lg' && 'btn-lg',
    className,
  ].filter(Boolean).join(' ');

  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
  return <button className={cls} {...rest}>{children}</button>;
}
