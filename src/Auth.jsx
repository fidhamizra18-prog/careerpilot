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

    // ── Google OAuth ───────────────────────────────────────────────────────────
    const handleGoogle = async () => {
        reset();
        const { error: err } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (err) setError(err.message);
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

                    {/* Divider */}
                    <div className="auth-divider"><span>or continue with</span></div>

                    {/* Google OAuth */}
                    <button className="auth-google-btn" onClick={handleGoogle} disabled={loading}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

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
