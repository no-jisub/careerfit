import test from 'node:test';
import assert from 'node:assert/strict';
import { isOperationsStaff } from '../src/utils/roles.js';

test('counselors and legacy admins share operational management access', () => {
  assert.equal(isOperationsStaff('counselor'), true);
  assert.equal(isOperationsStaff('admin'), true);
  assert.equal(isOperationsStaff('student'), false);
  assert.equal(isOperationsStaff(), false);
});
