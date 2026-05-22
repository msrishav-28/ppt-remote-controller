import { useEffect, useRef, useState } from 'react';
import type { CommandDefinition, CommandId, ProfileId } from '../protocol';
import { COMMANDS, PRIMARY_COMMAND_IDS, PROFILES, START_COMMAND_IDS } from '../protocol';
import { Icon, type IconName } from './Icon';
import { useRemoteSocket } from './useRemoteSocket';
import type { ConnectionState } from './types';

const commandLookup = COMMANDS as Record<CommandId, CommandDefinition>;
const profileEntries = Object.values(PROFILES);
const reservedCommandIds = new Set<CommandId>([...PRIMARY_COMMAND_IDS, ...START_COMMAND_IDS]);

const iconByCommand: Record<CommandId, IconName> = {
  start: 'play',
  prev: 'prev',
  next: 'next',
  black: 'black',
  white: 'white',
  end: 'end',
  mediaPlayPause: 'play',
  mediaPlaySelected: 'play',
  zoomIn: 'zoomIn',
  zoomOut: 'zoomOut',
  zoomReset: 'reset'
};

function getInitialPin() {
  const pin = new URLSearchParams(window.location.search).get('pin') || '';
  return pin.replace(/\D/g, '').slice(0, 6);
}

function StatusPill({ connection, paired }: { connection: ConnectionState; paired: boolean }) {
  const state = paired ? 'paired' : connection;
  const label =
    state === 'paired'
      ? 'Paired'
      : state === 'connected'
        ? 'Connected'
        : state === 'connecting'
          ? 'Connecting'
          : state === 'error'
            ? 'No server'
            : 'Reconnecting';

  return (
    <div className="status" data-state={state} aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function CommandButton({
  command,
  disabled,
  onCommand,
  variant
}: {
  command: CommandDefinition;
  disabled: boolean;
  onCommand: (command: CommandDefinition) => void;
  variant: 'hero' | 'start' | 'tile';
}) {
  const [pulse, setPulse] = useState(0);
  const label = variant === 'tile' ? command.shortLabel : command.label;

  return (
    <button
      type="button"
      className="key"
      data-variant={variant}
      data-tone={command.tone}
      disabled={disabled}
      aria-label={command.label}
      onClick={() => {
        onCommand(command);
        setPulse((current) => current + 1);
      }}
    >
      <span className="key-icon">
        <Icon name={iconByCommand[command.id]} />
      </span>
      <span className="key-label">{label}</span>
      {variant !== 'hero' ? <span className="key-hint">{command.hint}</span> : null}
      {pulse > 0 ? <span className="key-flash" key={pulse} aria-hidden="true" /> : null}
    </button>
  );
}

function PairingScreen({
  connection,
  error,
  onPair,
  serverLabel,
  wsUrl
}: {
  connection: ConnectionState;
  error?: string;
  onPair: (pin: string) => void;
  serverLabel: string;
  wsUrl: string;
}) {
  const [pin, setPin] = useState(getInitialPin);
  const autoPairedRef = useRef(false);
  const connected = connection === 'connected';

  useEffect(() => {
    if (connected && !autoPairedRef.current && pin.length >= 4) {
      autoPairedRef.current = true;
      onPair(pin);
    }
  }, [connected, onPair, pin]);

  return (
    <section className="pairing" aria-label="Pair remote">
      <div className="pairing-head">
        <h2>Pair your phone</h2>
        <p>Enter the PIN shown in the laptop terminal to take control.</p>
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
          aria-describedby={error ? 'pin-error' : undefined}
        />
        <button className="pin-submit" type="submit" disabled={!connected || pin.length < 4}>
          {connected ? 'Pair remote' : 'Waiting for server…'}
        </button>
      </form>
      {error ? (
        <p className="pairing-error" id="pin-error" role="alert">
          {error}
        </p>
      ) : null}
      <dl className="conn-list">
        <div>
          <dt>Page</dt>
          <dd>{serverLabel}</dd>
        </div>
        <div>
          <dt>Socket</dt>
          <dd>{wsUrl.replace(/^wss?:\/\//, '')}</dd>
        </div>
      </dl>
    </section>
  );
}

function TimerPanel() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    // Anchor to a fixed start time so the interval can be left alone; it is
    // intentionally not restarted on every tick.
    startedAtRef.current = Date.now() - elapsed * 1000;
    const interval = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');

  return (
    <section className="timer" aria-label="Presenter timer">
      <div className="timer-display">
        <span className="micro-label">
          <Icon name="timer" /> Timer
        </span>
        <strong aria-live="off">
          {minutes}:{seconds}
        </strong>
      </div>
      <div className="timer-actions">
        <button type="button" onClick={() => setRunning((current) => !current)}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          onClick={() => {
            setElapsed(0);
            setRunning(false);
          }}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

function CommandGroups({
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
  const groupCommands = profile.commandIds
    .filter((commandId) => !reservedCommandIds.has(commandId))
    .map((commandId) => commandLookup[commandId]);

  return (
    <section className="groups" aria-label="Command groups">
      <div className="segmented" role="tablist" aria-label="Command groups">
        {profileEntries.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={activeProfile === item.id}
            aria-controls={`panel-${item.id}`}
            data-active={activeProfile === item.id || undefined}
            onClick={() => onProfileChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="group-grid"
        role="tabpanel"
        id={`panel-${activeProfile}`}
        aria-labelledby={`tab-${activeProfile}`}
        data-count={groupCommands.length}
      >
        {groupCommands.map((command) => (
          <CommandButton
            key={command.id}
            command={command}
            disabled={disabled}
            onCommand={onCommand}
            variant="tile"
          />
        ))}
      </div>
      <p className="group-note">{profile.description}</p>
    </section>
  );
}

function GuidePanel() {
  return (
    <section className="guide" aria-label="Command reference">
      {profileEntries.map((profile) => (
        <article key={profile.id} className="guide-card">
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
    </section>
  );
}

export default function App() {
  const { pair, sendCommand, state, wsUrl } = useRemoteSocket();
  const [activeProfile, setActiveProfile] = useState<ProfileId>('universal');
  const [view, setView] = useState<'remote' | 'guide'>('remote');

  const serverLabel = window.location.host;
  const canControl = state.connection === 'connected' && state.paired;
  const reconnecting = state.hasPaired && !canControl;
  const lastCommandLabel = state.lastAck ? commandLookup[state.lastAck].label : undefined;
  const statusText = state.lastError
    ? state.lastError
    : lastCommandLabel
      ? `Delivered: ${lastCommandLabel}`
      : state.lastEvent;

  function handleCommand(command: CommandDefinition) {
    sendCommand(command.id, command.profile);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="next" />
          </span>
          <div className="brand-text">
            <h1>Slide Remote</h1>
            <span className="brand-sub">{serverLabel}</span>
          </div>
        </div>
        <StatusPill connection={state.connection} paired={state.paired} />
      </header>

      {!state.hasPaired ? (
        <PairingScreen
          connection={state.connection}
          error={state.lastError}
          onPair={pair}
          serverLabel={serverLabel}
          wsUrl={wsUrl}
        />
      ) : (
        <>
          <nav className="tabs" aria-label="Views">
            <button
              type="button"
              data-active={view === 'remote' || undefined}
              onClick={() => setView('remote')}
            >
              Remote
            </button>
            <button
              type="button"
              data-active={view === 'guide' || undefined}
              onClick={() => setView('guide')}
            >
              Guide
            </button>
          </nav>

          {view === 'remote' ? (
            <section className="remote" aria-label="Presentation remote">
              {reconnecting ? (
                <p className="reconnect" role="status">
                  Reconnecting to laptop…
                </p>
              ) : null}

              <div className="start-row">
                {START_COMMAND_IDS.map((commandId) => (
                  <CommandButton
                    key={commandId}
                    command={commandLookup[commandId]}
                    disabled={!canControl}
                    onCommand={handleCommand}
                    variant="start"
                  />
                ))}
              </div>

              <div className="hero">
                {PRIMARY_COMMAND_IDS.map((commandId) => (
                  <CommandButton
                    key={commandId}
                    command={commandLookup[commandId]}
                    disabled={!canControl}
                    onCommand={handleCommand}
                    variant="hero"
                  />
                ))}
              </div>

              <CommandGroups
                activeProfile={activeProfile}
                disabled={!canControl}
                onCommand={handleCommand}
                onProfileChange={setActiveProfile}
              />

              <TimerPanel />
            </section>
          ) : (
            <GuidePanel />
          )}
        </>
      )}

      <footer className="eventbar" data-error={Boolean(state.lastError) || undefined} aria-live="polite">
        {statusText}
      </footer>
    </main>
  );
}
