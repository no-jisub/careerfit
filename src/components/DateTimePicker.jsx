import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { toDateKey } from '../utils/date.js';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function getMonthStart(value) {
  const parsed = parseDateKey(value) || new Date();
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

function getCalendarDays(month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      value: toDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function usePickerPopover(open, onClose, preferredWidth, preferredHeight) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ left: 12, top: 12, width: preferredWidth, maxHeight: preferredHeight });

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const edge = 12;
      const gap = 8;
      const width = Math.min(preferredWidth, window.innerWidth - edge * 2);
      const left = clamp(rect.left, edge, window.innerWidth - width - edge);
      const below = window.innerHeight - rect.bottom - gap - edge;
      const above = rect.top - gap - edge;
      const placeAbove = below < Math.min(preferredHeight, 260) && above > below;
      const maxHeight = Math.max(210, Math.min(preferredHeight, placeAbove ? above : below));
      setPosition(placeAbove
        ? { left, bottom: window.innerHeight - rect.top + gap, width, maxHeight }
        : { left, top: rect.bottom + gap, width, maxHeight });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, preferredHeight, preferredWidth]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = event => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) onClose();
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        onClose();
        triggerRef.current?.querySelector('input')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, onClose]);

  return { triggerRef, panelRef, position };
}

function PickerField({ value, placeholder, ariaLabel, required, disabled, open, onToggle, icon }) {
  return <div className={`ui-picker-field ${open ? 'open' : ''}`}>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={open}
      required={required}
      readOnly
      disabled={disabled}
      onClick={onToggle}
      onKeyDown={event => {
        if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          onToggle();
        }
      }}
    />
    <Icon name={icon} size={17} />
  </div>;
}

export function DatePicker({
  value = '',
  onChange,
  min = '',
  max = '',
  required = false,
  disabled = false,
  ariaLabel = '날짜 선택',
  placeholder = '날짜 선택',
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => getMonthStart(value || min));
  const close = () => setOpen(false);
  const { triggerRef, panelRef, position } = usePickerPopover(open, close, 330, 390);
  const days = useMemo(() => getCalendarDays(month), [month]);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (open) setMonth(getMonthStart(value || min));
  }, [open, value, min]);

  const selectDate = nextValue => {
    onChange?.(nextValue);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.querySelector('input')?.focus());
  };

  const panel = open && <div
    ref={panelRef}
    className="ui-picker-popover ui-date-picker"
    style={position}
    role="dialog"
    aria-label={`${ariaLabel} 달력`}
  >
    <div className="ui-picker-toolbar">
      <button type="button" aria-label="이전 달" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><Icon name="chevron" size={17} /></button>
      <strong>{month.getFullYear()}년 {month.getMonth() + 1}월</strong>
      <button type="button" aria-label="다음 달" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><Icon name="chevron" size={17} /></button>
    </div>
    <div className="ui-date-weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
    <div className="ui-date-grid">
      {days.map(day => {
        const unavailable = Boolean((min && day.value < min) || (max && day.value > max));
        const today = day.value === toDateKey();
        return <button
          type="button"
          key={day.value}
          className={`${day.inMonth ? '' : 'outside'} ${day.value === value ? 'selected' : ''} ${today ? 'today' : ''}`.trim()}
          disabled={unavailable}
          aria-label={day.value}
          aria-pressed={day.value === value}
          onClick={() => selectDate(day.value)}
        >{day.day}</button>;
      })}
    </div>
    <div className="ui-picker-footer">
      <button type="button" className="text-button" disabled={(min && toDateKey() < min) || (max && toDateKey() > max)} onClick={() => selectDate(toDateKey())}>오늘</button>
      {!required && value && <button type="button" className="text-button muted" onClick={() => selectDate('')}>선택 해제</button>}
      <span>{monthKey}</span>
    </div>
  </div>;

  return <div className="ui-picker" ref={triggerRef}>
    <PickerField value={value} placeholder={placeholder} ariaLabel={ariaLabel} required={required} disabled={disabled} open={open} onToggle={() => !disabled && setOpen(current => !current)} icon="calendar" />
    {panel && createPortal(panel, document.body)}
  </div>;
}

function buildTimeOptions(step) {
  const interval = Math.max(5, Number(step) / 60 || 30);
  const options = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += interval) {
    options.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }
  return options;
}

function formatTime(value) {
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour % 12 || 12;
  return `${period} ${String(displayHour).padStart(2, '0')}:${minute}`;
}

export function TimePicker({
  value = '',
  onChange,
  step = 1800,
  required = false,
  disabled = false,
  ariaLabel = '시간 선택',
  placeholder = '시간 선택',
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { triggerRef, panelRef, position } = usePickerPopover(open, close, 310, 350);
  const options = useMemo(() => {
    const items = buildTimeOptions(step);
    return value && !items.includes(value) ? [...items, value].sort() : items;
  }, [step, value]);
  const stepLabel = `${Math.max(5, Number(step) / 60 || 30)}분 단위`;

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => panelRef.current?.querySelector('.ui-time-options button.selected')?.scrollIntoView({ block: 'center' }));
  }, [open, panelRef, value]);

  const selectTime = nextValue => {
    onChange?.(nextValue);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.querySelector('input')?.focus());
  };

  const panel = open && <div
    ref={panelRef}
    className="ui-picker-popover ui-time-picker"
    style={position}
    role="dialog"
    aria-label={`${ariaLabel} 목록`}
  >
    <div className="ui-time-picker-heading"><Icon name="clock" size={17} /><strong>{ariaLabel}</strong><span>{stepLabel}</span></div>
    <div className="ui-time-options">
      {options.map(option => <button
        type="button"
        key={option}
        className={option === value ? 'selected' : ''}
        aria-pressed={option === value}
        onClick={() => selectTime(option)}
      ><small>{Number(option.slice(0, 2)) < 12 ? '오전' : '오후'}</small><span>{formatTime(option).replace(/^(오전|오후) /, '')}</span></button>)}
    </div>
    {!required && value && <div className="ui-picker-footer"><button type="button" className="text-button muted" onClick={() => selectTime('')}>선택 해제</button></div>}
  </div>;

  return <div className="ui-picker" ref={triggerRef}>
    <PickerField value={value ? formatTime(value) : ''} placeholder={placeholder} ariaLabel={ariaLabel} required={required} disabled={disabled} open={open} onToggle={() => !disabled && setOpen(current => !current)} icon="clock" />
    {panel && createPortal(panel, document.body)}
  </div>;
}
