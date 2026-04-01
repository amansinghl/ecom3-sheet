'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function AprilFoolsBanner() {
  const [visible, setVisible] = useState(true);
  const [canClose, setCanClose] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if today is April 1st
    const today = new Date();
    if (today.getMonth() !== 3 || today.getDate() !== 1) {
      setVisible(false);
      return;
    }

    // Check if already dismissed this session
    if (sessionStorage.getItem('rto-banner-dismissed')) {
      setVisible(false);
      return;
    }

    // Allow closing after 10 seconds
    const timer = setTimeout(() => setCanClose(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('rto-banner-dismissed', '1');
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`relative transition-all duration-300 ${dismissed ? 'opacity-0 -translate-y-2' : 'opacity-100'}`}
    >
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white px-4 py-4 shadow-lg border-b-2 border-red-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 mt-0.5 shrink-0 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Important Notice
                </span>
                <span className="text-[10px] text-white/70">
                  HR &amp; Operations | April 1, 2026
                </span>
              </div>
              <h3 className="font-bold text-base leading-tight">
                Return to Office Policy — Effective Monday, April 7th
              </h3>
              <p className="text-sm text-white/90 leading-relaxed">
                After careful evaluation of productivity metrics and team collaboration scores, management has decided to
                transition to <strong>full-time work from office</strong> starting Monday, April 7th. All employees must
                report to the nearest Vamaship office by 9:00 AM sharp. WFH requests will require{' '}
                <strong>VP-level approval</strong> with a valid medical certificate. Relocation assistance will not be
                provided. Attendance will be tracked via biometric scanning. Please plan your commute accordingly.
              </p>
              <p className="text-xs text-white/60 mt-1">
                For queries, contact hr-policy@vamaship.com. This decision is final and not open for discussion.
              </p>
            </div>
            {canClose ? (
              <button
                onClick={handleDismiss}
                className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="shrink-0 w-6" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
