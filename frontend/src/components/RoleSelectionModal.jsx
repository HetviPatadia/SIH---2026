import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiGlobe, FiShield, FiX, FiArrowRight } from 'react-icons/fi';

/**
 * RoleSelectionModal
 * Accessible, keyboard-navigable role picker modal.
 * Props:
 *   isOpen  (bool) — controls visibility
 *   onClose (fn)   — called when user dismisses
 */
const RoleSelectionModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const closeRef = useRef(null);
  const firstCardRef = useRef(null);

  /* Focus the close button when modal opens */
  useEffect(() => {
    if (isOpen && closeRef.current) {
      closeRef.current.focus();
    }
  }, [isOpen]);

  /* Close on Escape key */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePublic = () => {
    onClose();
    navigate('/public');
  };

  const handleAuditor = () => {
    onClose();
    navigate('/login');
  };

  return (
    <div
      className="lp-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="lp-modal">
        {/* Close button */}
        <button
          ref={closeRef}
          className="lp-modal-close"
          onClick={onClose}
          aria-label="Close role selection"
        >
          <FiX />
        </button>

        {/* Header */}
        <div className="lp-modal-header">
          <h2 id="role-modal-title" className="lp-modal-title">Choose your access</h2>
          <p className="lp-modal-subtitle">
            Select how you want to use MPLADS Audit Intelligence.
          </p>
        </div>

        {/* Cards */}
        <div className="lp-modal-body">

          {/* Public card */}
          <button
            ref={firstCardRef}
            className="lp-role-card lp-card-public"
            onClick={handlePublic}
            aria-label="Continue as Public — Explore public insights"
          >
            <div className="lp-role-icon" aria-hidden="true">
              <FiGlobe size={22} />
            </div>
            <div>
              <p className="lp-role-type">Public</p>
              <p className="lp-role-title">Explore Public Insights</p>
            </div>
            <p className="lp-role-desc">
              Explore MPLADS project information, expenditure and transparency insights.
            </p>
            <span className="lp-role-cta">
              Continue as Public <FiArrowRight size={14} />
            </span>
          </button>

          {/* Auditor card */}
          <button
            className="lp-role-card lp-card-auditor"
            onClick={handleAuditor}
            aria-label="Continue as Auditor — Audit and investigate projects"
          >
            <div className="lp-role-icon" aria-hidden="true">
              <FiShield size={22} />
            </div>
            <div>
              <p className="lp-role-type">Auditor</p>
              <p className="lp-role-title">Audit &amp; Investigate</p>
            </div>
            <p className="lp-role-desc">
              Investigate projects, review anomaly signals, examine evidence and generate audit briefs.
            </p>
            <span className="lp-role-cta">
              Continue as Auditor <FiArrowRight size={14} />
            </span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default RoleSelectionModal;
