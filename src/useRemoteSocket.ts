import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommandId, ProfileId } from '../protocol';
import type { ClientMessage, RemoteSocketState, ServerMessage } from './types';

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

export function useRemoteSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | undefined>(undefined);
  const reconnectDelayRef = useRef(600);
  const lastPinRef = useRef('');
  const shouldReconnectRef = useRef(true);
  const [state, setState] = useState<RemoteSocketState>({
    connection: 'connecting',
    paired: false,
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
      navigator.vibrate?.(25);
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
        reconnectDelayRef.current = 600;
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
        const message = parseServerMessage(event.data);
        if (!message) {
          return;
        }

        if (message.type === 'status') {
          setState((current) => ({
            ...current,
            connection: message.connected ? 'connected' : current.connection,
            paired: message.paired,
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
            lastEvent: message.dryRun ? 'Command acknowledged in dry run' : 'Command acknowledged'
          }));
          return;
        }

        if (message.type === 'error') {
          setState((current) => ({
            ...current,
            lastError: message.message,
            lastEvent: message.message
          }));
        }
      });

      ws.addEventListener('close', () => {
        if (!shouldReconnectRef.current) {
          return;
        }

        setState((current) => ({
          ...current,
          connection: 'disconnected',
          paired: false,
          lastEvent: 'Disconnected'
        }));

        reconnectTimerRef.current = window.setTimeout(connect, reconnectDelayRef.current);
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 1.5, 4000);
      });

      ws.addEventListener('error', () => {
        setState((current) => ({
          ...current,
          connection: 'error',
          paired: false,
          lastError: 'Could not reach the laptop remote server.',
          lastEvent: 'Connection error'
        }));
      });
    }

    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      window.clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return {
    pair,
    sendCommand,
    state,
    wsUrl: getWebSocketUrl()
  };
}
