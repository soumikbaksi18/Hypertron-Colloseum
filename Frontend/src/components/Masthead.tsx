import type { AgentProfile } from '../lib/api';
import './Masthead.css';

interface Props {
  profile: AgentProfile | null;
  live: boolean;
  onSignOut: () => void;
}

export function Masthead({ profile, live, onSignOut }: Props) {
  return (
    <header className="masthead">
      <div className="masthead-identity">
        <span className="masthead-mark" aria-hidden="true" />
        <div>
          <h1 className="masthead-wordmark">Hypertron</h1>
          <p className="masthead-tagline">
            Financial authority for software, without the exposure
          </p>
        </div>
      </div>

      {profile && (
        <div className="masthead-context">
          <div className="masthead-field">
            <span className="eyebrow">Business</span>
            <span className="masthead-value">{profile.business_name}</span>
          </div>
          <div className="masthead-field">
            <span className="eyebrow">Acting agent</span>
            <span className="masthead-value mono">{profile.label}</span>
          </div>
          <div className="masthead-field">
            <span className="eyebrow">Settlement</span>
            <span className={`masthead-live${live ? ' is-live' : ''}`}>
              <span className="masthead-pip" aria-hidden="true" />
              {live ? 'Shielded pool' : 'Offline'}
            </span>
          </div>
          <button className="masthead-exit" onClick={onSignOut}>
            Change key
          </button>
        </div>
      )}
    </header>
  );
}
