import React, { useState } from 'react';
import { supabase } from './supabaseClient';

// ─── Auth Page (Login / Sign Up) ──────────────────────────────────────────────
export default function AuthPage() {
    const [mode, setMode] = useState('login');   // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPass, setShowPass] = useState(false);

    const reset = () => { setError(''); setSuccess(''); };

    const switchMode = (m) => {
        setMode(m);
        reset();
        setEmail(''); setPassword(''); setName('');
    };

    // ── Sign Up ────────────────────────────────────────────────────────────────
    const handleSignUp = async (e) => {
        e.preventDefault();
        reset();
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setLoading(true);
        try {
            const { error: err } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } }
            });
            if (err) throw err;
            setSuccess('Account created! Check your email to confirm, then log in.');
            setMode('login');
        } catch (err) {
            setError(err.message || 'Sign up failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Log In ─────────────────────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        reset();
        setLoading(true);
        try {
            const { error: err } = await supabase.auth.signInWithPassword({ email, password });
            if (err) throw err;
            // App.jsx listens to onAuthStateChange — page will auto-update
        } catch (err) {
            setError(err.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const isLogin = mode === 'login';

    return (
        <div className="auth-wrapper">
            {/* ── Left Panel ── */}
            <div className="auth-left">
                <div className="auth-brand">
                    <div className="auth-logo">
                        <img src="/logo.png" alt="CareerPilot AI"
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                        <span className="auth-wordmark">
                            CareerPilot <span className="ai-badge">AI</span>
                        </span>
                    </div>
                    <div className="auth-left-content">
                        <h2>Navigate your career with confidence</h2>
                        <p>Join thousands of students and professionals who found their direction with AI-powered guidance.</p>
                        <div className="auth-features">
                            {[
                                { icon: '🎯', text: 'Personalised career path suggestions' },
                                { icon: '📊', text: 'Skill gap analysis and insights' },
                                { icon: '🗺️', text: '6-month step-by-step roadmap' },
                                { icon: '💾', text: 'Save and revisit your reports anytime' },
                            ].map(f => (
                                <div className="auth-feature-item" key={f.text}>
                                    <span className="auth-feature-icon">{f.icon}</span>
                                    <span>{f.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Decorative blobs */}
                <div className="auth-blob auth-blob-1"></div>
                <div className="auth-blob auth-blob-2"></div>
            </div>

            {/* ── Right Panel (Form) ── */}
            <div className="auth-right">
                <div className="auth-form-container">
                    {/* Mode Toggle */}
                    <div className="auth-toggle">
                        <button
                            className={`auth-toggle-btn ${isLogin ? 'active' : ''}`}
                            onClick={() => switchMode('login')}
                        >
                            Log In
                        </button>
                        <button
                            className={`auth-toggle-btn ${!isLogin ? 'active' : ''}`}
                            onClick={() => switchMode('signup')}
                        >
                            Sign Up
                        </button>
                    </div>

                    <div className="auth-form-header">
                        <h1>{isLogin ? 'Welcome back 👋' : 'Create your account'}</h1>
                        <p>{isLogin ? 'Log in to access your career roadmaps.' : 'Start your personalised career journey today.'}</p>
                    </div>

                    {/* Alerts */}
                    {error && <div className="auth-alert auth-alert-error">⚠️ {error}</div>}
                    {success && <div className="auth-alert auth-alert-success">✅ {success}</div>}

                    {/* Form */}
                    <form onSubmit={isLogin ? handleLogin : handleSignUp} className="auth-form">
                        {!isLogin && (
                            <div className="auth-field">
                                <label htmlFor="auth-name">Full Name</label>
                                <input
                                    id="auth-name"
                                    type="text"
                                    placeholder="e.g. Alex Johnson"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required={!isLogin}
                                    autoComplete="name"
                                />
                            </div>
                        )}
                        <div className="auth-field">
                            <label htmlFor="auth-email">Email Address</label>
                            <input
                                id="auth-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="auth-field">
                            <div className="auth-field-label-row">
                                <label htmlFor="auth-pass">Password</label>
                                {isLogin && (
                                    <button type="button" className="auth-forgot" onClick={() => alert('Password reset coming soon!')}>
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="auth-pass-wrap">
                                <input
                                    id="auth-pass"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder={isLogin ? 'Your password' : 'Min. 6 characters'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                />
                                <button
                                    type="button"
                                    className="auth-eye"
                                    onClick={() => setShowPass(s => !s)}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                            {loading
                                ? <span className="auth-spinner"></span>
                                : isLogin ? '→ Log In' : '→ Create Account'}
                        </button>
                    </form>

                    {/* Footer switch */}
                    <p className="auth-switch-text">
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <button className="auth-switch-link" onClick={() => switchMode(isLogin ? 'signup' : 'login')}>
                            {isLogin ? 'Sign up free' : 'Log in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
