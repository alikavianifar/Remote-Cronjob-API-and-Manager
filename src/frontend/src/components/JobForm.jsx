import { useState, useEffect } from 'react';
import { X, Wand2, Calendar } from 'lucide-react';
import PeriodWizard from './PeriodWizard';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { utilAPI } from '../services/api';
import './JobForm.css';

const noop = () => {};

export default function JobForm({ job, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: '',
        expression: '* * * * *',
        command: '',
        description: ''
    });
    const [preview, setPreview] = useState({ state: 'idle' });
    const [errors, setErrors] = useState({});
    const [showWizard, setShowWizard] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (job) {
            setFormData({
                name: job.name || '',
                expression: job.expression || '* * * * *',
                command: job.command || '',
                description: job.description || ''
            });
        }
    }, [job]);

    // Ask the server to describe the schedule, but only after typing pauses, and ignore stale answers.
    useEffect(() => {
        const expression = formData.expression.trim();
        if (!expression) {
            setPreview({ state: 'idle' });
            return undefined;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await utilAPI.parseCron(expression, controller.signal);
                setPreview({ state: 'ok', human: response.data.human, next: response.data.nextRuns[0] });
            } catch (err) {
                if (controller.signal.aborted) return;
                setPreview({ state: 'invalid', message: err.response?.data?.error || 'Invalid expression' });
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [formData.expression]);

    useEscapeKey(showWizard ? noop : onClose);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Job name is required';
        }

        if (!formData.expression.trim()) {
            newErrors.expression = 'Schedule expression is required';
        }

        if (!formData.command.trim()) {
            newErrors.command = 'Command is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setSaving(true);
        try {
            const result = await onSave({
                name: formData.name.trim(),
                expression: formData.expression.trim(),
                command: formData.command.trim(),
                description: formData.description
            });
            if (!result.success && result.details) {
                const newErrors = {};
                result.details.forEach((d) => {
                    newErrors[d.field] = d.message;
                });
                setErrors(newErrors);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleWizardSelect = (expression) => {
        handleChange('expression', expression);
        setShowWizard(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal job-form-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{job ? 'Edit Job' : 'Create New Job'}</h2>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label" htmlFor="job-name">Job Name *</label>
                            <input
                                id="job-name"
                                type="text"
                                autoFocus
                                maxLength={100}
                                value={formData.name}
                                onChange={e => handleChange('name', e.target.value)}
                                placeholder="e.g., Backup Database"
                            />
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="job-command">Command *</label>
                            <input
                                id="job-command"
                                type="text"
                                maxLength={2000}
                                value={formData.command}
                                onChange={e => handleChange('command', e.target.value)}
                                placeholder="e.g., /opt/scripts/backup.sh"
                                className="font-mono"
                            />
                            {errors.command && <span className="form-error">{errors.command}</span>}
                            <span className="form-hint">A single-line shell command, run with /bin/sh</span>
                        </div>

                        <div className="form-group">
                            <div className="form-label-row">
                                <label className="form-label" htmlFor="job-expression">Schedule *</label>
                                <button
                                    type="button"
                                    className="btn btn-ghost wizard-btn"
                                    onClick={() => setShowWizard(true)}
                                >
                                    <Wand2 size={16} />
                                    Use Wizard
                                </button>
                            </div>
                            <input
                                id="job-expression"
                                type="text"
                                value={formData.expression}
                                onChange={e => handleChange('expression', e.target.value)}
                                placeholder="* * * * *"
                                className="font-mono"
                            />
                            {errors.expression && <span className="form-error">{errors.expression}</span>}
                            {preview.state === 'ok' && (
                                <div className="expression-preview">
                                    <Calendar size={14} />
                                    <span>
                                        {preview.human}
                                        {preview.next && ` - next run ${new Date(preview.next).toLocaleString()}`}
                                    </span>
                                </div>
                            )}
                            {preview.state === 'invalid' && !errors.expression && (
                                <span className="form-error">{preview.message}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="job-description">Description</label>
                            <textarea
                                id="job-description"
                                maxLength={1000}
                                value={formData.description}
                                onChange={e => handleChange('description', e.target.value)}
                                placeholder="Optional description of what this job does"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <span className="loading-spinner" />
                                    Saving...
                                </>
                            ) : (
                                job ? 'Update Job' : 'Create Job'
                            )}
                        </button>
                    </div>
                </form>

                {showWizard && (
                    <PeriodWizard
                        initialExpression={formData.expression}
                        onSelect={handleWizardSelect}
                        onClose={() => setShowWizard(false)}
                    />
                )}
            </div>
        </div>
    );
}
