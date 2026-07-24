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

export function PageIntro({ eyebrow, title, description, action, icon }) {
  return <div className="page-intro"><div className="page-intro-heading">{icon && <span className="page-intro-icon"><Icon name={icon} size={21} /></span>}<div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div></div>{action}</div>;
}

export function StatusTabs({ label, options, value, onChange, className = '' }) {
  const moveFocus = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = options.findIndex(option => option.value === value);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    const nextValue = options[nextIndex].value;
    onChange(nextValue);
    event.currentTarget.parentElement.querySelector(`[data-tab-value="${nextValue}"]`)?.focus();
  };

  return <div className={`workflow-status-tabs ${className}`.trim()} role="tablist" aria-label={label}>
    {options.map(option => <button
      type="button"
      role="tab"
      aria-selected={value === option.value}
      tabIndex={value === option.value ? 0 : -1}
      data-tab-value={option.value}
      className={value === option.value ? 'active' : ''}
      key={option.value}
      onClick={() => onChange(option.value)}
      onKeyDown={moveFocus}
    >
      <span className="workflow-status-tab-icon"><Icon name={option.icon} size={18} /></span>
      <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
      <em>{option.count}</em>
    </button>)}
  </div>;
}

export function IconButton({ label, icon, className = '', ...props }) {
  return <button className={`icon-button ${className}`.trim()} aria-label={label} title={label} {...props}><Icon name={icon} /></button>;
}
