import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import { generateCareerRoadmap } from './gemini.js';
import { supabase } from './supabaseClient.js';
import AuthPage from './Auth.jsx';

// ─── Work Style Options ────────────────────────────────────────────────────────
const WORK_STYLES = [
  { value: 'remote', label: 'Remote', icon: '🌍' },
  { value: 'office', label: 'In-Office', icon: '🏢' },
  { value: 'creative', label: 'Creative', icon: '🎨' },
  { value: 'analytical', label: 'Analytical', icon: '🔍' },
  { value: 'startup', label: 'Startup', icon: '🚀' },
];

const LOADING_STEPS = [
  'Scanning your skills profile...',
  'Cross-referencing industry demand...',
  'Identifying skill gaps...',
  'Generating personalised roadmaps...',
];

const CARD_ACCENTS = ['', 'alt-1', 'alt-2'];

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="toast">
      <span>✅</span> {message}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined);  // undefined = loading, null = logged out
  const [page, setPage] = useState('home');   // home | form | loading | results | saved
  const [profileStep, setProfileStep] = useState(1);
  const [profile, setProfile] = useState({
    name: '', education: '', skills: '', interests: '', workStyle: 'remote', goal: ''
  });
  const [results, setResults] = useState([]);
  const [savedReports, setSavedReports] = useState([]);

  // ── Auth Session ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '';
        setProfile(p => ({ ...p, name: p.name || name }));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPage('home');
    setSavedReports([]);
    setResults([]);
  };
  const [selectedReport, setSelectedReport] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [loadStep, setLoadStep] = useState(0);

  // Fetch reports when session changes
  useEffect(() => {
    if (session?.user) {
      fetchReports();
    } else if (session === null) {
      setSavedReports([]);
    }
  }, [session]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const showToast = (msg) => setToast(msg);
  const closeToast = useCallback(() => setToast(null), []);

  const goHome = () => {
    setPage('home');
    setProfileStep(1);
    setSelectedReport(null);
    setError(null);
  };

  const startForm = () => {
    setProfileStep(1);
    setPage('form');
    setError(null);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setProfile(p => ({ ...p, [name]: value }));
  };

  const selectWorkStyle = (val) => setProfile(p => ({ ...p, workStyle: val }));

  // ── Multi-step nav ──────────────────────────────────────────────────────────
  const canNext = () => {
    if (profileStep === 1) return profile.name.trim() && profile.education;
    if (profileStep === 2) return profile.skills.trim() && profile.interests.trim();
    return true;
  };

  const nextStep = () => {
    if (!canNext()) return;
    setProfileStep(s => s + 1);
  };

  const prevStep = () => setProfileStep(s => s - 1);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setPage('loading');
    setError(null);
    setLoadStep(0);

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setLoadStep(s => {
        if (s >= LOADING_STEPS.length - 1) { clearInterval(stepInterval); return s; }
        return s + 1;
      });
    }, 1200);

    try {
      const data = await generateCareerRoadmap(profile);
      clearInterval(stepInterval);
      setResults(data.careers || []);
      setSelected(null);
      setPage('results');
    } catch (err) {
      clearInterval(stepInterval);
      setError(err.message || 'Something went wrong. Please try again.');
      setPage('form');
    }
  };

  // ── Save / Delete ───────────────────────────────────────────────────────────
  const saveReport = async () => {
    if (!session?.user) {
      showToast('You must be logged in to save reports.');
      return;
    }

    const report = {
      user_id: session.user.id,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      name: profile.name,
      education: profile.education,
      careers: results,
      user_profile: profile
    };

    try {
      const { data, error } = await supabase
        .from('reports')
        .insert([report])
        .select();

      if (error) throw error;

      setSavedReports(prev => [data[0], ...prev]);
      showToast('Report saved successfully!');
    } catch (err) {
      console.error('Error saving report:', err);
      showToast('Failed to save report. Please try again.');
    }
  };

  const deleteReport = async (id) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = savedReports.filter(r => r.id !== id);
      setSavedReports(updated);
      if (selectedReport?.id === id) setSelectedReport(null);
      showToast('Report deleted.');
    } catch (err) {
      console.error('Error deleting report:', err);
      showToast('Failed to delete report.');
    }
  };

  const viewReport = (report) => {
    setSelectedReport(report);
    setResults(report.careers);
    setPage('results');
  };

  const setSelected = (r) => setSelectedReport(r);

  // ── Auth Guard ───────────────────────────────────────────────────────────────
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="loader-ring"><div className="loader-emoji">🚀</div></div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Loading CareerPilot AI...</p>
        </div>
      </div>
    );
  }
  if (!session) return <AuthPage />;

  const userEmail = session.user?.email || '';
  const userName = session.user?.user_metadata?.full_name || userEmail.split('@')[0];

  return (
    <div className="app-wrapper">
      {/* ── NAVBAR ── */}
      <nav className="navbar glass">
        <div className="container nav-content">
          <div className="logo-brand" onClick={goHome}>
            <img src="/logo.png" alt="CareerPilot AI" className="logo-img"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span className="logo-wordmark">
              CareerPilot <span className="ai-badge">AI</span>
            </span>
          </div>
          <div className="nav-links">
            <button className={`nav-btn ${page === 'home' ? 'active' : ''}`} onClick={goHome}>Home</button>
            <button
              className={`nav-btn ${page === 'saved' ? 'active' : ''}`}
              onClick={() => { setPage('saved'); setSelectedReport(null); }}
            >
              My Reports {savedReports.length > 0 && <span className="ai-badge" style={{ fontSize: '0.6rem', marginLeft: '4px' }}>{savedReports.length}</span>}
            </button>
            <button className="btn btn-primary btn-sm" onClick={startForm}>Start Now</button>
            <div className="nav-user">
              <div className="nav-avatar" title={userEmail}>{userName.charAt(0).toUpperCase()}</div>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>Log Out</button>
            </div>
          </div>
        </div>
      </nav>


      <main>
        {page === 'home' && <HomePage onStart={startForm} userName={userName} />}
        {page === 'form' && (
          <FormPage
            profile={profile}
            profileStep={profileStep}
            onInput={handleInput}
            onSelectStyle={selectWorkStyle}
            onNext={nextStep}
            onPrev={prevStep}
            onSubmit={handleSubmit}
            canNext={canNext}
            onCancel={goHome}
            error={error}
          />
        )}
        {page === 'loading' && <LoadingPage loadStep={loadStep} steps={LOADING_STEPS} />}
        {page === 'results' && (
          <ResultsPage
            results={results}
            isSaved={!!selectedReport}
            onSave={saveReport}
            onNew={startForm}
            onHome={goHome}
          />
        )}
        {page === 'saved' && (
          <SavedPage
            reports={savedReports}
            onView={viewReport}
            onDelete={deleteReport}
            onStart={startForm}
            onHome={goHome}
          />
        )}
      </main>

      <footer className="footer">
        <div className="container">
          © 2026 CareerPilot AI — Clarity for the next generation of professionals.
        </div>
      </footer>

      {toast && <Toast message={toast} onClose={closeToast} />}
    </div>
  );
}

// ─── Page: Home ───────────────────────────────────────────────────────────────
function HomePage({ onStart, userName }) {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            {/* Left */}
            <div className="hero-left animate-fade-up">
              <div className="hero-badge">
                <span className="hero-badge-dot"></span>
                AI-Powered Career Navigation
              </div>
              {userName && (
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>
                  👋 Welcome back, <strong style={{ color: 'var(--primary)' }}>{userName}</strong>!
                </p>
              )}
              <h1>
                Find Your <br />
                <span className="text-gradient">Perfect Path</span>
              </h1>
              <p className="hero-sub">
                Answer a few questions and our AI analyses your skills, interests, and goals to suggest tailored career paths with a step-by-step 6-month roadmap.
              </p>
              <div className="hero-cta">
                <button className="btn btn-primary btn-lg" onClick={onStart}>
                  🚀 Start My Journey
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 600 }}>
                  Free · Under 3 minutes
                </span>
              </div>

              <div className="hero-proof">
                <div className="proof-item"><strong>3+</strong><span>Career Paths</span></div>
                <div className="proof-divider"></div>
                <div className="proof-item"><strong>6 mo.</strong><span>Roadmap</span></div>
                <div className="proof-divider"></div>
                <div className="proof-item"><strong>AI</strong><span>Powered</span></div>
              </div>
            </div>

            {/* Right visual */}
            <div className="hero-visual animate-fade-up animate-delay-2">
              <div className="hero-orb-container">
                <div className="hero-orb orb-1"></div>
                <div className="hero-orb orb-2"></div>
                <div className="hero-orb orb-3">
                  <span className="orb-icon">🧠</span>
                </div>
                <div className="floating-chip chip-1">
                  <span className="chip-dot" style={{ background: '#6366f1' }}></span>
                  Skill Analysis
                </div>
                <div className="floating-chip chip-2">
                  <span className="chip-dot" style={{ background: '#10b981' }}></span>
                  93% Match
                </div>
                <div className="floating-chip chip-3">
                  <span className="chip-dot" style={{ background: '#ec4899' }}></span>
                  6-Month Plan
                </div>
                <div className="floating-chip chip-4">
                  <span className="chip-dot" style={{ background: '#f59e0b' }}></span>
                  AI Insights
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-strip">
        <div className="container">
          <div className="features-row">
            {[
              { icon: '🎯', label: 'Personalised Suggestions' },
              { icon: '📊', label: 'Skill Gap Analysis' },
              { icon: '🗺️', label: '6-Month Roadmap' },
              { icon: '💾', label: 'Save & Revisit Reports' },
              { icon: '⚡', label: 'Results in Seconds' },
            ].map(f => (
              <div className="feature-pill" key={f.label}>
                <div className="feature-pill-icon">{f.icon}</div>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Page: Profile Form ───────────────────────────────────────────────────────
function FormPage({ profile, profileStep, onInput, onSelectStyle, onNext, onPrev, onSubmit, canNext, onCancel, error }) {
  const steps = ['Your Background', 'Skills & Interests', 'Work Preferences'];
  const pct = ((profileStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="form-page">
      <div className="container">
        <div className="form-shell animate-fade-up">

          {/* Progress */}
          <div className="progress-header">
            <div className="progress-label">
              <span>Step {profileStep} of {steps.length}</span>
              <span>{steps[profileStep - 1]}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct === 0 ? 5 : pct}%` }}></div>
            </div>
            <div className="step-tabs">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className={`step-tab ${i + 1 < profileStep ? 'done' : ''} ${i + 1 === profileStep ? 'active' : ''}`}
                >
                  <span className="tab-num">{i + 1 < profileStep ? '✓' : i + 1}</span>
                  <span className="tab-label">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="error-box">
              <span>⚠️</span>
              <div>
                <strong>Something went wrong</strong><br />
                {error}
                <br /><small>Make sure your Gemini API key is added to the <code>.env</code> file as <code>VITE_GEMINI_API_KEY</code>.</small>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit}>
            {profileStep === 1 && (
              <div className="animate-fade">
                <div className="step-header">
                  <h2>Your Background</h2>
                  <p>Let's start with the basics to understand your starting point.</p>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input id="name" name="name" type="text" placeholder="e.g. Alex Johnson"
                      value={profile.name} onChange={onInput} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="education">Education Level</label>
                    <select id="education" name="education" value={profile.education} onChange={onInput} required>
                      <option value="">— Select —</option>
                      <option>High School</option>
                      <option>Associate Degree</option>
                      <option>Bachelor's Degree</option>
                      <option>Master's Degree</option>
                      <option>PhD</option>
                      <option>Self-Taught / Bootcamp</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {profileStep === 2 && (
              <div className="animate-fade">
                <div className="step-header">
                  <h2>Skills & Interests</h2>
                  <p>This is the core of our AI analysis — be as detailed as you like.</p>
                </div>
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label htmlFor="skills">Current Skills <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(comma-separated)</span></label>
                    <textarea id="skills" name="skills"
                      placeholder="e.g. Python, Excel, Communication, Problem Solving, Graphic Design..."
                      value={profile.skills} onChange={onInput} required />
                  </div>
                  <div className="form-group span-2">
                    <label htmlFor="interests">Interests & Passions</label>
                    <textarea id="interests" name="interests"
                      placeholder="e.g. I love building things, I enjoy working with data, I like helping people..."
                      value={profile.interests} onChange={onInput} required />
                  </div>
                </div>
              </div>
            )}

            {profileStep === 3 && (
              <div className="animate-fade">
                <div className="step-header">
                  <h2>Work Preferences</h2>
                  <p>Final details to shape your perfect career roadmap.</p>
                </div>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Preferred Work Style</label>
                  <div className="style-options">
                    {WORK_STYLES.map(s => (
                      <div
                        key={s.value}
                        className={`style-option ${profile.workStyle === s.value ? 'selected' : ''}`}
                        onClick={() => onSelectStyle(s.value)}
                      >
                        <span className="style-icon">{s.icon}</span>
                        <span className="style-label">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="goal">Long-term Career Goal <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(optional)</span></label>
                  <input id="goal" name="goal" type="text"
                    placeholder="e.g. Become a CTO, Launch my own product, Work at a top tech company..."
                    value={profile.goal} onChange={onInput} />
                </div>
              </div>
            )}

            <div className="form-footer">
              {profileStep === 1
                ? <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
                : <button type="button" className="btn btn-outline" onClick={onPrev}>← Previous</button>
              }
              {profileStep < 3
                ? <button type="button" className="btn btn-primary" onClick={onNext} disabled={!canNext()}>
                  Continue →
                </button>
                : <button type="submit" className="btn btn-primary btn-lg">
                  🧠 Generate My Roadmap
                </button>
              }
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Page: Loading ────────────────────────────────────────────────────────────
function LoadingPage({ loadStep, steps }) {
  return (
    <div className="loading-page">
      <div className="loader-ring">
        <div className="loader-emoji">🧠</div>
      </div>
      <h2 className="loading-title">Analysing Your Profile...</h2>
      <p className="loading-sub">Our AI is cross-referencing your skills with thousands of industry career tracks.</p>
      <div className="loading-steps">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`loading-step ${i === loadStep ? 'active' : ''} ${i < loadStep ? 'done' : ''}`}
          >
            <span className="step-check">
              {i < loadStep ? '✅' : i === loadStep ? '⏳' : '⬜'}
            </span>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page: Results ────────────────────────────────────────────────────────────
function ResultsPage({ results, isSaved, onSave, onNew, onHome }) {
  return (
    <div className="results-page">
      <div className="container">
        <div className="results-title-bar animate-fade-up">
          <div>
            <h1>Your Career Roadmap</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              {results.length} personalised career paths generated by AI
            </p>
          </div>
          <div className="results-actions">
            {!isSaved && (
              <button className="btn btn-secondary" onClick={onSave}>💾 Save Report</button>
            )}
            <button className="btn btn-primary" onClick={onNew}>+ New Assessment</button>
          </div>
        </div>

        <div className="career-grid">
          {results.map((career, idx) => (
            <CareerCard key={career.id || idx} career={career} accentClass={CARD_ACCENTS[idx % 3]} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <button className="btn btn-ghost" onClick={onHome}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}

function CareerCard({ career, accentClass }) {
  const required = career.analysis?.required || [];
  const matching = career.analysis?.matching || [];
  const missing = career.analysis?.missing || [];
  const roadmap = career.roadmap || [];

  return (
    <div className={`career-card animate-fade-up`}>
      <div className={`career-card-header ${accentClass}`}></div>
      <div className="career-card-body">
        <div className="career-top">
          <div className="match-score">
            <span className="score-num">{career.matchScore}%</span>
            <span className="score-label">Match</span>
          </div>
          <div className="career-title-group">
            <h3>{career.title}</h3>
            {career.category && <span className="career-category">{career.category}</span>}
          </div>
        </div>

        <p className="career-reason">{career.reason}</p>

        {/* Skill Gap */}
        <div className="section-title">Skill Gap Analysis</div>
        <div className="skill-tags">
          {matching.map(s => <span key={s} className="skill-tag have">✓ {s}</span>)}
          {missing.map(s => <span key={s} className="skill-tag need">+ {s}</span>)}
          {required.length === 0 && matching.length === 0 && missing.length === 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No skill data provided.</span>
          )}
        </div>

        {/* Roadmap */}
        <div className="section-title">6-Month Roadmap</div>
        <div className="roadmap">
          {roadmap.map((item, i) => (
            <div className="roadmap-item" key={i}>
              <div className="roadmap-num">{i + 1}</div>
              <div className="roadmap-content">
                <h5>{item.title}</h5>
                <p>{item.focus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page: Saved Reports ──────────────────────────────────────────────────────
function SavedPage({ reports, onView, onDelete, onStart, onHome }) {
  return (
    <div className="saved-page">
      <div className="container">
        <div className="page-title-bar animate-fade-up">
          <h1>Saved Reports</h1>
          <button className="btn btn-primary" onClick={onStart}>+ New Assessment</button>
        </div>

        {reports.length === 0 ? (
          <div className="empty-state animate-fade-up">
            <div className="ilu">📋</div>
            <h3>No saved reports yet</h3>
            <p>Complete an assessment and save your results to revisit them here.</p>
            <button className="btn btn-primary btn-lg" onClick={onStart}>Start My Assessment</button>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map(r => (
              <div className="report-card animate-fade-up" key={r.id}>
                <div className="report-info">
                  <h3>{r.name ? `${r.name}'s Report` : 'Career Report'}</h3>
                  <p>{r.date} · {r.education} · {r.careers?.length || 0} careers found</p>
                </div>
                <div className="report-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => onView(r)}>View Report</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDelete(r.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <button className="btn btn-ghost" onClick={onHome}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}
