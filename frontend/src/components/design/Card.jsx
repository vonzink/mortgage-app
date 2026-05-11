import React from 'react';

/** Design-system card. `pad` adds the standard 22px padding. */
export function Card({ pad = false, className = '', children, style, ...rest }) {
  const cls = ['card', pad && 'card-pad', className].filter(Boolean).join(' ');
  return <div className={cls} style={style} {...rest}>{children}</div>;
}

/** Card header — title left, actions right, bottom border. */
export function CardHeader({ title, icon, actions, className = '' }) {
  return (
    <div className={`card-header ${className}`.trim()}>
      <div className="card-title">
        {icon}
        <span>{title}</span>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}

export default Card;
