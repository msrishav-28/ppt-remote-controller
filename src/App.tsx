import { useEffect, useMemo, useState } from 'react';
import type { CommandDefinition, CommandId, ProfileId } from '../protocol';
import { COMMANDS, PRIMARY_COMMAND_IDS, PROFILES, START_COMMAND_IDS, UTILITY_COMMAND_IDS } from '../protocol';
import { useRemoteSocket } from './useRemoteSocket';

const commandLookup = COMMANDS as Record<CommandId, CommandDefinition>;
const profileEntries = Object.values(PROFILES);

function getInitialPin() {
  const pin = new URLSearchParams(window.location.search).get('pin') || '';
  return pin.replace(/\D/g, '').slice(0, 6);
}

function StatusPill({ connection, paired }: { connection: string; paired: boolean }) {
  const label = paired ? 'Paired' : connection === 'connected' ? 'Connected' : connection === 'connecting' ? 'Connecting' : 'Disconnected';

  return (
    <div className="status-pill" data-state={paired ? 'paired' : connection} aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function Icon({ name }: { name: 'play' | 'prev' | 'next' | 'square' | 'x' | 'white' | 'zoomIn' | 'zoomOut' | 'reset' | 'timer' | 'settings' }) {
  if (name === 'play') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5z" fill="currentColor" /></svg>;
  }
  if (name === 'prev') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 5 8.5 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (name === 'next') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8.5 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (name === 'square') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.5A.5.5 0 0 1 6.5 6h11a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11Z" fill="currentColor" /></svg>;
  }
  if (name === 'white') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.5A.5.5 0 0 1 6.5 6h11a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11Z" fill="none" stroke="currentColor" strokeWidth="2.2" /></svg>;
  }
  if (name === 'x') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>;
  }
  if (name === 'zoomIn') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5v12M5 11h12M19 19l-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>;
  }
  if (name === 'zoomOut') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h12M19 19l-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>;
  }
  if (name === 'reset') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h7a5 5 0 1 1-4.7 6.7M8 7h4M8 7v4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (name === 'timer') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h4M12 8v5l3 2M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" /></svg>;
}

function iconForCommand(commandId: CommandId) {
  const icons: Partial<Record<CommandId, Parameters<typeof Icon>[0]['name']>> = {
    start: 'play',
    prev: 'prev',
    next: 'next',
    black: 'square',
    white: 'white',
    end: 'x',
    mediaPlayPause: 'play',
    mediaPlaySelected: 'play',
    zoomIn: 'zoomIn',
    zoomOut: 'zoomOut',
    zoomReset: 'reset'
  };
  return icons[commandId] || 'settings';
}

function CommandButton({
  command,
  disabled,
  onCommand,
  variant = 'secondary'
}: {
  command: CommandDefinition;
  disabled: boolean;
  onCommand: (command: CommandDefinition) => void;
  variant?: 'primary' | 'secondary' | 'nav';
}) {
  const label = variant === 'primary' ? command.label : command.shortLabel;

  return (
    <button
      className={`control ${variant} ${command.tone === 'danger' ? 'danger' : ''}`}
      type="button"
      disabled={disabled}
      onClick={() => onCommand(command)}
      aria-label={command.label}
    >
      <Icon name={iconForCommand(command.id)} />
      <span>{label}</span>
      {variant !== 'nav' ? <small>{command.hint}</small> : null}
    </button>
  );
}

function PairingScreen({
  connected,
  error,
  onPair,
  serverLabel,
  wsUrl
}: {
  connected: boolean;
  error?: string;
  onPair: (pin: string) => void;
  serverLabel: string;
  wsUrl: string;
}) {
  const [pin, setPin] = useState(getInitialPin);

  useEffect(() => {
    if (connected && pin.length >= 4) {
      onPair(pin);
    }
  }, [connected]);

  return (
    <section className="pairing-panel" aria-label="Pair remote">
      <div className="pairing-copy">
        <h2>Pair your phone</h2>
        <p>Enter the PIN shown in the laptop terminal.</p>
      </div>
      <form
        className="pin-form"
        onSubmit={(event) => {
          event.preventDefault();
          onPair(pin);
        }}
      >
        <label htmlFor="pin">Pairing PIN</label>
        <input
          id="pin"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          value={pin}
          maxLength={6}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="0000"
        />
        <button className="pair-button" type="submit" disabled={!connected || pin.length < 4}>
          Pair Remote
        </button>
      </form>
      <dl className="connection-list">
        <div>
          <dt>Page</dt>
          <dd>{serverLabel}</dd>
        </div>
        <div>
          <dt>Socket</dt>
          <dd>{wsUrl.replace(/^wss?:\/\//, '')}</dd>
        </div>
      </dl>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
    </section>
  );
}

function TimerPanel() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    const startedAt = Date.now() - elapsed * 1000;
    const interval = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);

    return () => window.clearInterval(interval);
  }, [elapsed, running]);

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');

  return (
    <section className="timer-panel" aria-label="Presenter timer">
      <div>
        <span className="panel-label"><Icon name="timer" /> Timer</span>
        <strong>{minutes}:{seconds}</strong>
      </div>
      <div className="timer-actions">
        <button type="button" onClick={() => setRunning((current) => !current)}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button type="button" onClick={() => { setElapsed(0); setRunning(false); }}>
          Reset
        </button>
      </div>
    </section>
  );
}

function ProfileControls({
  activeProfile,
  disabled,
  onCommand,
  onProfileChange
}: {
  activeProfile: ProfileId;
  disabled: boolean;
  onCommand: (command: CommandDefinition) => void;
  onProfileChange: (profile: ProfileId) => void;
}) {
  const profile = PROFILES[activeProfile];
  const profileCommands = profile.commandIds.map((commandId) => commandLookup[commandId]);

  return (
    <section className="profile-panel" aria-label="Profile controls">
      <div className="profile-tabs" role="tablist" aria-label="Command profiles">
        {profileEntries.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeProfile === item.id}
            className={activeProfile === item.id ? 'active' : ''}
            onClick={() => onProfileChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="profile-grid">
        {profileCommands.map((command) => (
          <CommandButton key={command.id} command={command} disabled={disabled} onCommand={onCommand} />
        ))}
      </div>
    </section>
  );
}

function SettingsPanel() {
  return (
    <section className="settings-panel" aria-label="Shortcut profiles">
      <div className="panel-heading">
        <Icon name="settings" />
        <h2>Profiles</h2>
      </div>
      <div className="mapping-list">
        {profileEntries.map((profile) => (
          <article key={profile.id} className="mapping-card">
            <h3>{profile.label}</h3>
            <p>{profile.description}</p>
            <ul>
              {profile.commandIds.map((commandId) => {
                const command = commandLookup[commandId];
                return (
                  <li key={command.id}>
                    <span>{command.label}</span>
                    <kbd>{command.hint}</kbd>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const { pair, sendCommand, state, wsUrl } = useRemoteSocket();
  const [activeProfile, setActiveProfile] = useState<ProfileId>('universal');
  const [view, setView] = useState<'remote' | 'settings'>('remote');
  const serverLabel = window.location.host;
  const canControl = state.connection === 'connected' && state.paired;
  const lastCommandLabel = state.lastAck ? commandLookup[state.lastAck].label : undefined;

  const statusText = useMemo(() => {
    if (state.lastError) {
      return state.lastError;
    }
    if (lastCommandLabel) {
      return `Sent: ${lastCommandLabel}`;
    }
    return state.lastEvent;
  }, [lastCommandLabel, state.lastError, state.lastEvent]);

  function handleCommand(command: CommandDefinition) {
    sendCommand(command.id, command.profile);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Slide Remote</h1>
          <span>{serverLabel}</span>
        </div>
        <StatusPill connection={state.connection} paired={state.paired} />
      </header>

      {!state.paired ? (
        <PairingScreen
          connected={state.connection === 'connected'}
          error={state.lastError}
          onPair={pair}
          serverLabel={serverLabel}
          wsUrl={wsUrl}
        />
      ) : (
        <>
          <nav className="view-tabs" aria-label="Remote views">
            <button type="button" className={view === 'remote' ? 'active' : ''} onClick={() => setView('remote')}>
              Remote
            </button>
            <button type="button" className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>
              Profiles
            </button>
          </nav>

          {view === 'remote' ? (
            <section className="remote-layout" aria-label="Presentation remote">
              <div className="start-row">
                {START_COMMAND_IDS.map((commandId) => (
                  <CommandButton key={commandId} command={commandLookup[commandId]} disabled={!canControl} onCommand={handleCommand} variant="primary" />
                ))}
              </div>

              <div className="nav-row">
                {PRIMARY_COMMAND_IDS.map((commandId) => (
                  <CommandButton key={commandId} command={commandLookup[commandId]} disabled={!canControl} onCommand={handleCommand} variant="nav" />
                ))}
              </div>

              <div className="utility-row">
                {UTILITY_COMMAND_IDS.map((commandId) => (
                  <CommandButton key={commandId} command={commandLookup[commandId]} disabled={!canControl} onCommand={handleCommand} />
                ))}
              </div>

              <ProfileControls
                activeProfile={activeProfile}
                disabled={!canControl}
                onCommand={handleCommand}
                onProfileChange={setActiveProfile}
              />

              <TimerPanel />
            </section>
          ) : (
            <SettingsPanel />
          )}
        </>
      )}

      <footer className="event-bar" aria-live="polite" data-error={Boolean(state.lastError)}>
        {statusText}
      </footer>
    </main>
  );
}
