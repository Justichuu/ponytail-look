import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameDay } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const DatePickerConfigContext = createContext(null);

const DEFAULT_CONFIG = {
  dateFormat: 'Y-m-d',
  enableTime: false,
  time_24hr: true,
  weekStartsOn: 1,
  minDate: null,
  maxDate: null,
  defaultHour: 0,
  defaultMinute: 0,
  allowInput: true,
  clickOpens: true,
  animate: true,
  static: false,
  position: 'auto',
  monthSelectorType: 'dropdown',
  showMonths: 1,
  disableMobile: true,
  locale: {
    firstDayOfWeek: 1,
    weekdays: { shorthand: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] },
  },
};

export function DatePickerProvider({ children, timezone = 'UTC', locale = 'en-US', theme = 'light' }) {
  const value = useMemo(
    () => ({ timezone, locale, theme, overrides: {} }),
    [timezone, locale, theme],
  );
  return (
    <DatePickerConfigContext.Provider value={value}>
      {children}
    </DatePickerConfigContext.Provider>
  );
}

function useDatePickerConfig() {
  const ctx = useContext(DatePickerConfigContext);
  if (!ctx) {
    throw new Error('useDatePickerConfig must be used inside DatePickerProvider');
  }
  return ctx;
}

function toZoned(date, timezone) {
  if (!date) return null;
  return utcToZonedTime(date instanceof Date ? date : parseISO(String(date)), timezone);
}

function fromZoned(date, timezone) {
  if (!date) return null;
  return zonedTimeToUtc(date, timezone);
}

function CalendarGrid({ month, selected, onPick, weekStartsOn }) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const pad = (start.getDay() - weekStartsOn + 7) % 7;
  const cells = [...Array.from({ length: pad }, () => null), ...days];
  return (
    <div className="dp-grid" role="grid">
      {cells.map((day, i) => (
        <button
          key={day ? day.toISOString() : `empty-${i}`}
          type="button"
          role="gridcell"
          disabled={!day}
          aria-selected={day ? isSameDay(day, selected) : undefined}
          onClick={() => day && onPick(day)}
        >
          {day ? day.getDate() : ''}
        </button>
      ))}
    </div>
  );
}

function PickerPopover({ anchor, month, setMonth, selected, onPick, onClose, weekStartsOn }) {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  return createPortal(
    <div
      className="dp-popover"
      style={{ position: 'fixed', top: rect.bottom + 8, left: rect.left, zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="dp-nav">
        <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))}>Prev</button>
        <span>{format(month, 'MMMM yyyy')}</span>
        <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))}>Next</button>
      </div>
      <CalendarGrid month={month} selected={selected} onPick={onPick} weekStartsOn={weekStartsOn} />
      <button type="button" onClick={onClose}>Close</button>
    </div>,
    document.body,
  );
}

export function useDatePickerController(inputRef, { value, onChange, config }) {
  const instance = useRef(null);
  const { timezone } = useDatePickerConfig();

  useEffect(() => {
    if (!inputRef.current) return undefined;
    instance.current = flatpickr(inputRef.current, {
      ...DEFAULT_CONFIG,
      ...config,
      defaultDate: value ? toZoned(value, timezone) : undefined,
      onChange: (dates) => {
        const next = dates[0] ? fromZoned(dates[0], timezone) : null;
        onChange(next ? format(next, 'yyyy-MM-dd') : '');
      },
    });
    return () => {
      instance.current?.destroy();
      instance.current = null;
    };
  }, [config, inputRef, onChange, timezone, value]);

  return instance;
}

export function DatePickerField({
  name = 'date',
  label = 'Date',
  value,
  onChange,
  required = false,
  disabled = false,
  helperText,
  error,
  placeholder = 'Select a date',
  allowRange = false,
  showLegacyCalendar = true,
}) {
  const inputRef = useRef(null);
  const { timezone, locale, theme } = useDatePickerConfig();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value ? toZoned(value, timezone) : new Date()));
  const selected = value ? toZoned(value, timezone) : null;

  const config = useMemo(
    () => ({
      mode: allowRange ? 'range' : 'single',
      locale,
      disableMobile: true,
    }),
    [allowRange, locale],
  );

  useDatePickerController(inputRef, { value, onChange, config });

  const pick = useCallback((day) => {
    onChange(format(fromZoned(day, timezone), 'yyyy-MM-dd'));
    setOpen(false);
  }, [onChange, timezone]);

  return (
    <div className={`dp-field theme-${theme}`} data-tz={timezone}>
      <label htmlFor={name}>{label}{required ? ' *' : ''}</label>
      <input
        id={name}
        ref={inputRef}
        name={name}
        type="text"
        inputMode="none"
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={helperText ? `${name}-help` : undefined}
        onFocus={() => setOpen(true)}
        readOnly
      />
      {helperText ? <p id={`${name}-help`}>{helperText}</p> : null}
      {error ? <p className="dp-error">{error}</p> : null}
      {showLegacyCalendar && open ? (
        <PickerPopover
          anchor={inputRef.current}
          month={month}
          setMonth={setMonth}
          selected={selected}
          onPick={pick}
          onClose={() => setOpen(false)}
          weekStartsOn={DEFAULT_CONFIG.weekStartsOn}
        />
      ) : null}
    </div>
  );
}

export function DatePickerForm({ onSubmit, initialDate = '' }) {
  const [date, setDate] = useState(initialDate);
  const [rangeEnd, setRangeEnd] = useState('');
  return (
    <DatePickerProvider timezone={Intl.DateTimeFormat().resolvedOptions().timeZone} theme="light">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.({ date, rangeEnd });
        }}
      >
        <DatePickerField name="start" label="Start date" value={date} onChange={setDate} required />
        <DatePickerField name="end" label="End date" value={rangeEnd} onChange={setRangeEnd} allowRange />
        <button type="submit">Save</button>
      </form>
    </DatePickerProvider>
  );
}

export default DatePickerForm;
