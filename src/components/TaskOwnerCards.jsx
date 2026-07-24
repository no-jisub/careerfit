import Icon from './Icon';

export default function TaskOwnerCards({
  label,
  name,
  value,
  onChange,
  options,
  className = '',
}) {
  return <fieldset className={`task-owner-card-fieldset ${className}`.trim()}>
    <legend>{label}</legend>
    <div className="task-owner-card-grid">
      {options.map(option => {
        const selected = value === option.value;
        return <label className={`task-owner-card ${selected ? 'selected' : ''} ${option.tone || ''}`.trim()} key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={selected}
            onChange={() => onChange(option.value)}
          />
          <span className="task-owner-card-icon"><Icon name={option.icon} size={20} /></span>
          <span className="task-owner-card-copy">
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </span>
          {typeof option.count === 'number'
            ? <span className="task-owner-card-count"><strong>{option.count}</strong><small>건</small></span>
            : <span className="task-owner-card-check" aria-hidden="true">{selected && <Icon name="check" size={16} />}</span>}
        </label>;
      })}
    </div>
  </fieldset>;
}
