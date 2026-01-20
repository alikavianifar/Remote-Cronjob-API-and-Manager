import { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
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
    { label: 'Last day', value: 'L' },
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

export default function PeriodWizard({ initialExpression, onSelect, onClose }) {
    const [mode, setMode] = useState('presets'); // 'presets' or 'custom'
    const [expression, setExpression] = useState(initialExpression || '* * * * *');
    const [parts, setParts] = useState({
        minute: '*',
        hour: '*',
        day: '*',
        month: '*',
        weekday: '*'
    });
    const [humanReadable, setHumanReadable] = useState('');

    useEffect(() => {
        // Parse initial expression
        const exprParts = expression.split(' ');
        if (exprParts.length === 5) {
            setParts({
                minute: exprParts[0],
                hour: exprParts[1],
                day: exprParts[2],
                month: exprParts[3],
                weekday: exprParts[4]
            });
        }
    }, []);

    useEffect(() => {
        // Update expression when parts change
        const newExpr = `${parts.minute} ${parts.hour} ${parts.day} ${parts.month} ${parts.weekday}`;
        setExpression(newExpr);

        // Parse to human readable
        const parseExpr = async () => {
            try {
                const response = await utilAPI.parseCron(newExpr);
                if (response.success) {
                    setHumanReadable(response.data.human);
                }
            } catch {
                setHumanReadable('Custom schedule');
            }
        };
        parseExpr();
    }, [parts]);

    const handlePartChange = (part, value) => {
        setParts(prev => ({ ...prev, [part]: value }));
    };

    const handlePresetSelect = (preset) => {
        setExpression(preset.expression);
        const exprParts = preset.expression.split(' ');
        setParts({
            minute: exprParts[0],
            hour: exprParts[1],
            day: exprParts[2],
            month: exprParts[3],
            weekday: exprParts[4]
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal wizard-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <Clock size={20} />
                        Schedule Builder
                    </h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="wizard-tabs">
                        <button
                            className={`wizard-tab ${mode === 'presets' ? 'active' : ''}`}
                            onClick={() => setMode('presets')}
                        >
                            Quick Presets
                        </button>
                        <button
                            className={`wizard-tab ${mode === 'custom' ? 'active' : ''}`}
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
                            <div className="builder-row">
                                <label>Minute</label>
                                <select
                                    value={parts.minute}
                                    onChange={e => handlePartChange('minute', e.target.value)}
                                >
                                    {MINUTES.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="builder-row">
                                <label>Hour</label>
                                <select
                                    value={parts.hour}
                                    onChange={e => handlePartChange('hour', e.target.value)}
                                >
                                    {HOURS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="builder-row">
                                <label>Day of Month</label>
                                <select
                                    value={parts.day}
                                    onChange={e => handlePartChange('day', e.target.value)}
                                >
                                    {DAYS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="builder-row">
                                <label>Month</label>
                                <select
                                    value={parts.month}
                                    onChange={e => handlePartChange('month', e.target.value)}
                                >
                                    {MONTHS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="builder-row">
                                <label>Day of Week</label>
                                <select
                                    value={parts.weekday}
                                    onChange={e => handlePartChange('weekday', e.target.value)}
                                >
                                    {WEEKDAYS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="wizard-preview">
                        <div className="preview-expression">
                            <code>{expression}</code>
                        </div>
                        <div className="preview-human">
                            <Calendar size={16} />
                            <span>{humanReadable}</span>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={() => onSelect(expression)}>
                        Apply Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}
