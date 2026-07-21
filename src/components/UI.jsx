import Icon from './Icon';

export const statusMeta = {
  consultation: {
    scheduled: { label: '상담 예정', icon: 'calendar' },
    inProgress: { label: '상담 진행 중', icon: 'clock' },
    writing: { label: '기록 작성 필요', icon: 'note' },
    complete: { label: '상담 완료', icon: 'check' },
  },
  followUp: {
    scheduled: { label: '예정', icon: 'calendar' },
    inProgress: { label: '진행 중', icon: 'clock' },
    complete: { label: '완료', icon: 'check' },
    overdue: { label: '기한 초과', icon: 'alert' },
  },
};

export function StatusBadge({ status, context = 'consultation' }) {
  const contextMeta = statusMeta[context] || statusMeta.consultation;
  const meta = contextMeta[status] || contextMeta.scheduled;
  return <span className={`badge badge-${status}`}><Icon name={meta.icon} size={14} />{meta.label}</span>;
}

export function EmptyState({ icon = 'search', title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={26} /></span><strong>{title}</strong>{description && <p>{description}</p>}{action}</div>;
}

export function SectionHeader({ eyebrow, title, description, action }) {
  return <div className="section-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

export function PageIntro({ eyebrow, title, description, action }) {
  return <div className="page-intro"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function IconButton({ label, icon, className = '', ...props }) {
  return <button className={`icon-button ${className}`.trim()} aria-label={label} title={label} {...props}><Icon name={icon} /></button>;
}
