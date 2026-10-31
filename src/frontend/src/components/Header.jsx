import { Clock, User, LogOut, Activity, Settings } from 'lucide-react';
import './Header.css';

export default function Header({ user, onLogout, onTest }) {
    return (
        <header className="header">
            <div className="header-left">
                <div className="logo">
                    <Clock className="logo-icon" />
                    <span className="logo-text">CronManager</span>
                </div>
            </div>

            <div className="header-right">
                <button
                    className="btn btn-ghost header-btn"
                    onClick={onTest}
                    title="Run Self-Test"
                >
                    <Activity size={18} />
                    <span>Self-Test</span>
                </button>

                <div className="header-divider" />

                <div className="user-menu">
                    <User size={18} />
                    <span>{user?.username || 'Admin'}</span>
                </div>

                <button
                    className="btn btn-ghost btn-icon"
                    onClick={onLogout}
                    title="Logout"
                    aria-label="Log out"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
