import { useMemo, useState } from 'react';
import {
  buildRecurringAvailabilityPreview,
  createDefaultRecurringAvailabilityRule,
} from '../utils/recurringAvailability.js';

const weekdayOptions = [
  { value: 1, label: '월' }, { value: 2, label: '화' }, { value: 3, label: '수' },
  { value: 4, label: '목' }, { value: 5, label: '금' }, { value: 6, label: '토' },
  { value: 0, label: '일' },
];

export default function RecurringAvailabilityForm({
  counselorUid,
  existingAvailability = [],
  appointments = [],
  onSave,
  onCancel,
  initialRule,
  now,
}) {
  const [rule, setRule] = useState(() => initialRule || createDefaultRecurringAvailabilityRule());
  const [excludedDate, setExcludedDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const preview = useMemo(() => buildRecurringAvailabilityPreview({
    rule, counselorUid, existingAvailability, appointments, now: now || new Date(),
  }), [rule, counselorUid, existingAvailability, appointments, now]);
  const update = (key, value) => { setRule(current => ({ ...current, [key]: value })); setSaveError(''); };
  const toggleWeekday = value => update('weekdays', rule.weekdays.includes(value)
    ? rule.weekdays.filter(day => day !== value)
    : [...rule.weekdays, value]);
  const updateExclusion = (index, key, value) => update('exclusions', rule.exclusions.map((item, itemIndex) => (
    itemIndex === index ? { ...item, [key]: value } : item
  )));
  const addExcludedDate = () => {
    if (!excludedDate || rule.excludedDates.includes(excludedDate)) return;
    update('excludedDates', [...rule.excludedDates, excludedDate].sort());
    setExcludedDate('');
  };
  const submit = async event => {
    event.preventDefault();
    if (preview.error || saving) { setSaveError(preview.error); return; }
    setSaving(true);
    setSaveError('');
    try { await onSave?.(preview.slots, { rule, summary: preview.summary }); }
    catch (error) { setSaveError(error?.message || '상담 가능 시간을 저장하지 못했습니다.'); }
    finally { setSaving(false); }
  };

  return <form className="recurring-availability-form" onSubmit={submit}>
    <header>
      <div><span className="eyebrow">주간 반복 설정</span><h3>반복 상담 가능 시간 등록</h3></div>
      <p>최대 12주 동안 선택한 요일에 1시간 단위 상담 시간을 만듭니다.</p>
    </header>
    <div className="recurring-period-fields">
      <label>시작일<input type="date" value={rule.startDate} onChange={event => update('startDate', event.target.value)} required /></label>
      <label>종료일<input type="date" value={rule.endDate} onChange={event => update('endDate', event.target.value)} required /></label>
    </div>
    <fieldset><legend>반복 요일</legend><div className="recurring-weekdays">{weekdayOptions.map(option => <button
      key={option.value} type="button" className={rule.weekdays.includes(option.value) ? 'selected' : ''}
      aria-pressed={rule.weekdays.includes(option.value)} onClick={() => toggleWeekday(option.value)}
    >{option.label}</button>)}</div></fieldset>
    <div className="recurring-time-fields">
      <label>시작 시간<input type="time" step="3600" value={rule.startTime} onChange={event => update('startTime', event.target.value)} required /></label>
      <label>종료 시간<input type="time" step="3600" value={rule.endTime} onChange={event => update('endTime', event.target.value)} required /></label>
      <label>상담 장소<input value={rule.location} onChange={event => update('location', event.target.value)} required /></label>
    </div>
    <fieldset><legend>제외 시간</legend>{rule.exclusions.map((item, index) => <div className="recurring-exclusion-row" key={`${index}-${item.startTime}`}>
      <input aria-label={`제외 시간 ${index + 1} 시작`} type="time" value={item.startTime} onChange={event => updateExclusion(index, 'startTime', event.target.value)} />
      <span>부터</span><input aria-label={`제외 시간 ${index + 1} 종료`} type="time" value={item.endTime} onChange={event => updateExclusion(index, 'endTime', event.target.value)} />
      <button type="button" className="text-button danger" onClick={() => update('exclusions', rule.exclusions.filter((_, itemIndex) => itemIndex !== index))}>삭제</button>
    </div>)}<button type="button" className="button secondary small" onClick={() => update('exclusions', [...rule.exclusions, { startTime: '12:00', endTime: '13:00' }])}>제외 시간 추가</button></fieldset>
    <fieldset><legend>제외 날짜</legend><div className="recurring-excluded-date-input"><input type="date" value={excludedDate} min={rule.startDate} max={rule.endDate} onChange={event => setExcludedDate(event.target.value)} /><button type="button" className="button secondary small" onClick={addExcludedDate}>날짜 제외</button></div>
      {rule.excludedDates.length > 0 && <ul className="recurring-excluded-dates">{rule.excludedDates.map(date => <li key={date}><span>{date}</span><button type="button" aria-label={`${date} 제외 취소`} onClick={() => update('excludedDates', rule.excludedDates.filter(item => item !== date))}>×</button></li>)}</ul>}
    </fieldset>
    <section className="recurring-preview" aria-live="polite"><strong>생성 미리보기</strong><dl>
      <div><dt>적용 날짜</dt><dd>{preview.summary.matchingDates}일</dd></div>
      <div><dt>등록 예정</dt><dd>{preview.summary.generated}개</dd></div>
      <div><dt>제외 시간</dt><dd>{preview.summary.excludedTimes}개</dd></div>
      <div><dt>24시간 이내</dt><dd>{preview.summary.tooSoon}개</dd></div>
      <div><dt>기존 일정 충돌</dt><dd>{preview.summary.conflicts}개</dd></div>
    </dl>{preview.summary.excludedDates > 0 && <small>직접 제외한 날짜 {preview.summary.excludedDates}일은 생성하지 않습니다.</small>}</section>
    {(saveError || preview.error) && <p className="form-error" role="alert">{saveError || preview.error}</p>}
    <div className="modal-actions">{onCancel && <button type="button" className="button secondary" onClick={onCancel}>취소</button>}<button className="button primary" disabled={saving || Boolean(preview.error)}>{saving ? '등록 중...' : `${preview.summary.generated}개 시간 등록`}</button></div>
  </form>;
}
