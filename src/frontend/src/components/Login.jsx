import { useState } from 'react';
import { Clock, User, Lock, AlertCircle } from 'lucide-react';
import { authAPI, errorMessage } from '../services/api';
import './Login.css';

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.login(username, password);
            if (response.success) {
                onLogin(response.token, response.user);
            } else {
                setError(response.error || 'Login failed');
            }
        } catch (err) {
            setError(errorMessage(err, 'Login failed. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <Clock size={40} />
                    </div>
                    <h1>CronManager</h1>
                    <p>Remote Cronjob API & Manager</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error" role="alert">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="username">Username</label>
                        <div className="input-with-icon">
                            <User size={18} />
                            <input
                                id="username"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter username"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <div className="input-with-icon">
                            <Lock size={18} />
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary login-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="loading-spinner" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {import.meta.env.DEV && (
                    <div className="login-footer">
                        <p>
                            Development default: <code>admin</code> / <code>admin123</code> (when ADMIN_PASSWORD is not set)
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
