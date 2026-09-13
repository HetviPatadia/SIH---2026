import { useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import RoleSelectionModal from '../components/RoleSelectionModal';
import './LandingPage.css';

/* --------------------------------------------------------
   LandingPage — root component
   -------------------------------------------------------- */
const LandingPage = () => {
  const { isDark, toggle } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className={`landing-page${isDark ? ' landing-dark' : ''}`} id="landing-root">

      {/* ---- Top bar ---- */}
      <header className="landing-topbar" role="banner">
        <div className="landing-topbar-brand">
          {/* Logo only in header: dynamic light/dark switch, no adjacent text */}
          <div className="landing-topbar-logo-wrap">
            <img
              src={isDark ? '/logo-dark.png' : '/logo-light.png'}
              alt="MPLADS Audit AI"
              className="landing-topbar-logo"
            />
          </div>
        </div>

        <div className="landing-topbar-right">
          <div className="landing-topbar-badge">
            Audit Smarter &middot; Govern Better &middot; Impact Greater
          </div>

          {/* Theme toggle */}
          <button
            className="landing-theme-toggle"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
          </button>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="landing-hero" aria-labelledby="hero-heading">

        {/* Right-panel: Official external boundary India map vector graphic */}
        <div className="landing-visual-panel" aria-hidden="true">
          <img
            src={isDark ? '/india_vector_map_dark.png' : '/india_vector_map_light.png'}
            alt="Official external boundary map of India with data nodes"
            className="landing-map-graphic"
          />
        </div>

        {/* Hero content */}
        <div className="landing-hero-content">

          <div className="landing-eyebrow">MPLADS Audit Intelligence Platform</div>

          <h1 id="hero-heading" className="landing-heading">
            Audit&nbsp;<span>Smarter.</span><br/>
            Govern&nbsp;Better.
          </h1>

          <p className="landing-subheading">
            AI-Powered Audit &amp; Evidence Verification System
          </p>

          <p className="landing-description">
            Transforming MPLADS data into explainable insights for transparent
            and efficient project oversight. Helping auditors identify projects
            that require further human review.
          </p>

          <div className="landing-trust-line" aria-label="System principles">
            <span className="landing-trust-item">AI-assisted</span>
            <span className="landing-trust-dot" aria-hidden="true"/>
            <span className="landing-trust-item">Explainable</span>
            <span className="landing-trust-dot" aria-hidden="true"/>
            <span className="landing-trust-item">Human-in-the-loop</span>
          </div>

          <button
            className="landing-cta-btn"
            onClick={() => setModalOpen(true)}
            aria-haspopup="dialog"
          >
            Explore the Platform
            <svg className="landing-cta-arrow" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </section>

      {/* ---- Stats bar ---- */}
      <div className="landing-stats" role="list" aria-label="Platform overview statistics">
        <div className="landing-stat-item" role="listitem">
          <div className="landing-stat-value">7</div>
          <div className="landing-stat-label">Analytical Modules</div>
        </div>
        <div className="landing-stat-item" role="listitem">
          <div className="landing-stat-value">6+</div>
          <div className="landing-stat-label">Evidence Signal Types</div>
        </div>
        <div className="landing-stat-item" role="listitem">
          <div className="landing-stat-value">100%</div>
          <div className="landing-stat-label">Explainable Insights</div>
        </div>
        <div className="landing-stat-item" role="listitem">
          <div className="landing-stat-value">Human</div>
          <div className="landing-stat-label">Final Review Required</div>
        </div>
      </div>

      <RoleSelectionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  );
};

export default LandingPage;