import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdministrator, isOperationsStaff } from '../src/utils/roles.js';

test('counselors and legacy admins share operational management access', () => {
  assert.equal(isOperationsStaff('counselor'), true);
  assert.equal(isOperationsStaff('admin'), true);
  assert.equal(isOperationsStaff('student'), false);
  assert.equal(isOperationsStaff(), false);
});

test('only administrators can manage users and assignments', () => {
  assert.equal(isAdministrator('admin'), true);
  assert.equal(isAdministrator('counselor'), false);
  assert.equal(isAdministrator('student'), false);
});
