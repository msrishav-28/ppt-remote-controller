'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  COMMANDS,
  PROFILES,
  PRIMARY_COMMAND_IDS,
  START_COMMAND_IDS,
  UTILITY_COMMAND_IDS
} = require('../protocol');

const TONES = new Set(['primary', 'neutral', 'danger']);

test('every command is internally consistent', () => {
  for (const [id, command] of Object.entries(COMMANDS)) {
    assert.equal(command.id, id, `command key "${id}" must match its id`);
    assert.ok(PROFILES[command.profile], `command "${id}" references unknown profile`);
    assert.ok(TONES.has(command.tone), `command "${id}" has invalid tone "${command.tone}"`);
    assert.ok(typeof command.label === 'string' && command.label.length > 0);
    assert.ok(typeof command.shortLabel === 'string' && command.shortLabel.length > 0);
    assert.ok(typeof command.hint === 'string' && command.hint.length > 0);
    assert.ok(Array.isArray(command.keyNames) && command.keyNames.length > 0);
    for (const keyName of command.keyNames) {
      assert.equal(typeof keyName, 'string');
    }
  }
});

test('every profile references valid commands belonging to it', () => {
  for (const [id, profile] of Object.entries(PROFILES)) {
    assert.equal(profile.id, id, `profile key "${id}" must match its id`);
    assert.ok(profile.commandIds.length > 0, `profile "${id}" has no commands`);
    for (const commandId of profile.commandIds) {
      const command = COMMANDS[commandId];
      assert.ok(command, `profile "${id}" references unknown command "${commandId}"`);
      assert.equal(command.profile, id, `command "${commandId}" is not in profile "${id}"`);
    }
  }
});

test('every command appears in exactly one profile', () => {
  const seen = new Map();
  for (const profile of Object.values(PROFILES)) {
    for (const commandId of profile.commandIds) {
      assert.ok(!seen.has(commandId), `command "${commandId}" is listed in multiple profiles`);
      seen.set(commandId, profile.id);
    }
  }
  for (const commandId of Object.keys(COMMANDS)) {
    assert.ok(seen.has(commandId), `command "${commandId}" is not listed in any profile`);
  }
});

test('layout id groups reference real commands', () => {
  for (const id of [...PRIMARY_COMMAND_IDS, ...START_COMMAND_IDS, ...UTILITY_COMMAND_IDS]) {
    assert.ok(COMMANDS[id], `layout group references unknown command "${id}"`);
  }
});
