import { useState, useEffect } from 'react';
import { X, Wand2, Calendar } from 'lucide-react';
import PeriodWizard from './PeriodWizard';
import { utilAPI } from '../services/api';
import './JobForm.css';

export default function JobForm({ job, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: '',
        expression: '* * * * *',
        command: '',
        description: ''
    });
    const [expressionHuman, setExpressionHuman] = useState('');
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

    useEffect(() => {
        // Parse expression when it changes
        const parseExpression = async () => {
            try {
                const response = await utilAPI.parseCron(formData.expression);
                if (response.success) {
                    setExpressionHuman(response.data.human);
                }
            } catch {
                setExpressionHuman('Invalid expression');
            }
        };

        if (formData.expression) {
            parseExpression();
        }
    }, [formData.expression]);

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
            const result = await onSave(formData);
            if (!result.success) {
                if (result.details) {
                    const newErrors = {};
                    result.details.forEach(d => {
                        newErrors[d.field] = d.message;
                    });
                    setErrors(newErrors);
                }
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
            <div className="modal job-form-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{job ? 'Edit Job' : 'Create New Job'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Job Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => handleChange('name', e.target.value)}
                                placeholder="e.g., Backup Database"
                            />
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Command *</label>
                            <input
                                type="text"
                                value={formData.command}
                                onChange={e => handleChange('command', e.target.value)}
                                placeholder="e.g., /opt/scripts/backup.sh"
                                className="font-mono"
                            />
                            {errors.command && <span className="form-error">{errors.command}</span>}
                            <span className="form-hint">The shell command to execute</span>
                        </div>

                        <div className="form-group">
                            <div className="form-label-row">
                                <label className="form-label">Schedule *</label>
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
                                type="text"
                                value={formData.expression}
                                onChange={e => handleChange('expression', e.target.value)}
                                placeholder="* * * * *"
                                className="font-mono"
                            />
                            {errors.expression && <span className="form-error">{errors.expression}</span>}
                            {expressionHuman && (
                                <div className="expression-preview">
                                    <Calendar size={14} />
                                    <span>{expressionHuman}</span>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
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
