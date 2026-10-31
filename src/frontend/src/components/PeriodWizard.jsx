import { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { utilAPI } from '../services/api';
import './PeriodWizard.css';

const PRESETS = [
    { label: 'Every Minute', expression: '* * * * *' },
    { label: 'Every 5 Minutes', expression: '*/5 * * * *' },
    { label: 'Every 15 Minutes', expression: '*/15 * * * *' },
    { label: 'Every 30 Minutes', expression: '*/30 * * * *' },
    { label: 'Every Hour', expression: '0 * * * *' },
    { label: 'Every 6 Hours', expression: '0 */6 * * *' },
    { label: 'Daily at Midnight', expression: '0 0 * * *' },
    { label: 'Daily at 2 AM', expression: '0 2 * * *' },
    { label: 'Daily at Noon', expression: '0 12 * * *' },
    { label: 'Weekly (Sunday)', expression: '0 0 * * 0' },
    { label: 'Monthly (1st)', expression: '0 0 1 * *' },
    { label: 'Yearly (Jan 1st)', expression: '0 0 1 1 *' },
];

const MINUTES = [
    { label: 'Every minute', value: '*' },
    { label: 'Every 5 minutes', value: '*/5' },
    { label: 'Every 10 minutes', value: '*/10' },
    { label: 'Every 15 minutes', value: '*/15' },
    { label: 'Every 30 minutes', value: '*/30' },
    { label: 'At minute 0', value: '0' },
];

const HOURS = [
    { label: 'Every hour', value: '*' },
    { label: 'Every 2 hours', value: '*/2' },
    { label: 'Every 6 hours', value: '*/6' },
    { label: 'Every 12 hours', value: '*/12' },
    { label: 'Midnight (0)', value: '0' },
    { label: '2 AM', value: '2' },
    { label: '6 AM', value: '6' },
    { label: 'Noon (12)', value: '12' },
    { label: '6 PM', value: '18' },
];

const DAYS = [
    { label: 'Every day', value: '*' },
    { label: '1st of month', value: '1' },
    { label: '15th of month', value: '15' },
    { label: '28th of month', value: '28' },
];

const MONTHS = [
    { label: 'Every month', value: '*' },
    { label: 'January', value: '1' },
    { label: 'Quarterly', value: '1,4,7,10' },
    { label: 'Half-yearly', value: '1,7' },
];

const WEEKDAYS = [
    { label: 'Every day', value: '*' },
    { label: 'Weekdays', value: '1-5' },
    { label: 'Weekend', value: '0,6' },
    { label: 'Monday', value: '1' },
    { label: 'Friday', value: '5' },
    { label: 'Sunday', value: '0' },
];

const PART_NAMES = ['minute', 'hour', 'day', 'month', 'weekday'];

function splitExpression(expression) {
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 5) return null;
    return Object.fromEntries(PART_NAMES.map((name, i) => [name, fields[i]]));
}

const joinParts = (parts) => PART_NAMES.map((name) => parts[name]).join(' ');

/** A select only shows values it has options for, so unknown values (typed by hand) get their own option. */
function withCurrent(options, current) {
    return options.some((o) => o.value === current) ? options : [{ label: `Current (${current})`, value: current }, ...options];
}

function PartSelect({ label, options, value, onChange }) {
    const id = `wizard-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
        <div className="builder-row">
            <label htmlFor={id}>{label}</label>
            <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
                {withCurrent(options, value).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function PeriodWizard({ initialExpression, onSelect, onClose }) {
    const [mode, setMode] = useState('presets'); // 'presets' or 'custom'
    const [parts, setParts] = useState(() => splitExpression(initialExpression || '') || splitExpression('* * * * *'));
    const [preview, setPreview] = useState({ human: '', valid: true });

    const expression = joinParts(parts);

    useEscapeKey(onClose);

    // Describe the current expression; debounced, and stale answers are discarded.
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await utilAPI.parseCron(expression, controller.signal);
                setPreview({ human: response.data.human, valid: true });
            } catch (err) {
                if (controller.signal.aborted) return;
                setPreview({ human: err.response?.data?.error || 'Invalid schedule', valid: false });
            }
        }, 200);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [expression]);

    const handlePartChange = (part, value) => setParts((prev) => ({ ...prev, [part]: value }));

    const handlePresetSelect = (preset) => setParts(splitExpression(preset.expression));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal wizard-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <Clock size={20} />
                        Schedule Builder
                    </h2>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="wizard-tabs">
                        <button
                            className={`wizard-tab ${mode === 'presets' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setMode('presets')}
                        >
                            Quick Presets
                        </button>
                        <button
                            className={`wizard-tab ${mode === 'custom' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setMode('custom')}
                        >
                            Custom Builder
                        </button>
                    </div>

                    {mode === 'presets' ? (
                        <div className="presets-grid">
                            {PRESETS.map((preset, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={`preset-btn ${expression === preset.expression ? 'active' : ''}`}
                                    onClick={() => handlePresetSelect(preset)}
                                >
                                    <span className="preset-label">{preset.label}</span>
                                    <code className="preset-expr">{preset.expression}</code>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="custom-builder">
                            <PartSelect label="Minute" options={MINUTES} value={parts.minute} onChange={(v) => handlePartChange('minute', v)} />
                            <PartSelect label="Hour" options={HOURS} value={parts.hour} onChange={(v) => handlePartChange('hour', v)} />
                            <PartSelect label="Day of Month" options={DAYS} value={parts.day} onChange={(v) => handlePartChange('day', v)} />
                            <PartSelect label="Month" options={MONTHS} value={parts.month} onChange={(v) => handlePartChange('month', v)} />
                            <PartSelect label="Day of Week" options={WEEKDAYS} value={parts.weekday} onChange={(v) => handlePartChange('weekday', v)} />
                        </div>
                    )}

                    <div className="wizard-preview">
                        <div className="preview-expression">
                            <code>{expression}</code>
                        </div>
                        <div className="preview-human">
                            <Calendar size={16} />
                            <span className={preview.valid ? '' : 'text-error'}>{preview.human}</span>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => onSelect(expression)} disabled={!preview.valid}>
                        Apply Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}
