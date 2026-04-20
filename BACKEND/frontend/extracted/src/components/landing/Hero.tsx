import { useEffect } from 'react';
import landingStyles from './aurix-landing.css?raw';
import { AurixLandingExperience } from './aurix3d/experience.js';

interface HeroProps {
  onEnter: () => void;
}

export const Hero = ({ onEnter }: HeroProps) => {
  useEffect(() => {
    const experience = new AurixLandingExperience({ onEnter });

    return () => {
      experience.destroy();
    };
  }, [onEnter]);

  return (
    <div className="landing-scope">
      <style>{landingStyles}</style>

      <div id="cursor-dot" />
      <div id="cursor-ring" />

      <div id="loader">
        <div className="loader-logo">AURIX</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" />
        </div>
        <div className="loader-status">INITIALIZING PREDICTIVE CORES...</div>
      </div>

      <nav>
        <div className="nav-logo">AURIX</div>

        <ul className="nav-links">
          <li><a href="#s1">System</a></li>
          <li><a href="#s2">Threat</a></li>
          <li><a href="#s3">Defense</a></li>
          <li><a href="#s5">Activate</a></li>
        </ul>

        <div className="nav-actions" style={{ display: 'flex', gap: '15px' }}>
          <button type="button" className="cta-btn small-btn" data-enter-app="true">
            <span>ENTER CONSOLE</span>
          </button>
          <button type="button" className="cta-btn small-btn outline" data-enter-app="true">
            <span>SIGN IN</span>
          </button>
        </div>

        <div className="nav-status">
          <div className="nav-dot" />
          <span>ONLINE</span>
        </div>
      </nav>

      <div className="fixed-hud left">
        <div className="hud-line vertical" />
        <div className="hud-text">SYS.VER.4.1 // NEURAL SEC</div>
      </div>

      <div className="fixed-hud right">
        <div className="hud-circle-wrap">
          <svg viewBox="0 0 100 100" className="hud-circle">
            <circle cx="50" cy="50" r="45" />
            <circle cx="50" cy="50" r="35" strokeDasharray="10 5" />
            <circle cx="50" cy="50" r="25" strokeDasharray="2 10" />
          </svg>
        </div>
        <div className="hud-line vertical" />
        <div className="hud-text">TARGET ALIGNED</div>
      </div>

      <canvas id="canvas3d" />
      <div id="grid-bg" />
      <canvas id="particles" />

      <div id="scroll-container">
        <section className="section" id="s1">
          <div className="bg-watermark">DEFENSE</div>
          <div className="bracket tl" />
          <div className="bracket tr" />
          <div className="bracket bl" />
          <div className="bracket br" />

          <div className="section-inner">
            <div className="brand-hero">NEXT-GEN AI CYBER DEFENSE</div>
            <h1 className="brand-main glitch" data-text="AURIX">AURIX</h1>
            <p className="brand-tagline">
              AI that predicts and stops cyber attacks before they happen. Born from the frontier of machine
              intelligence, forged for the digital battlefield.
            </p>

            <button type="button" className="cta-btn" data-enter-app="true">
              <span>INITIALIZE SYSTEM</span>
              <span>→</span>
            </button>

            <div className="hud-panel visible" style={{ opacity: 1, transform: 'none', marginTop: '40px' }}>
              <div className="hud-row">
                <span className="hud-key">THREAT MODEL</span>
                <span className="hud-val">Predictive Neural v4.1</span>
                <div className="hud-dot" />
              </div>
              <div className="hud-row">
                <span className="hud-key">STATUS</span>
                <span className="hud-val">Awakening...</span>
                <div className="hud-dot red" />
              </div>
              <div className="hud-row">
                <span className="hud-key">UPTIME</span>
                <span className="hud-val" id="uptime-val">00:00:00</span>
                <div className="hud-dot" />
              </div>
            </div>
          </div>

          <div className="section-line" />
        </section>

        <section className="section" id="s2">
          <div className="bg-watermark">PREDICT</div>

          <div className="section-inner right glass-panel">
            <div className="section-label" data-anim="true">PREDICTIVE INTELLIGENCE</div>
            <h2 className="section-title" data-anim="true">
              HEURISTIC
              <br />
              VECTOR
              <br />
              <span className="accent-r">ANALYSIS</span>
            </h2>
            <p className="section-body" data-anim="true">
              Processing 2.4 petabytes of telemetry per second. AURIX doesn&apos;t just block. It learns attacker
              intent and simulates breach paths before they manifest.
            </p>

            <div className="hud-panel" data-anim="true">
              <div className="hud-row">
                <span className="hud-key">PACKET DEPTH</span>
                <span className="hud-val">L7 Deep Inspection</span>
                <div className="hud-dot" />
              </div>
              <div className="hud-row">
                <span className="hud-key">ANOMALIES</span>
                <span className="hud-val" id="threat-count">0 intercepted</span>
                <div className="hud-dot red" />
              </div>
              <div className="hud-row">
                <span className="hud-key">CONFIDENCE</span>
                <span className="hud-val">99.982%</span>
                <div className="hud-dot" />
              </div>
            </div>

            <div className="scan-wrap" data-anim="true">
              <div className="scan-line" />
            </div>
          </div>

          <div className="section-line" />
        </section>

        <section className="section" id="s3">
          <div className="bg-watermark">ARCH</div>
          <div className="bracket tl" />
          <div className="bracket tr" />
          <div className="bracket bl" />
          <div className="bracket br" />

          <div className="section-inner glass-panel">
            <div className="section-label" data-anim="true">DEFENSE ARCHITECTURE</div>
            <h2 className="section-title" data-anim="true">
              KINETIC
              <br />
              <span className="accent-b">ENCRYPTION</span>
              <br />
              SHIELD
            </h2>
            <p className="section-body" data-anim="true">
              Deploying virtualized honeynets and adaptive polymorphic armor. AURIX constantly reconfigures your
              network fingerprint so you stay invisible in the digital dark.
            </p>

            <div className="stat-grid" data-anim="true">
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--neon-blue)' }}>0.08ms</div>
                <div className="stat-label">Neural Reaction</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--neon-purple)' }}>Exa</div>
                <div className="stat-label">Scale Capacity</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--neon-red)' }}>Zero</div>
                <div className="stat-label">Trust Policy</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--neon-cyan)' }}>∞</div>
                <div className="stat-label">Uptime</div>
              </div>
            </div>
          </div>

          <div className="section-line" />
        </section>

        <section className="section" id="s4">
          <div className="bg-watermark">TACTICS</div>

          <div className="section-inner right glass-panel">
            <div className="section-label" data-anim="true">ADAPTIVE COUNTERMEASURES</div>
            <h2 className="section-title" data-anim="true">
              NEURAL
              <br />
              RECEPTOR
              <br />
              <span className="accent-p">TACTICS</span>
            </h2>
            <p className="section-body" data-anim="true">
              Autonomous counterstrike protocols. When a threat appears, AURIX does not just defend. It isolates,
              traces, and neutralizes the source with surgical precision.
            </p>

            <div className="hud-panel" data-anim="true">
              <div className="hud-row">
                <span className="hud-key">COUNTER MODE</span>
                <span className="hud-val">Active Aggression</span>
                <div className="hud-dot" />
              </div>
              <div className="hud-row">
                <span className="hud-key">TRACE SPEED</span>
                <span className="hud-val">Near-Instant</span>
                <div className="hud-dot" />
              </div>
              <div className="hud-row">
                <span className="hud-key">BIOMETRIC LINK</span>
                <span className="hud-val">SECURE</span>
                <div className="hud-dot red" />
              </div>
            </div>
          </div>

          <div className="section-line" />
        </section>

        <section className="section" id="s5" style={{ flexDirection: 'column' }}>
          <div
            className="bg-watermark"
            style={{ fontSize: 'clamp(12rem, 25vw, 35rem)', color: 'rgba(255, 34, 68, 0.015)' }}
          >
            CORE
          </div>
          <div className="final-glow" />

          <div className="section-inner center">
            <div className="section-label" data-anim="true" style={{ textAlign: 'center' }}>
              GLOBAL ACTIVATION PROTOCOL
            </div>
            <h2 className="section-title" data-anim="true" style={{ textAlign: 'center', fontSize: 'clamp(2rem, 5vw, 4.5rem)' }}>
              <span className="accent-r">AURIX</span>
            </h2>
            <p className="section-body" data-anim="true" style={{ margin: '0 auto', textAlign: 'center', maxWidth: '550px' }}>
              The era of reactive security is over. Deploy the prophetic core today and secure your existence in the
              post-quantum landscape.
            </p>

            <div className="stat-grid" data-anim="true" style={{ maxWidth: '520px', margin: '28px auto 0', gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--neon-red)' }}>100%</div>
                <div className="stat-label">Neural Native</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--neon-blue)' }}>Zero</div>
                <div className="stat-label">Day Immunity</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--neon-purple)' }}>Exa-Bit</div>
                <div className="stat-label">Encryption</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--neon-cyan)' }}>∞</div>
                <div className="stat-label">System Integrity</div>
              </div>
            </div>

            <div
              data-anim="true"
              style={{ marginTop: '54px', opacity: 0, transform: 'translateY(20px)', transition: 'opacity .7s .5s,transform .7s .5s' }}
            >
              <button
                type="button"
                className="cta-btn"
                data-enter-app="true"
                style={{ fontSize: '.82rem', padding: '20px 52px', background: 'rgba(255, 34, 68, 0.05)', borderColor: 'rgba(255, 34, 68, 0.3)' }}
              >
                <span>ACTIVATE AURIX</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="scroll-hint" id="scroll-hint">
        <div className="scroll-hint-text">SCROLL</div>
        <div className="scroll-hint-arrow" />
      </div>

      <button id="audio-btn" title="Toggle Sound" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(0,200,255,0.7)" strokeWidth="1.5">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path id="aw1" d="M15.54 8.46a5 5 0 010 7.07" />
          <path id="aw2" d="M19.07 4.93a10 10 0 010 14.14" />
        </svg>
      </button>
    </div>
  );
};
