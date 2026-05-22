import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommandId, ProfileId } from '../protocol';
import type { ClientMessage, RemoteSocketState, ServerMessage } from './types';

const INITIAL_RECONNECT_MS = 600;
const MAX_RECONNECT_MS = 4000;

function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = window.location.port === '5173' ? '3000' : window.location.port;

  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

function parseServerMessage(data: string): ServerMessage | undefined {
  try {
    const parsed = JSON.parse(data) as ServerMessage;
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isPairingError(code?: string) {
  return code === 'pairing_failed' || code === 'pairing_locked';
}

export function useRemoteSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | undefined>(undefined);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_MS);
  const lastPinRef = useRef('');
  const [state, setState] = useState<RemoteSocketState>({
    connection: 'connecting',
    paired: false,
    hasPaired: false,
    lastEvent: 'Connecting to laptop'
  });

  const send = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setState((current) => ({
        ...current,
        connection: 'disconnected',
        paired: false,
        lastError: 'Remote is disconnected.',
        lastEvent: 'Disconnected'
      }));
      return false;
    }

    ws.send(JSON.stringify(message));
    return true;
  }, []);

  const pair = useCallback((pin: string) => {
    const normalizedPin = pin.trim();
    lastPinRef.current = normalizedPin;
    return send({ type: 'pair', pin: normalizedPin });
  }, [send]);

  const sendCommand = useCallback((command: CommandId, profile: ProfileId) => {
    const sent = send({ type: 'command', command, profile });
    if (sent) {
      navigator.vibrate?.(18);
      setState((current) => ({
        ...current,
        lastError: undefined,
        lastEvent: 'Command sent'
      }));
    }
    return sent;
  }, [send]);

  useEffect(() => {
    function connect() {
      window.clearTimeout(reconnectTimerRef.current);
      setState((current) => ({
        ...current,
        connection: 'connecting',
        paired: false,
        lastEvent: 'Connecting to laptop'
      }));

      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        if (wsRef.current !== ws) {
          return;
        }
        reconnectDelayRef.current = INITIAL_RECONNECT_MS;
        setState((current) => ({
          ...current,
          connection: 'connected',
          lastError: undefined,
          lastEvent: 'Connected'
        }));

        if (lastPinRef.current) {
          ws.send(JSON.stringify({ type: 'pair', pin: lastPinRef.current } satisfies ClientMessage));
        }
      });

      ws.addEventListener('message', (event) => {
        if (wsRef.current !== ws) {
          return;
        }
        const message = parseServerMessage(event.data);
        if (!message) {
          return;
        }

        if (message.type === 'status') {
          setState((current) => ({
            ...current,
            connection: message.connected ? 'connected' : current.connection,
            paired: message.paired,
            hasPaired: current.hasPaired || message.paired,
            lastError: undefined,
            lastEvent: message.paired ? 'Paired and ready' : 'Connected'
          }));
          return;
        }

        if (message.type === 'paired') {
          setState((current) => ({
            ...current,
            connection: 'connected',
            paired: true,
            hasPaired: true,
            lastError: undefined,
            lastEvent: 'Paired and ready'
          }));
          return;
        }

        if (message.type === 'ack') {
          setState((current) => ({
            ...current,
            lastAck: message.command,
            lastError: undefined,
            lastEvent: message.dryRun ? 'Command sent (dry run)' : 'Command delivered'
          }));
          return;
        }

        if (message.type === 'error') {
          const pairingError = isPairingError(message.code);
          setState((current) => ({
            ...current,
            paired: pairingError ? false : current.paired,
            hasPaired: pairingError ? false : current.hasPaired,
            lastError: message.message,
            lastEvent: message.message
          }));
        }
      });

      ws.addEventListener('close', () => {
        if (wsRef.current !== ws) {
          return;
        }
        wsRef.current = null;

        setState((current) => ({
          ...current,
          connection: 'disconnected',
          paired: false,
          lastEvent: 'Reconnecting to laptop'
        }));

        reconnectTimerRef.current = window.setTimeout(connect, reconnectDelayRef.current);
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 1.5, MAX_RECONNECT_MS);
      });

      ws.addEventListener('error', () => {
        if (wsRef.current !== ws) {
          return;
        }
        setState((current) => ({
          ...current,
          connection: 'error',
          paired: false,
          lastError: 'Could not reach the laptop remote server.',
          lastEvent: 'Connection error'
        }));
      });
    }

    connect();

    return () => {
      window.clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, []);

  return {
    pair,
    sendCommand,
    state,
    wsUrl: getWebSocketUrl()
  };
}
