import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const dataService = readFileSync(new URL('../src/services/firebaseDataService.js', import.meta.url), 'utf8');

test('counselor access is scoped to assigned students and counselor-owned records', () => {
  assert.match(rules, /isCounselor\(\) && resource\.data\.counselorUid == request\.auth\.uid/);
  assert.match(rules, /match \/consultations\/\{consultationId\} \{[\s\S]*allow read: if isAdmin\(\)[\s\S]*isDocumentCounselor\(resource\.data\.counselorUid\)/);
  assert.match(rules, /match \/appointments\/\{appointmentId\} \{[\s\S]*allow read: if isAdmin\(\)[\s\S]*isDocumentCounselor\(resource\.data\.counselorUid\)/);
  assert.match(rules, /allow create: if validConsultation\(request\.resource\.data\)[\s\S]*isAssignedStudent\(request\.resource\.data\.studentId\)/);
  assert.match(dataService, /where\('counselorUid', '==', session\.user\.uid\)/);
});

test('user approval and student reassignment are administrator-only', () => {
  assert.match(rules, /match \/users\/\{userId\} \{[\s\S]*allow delete: if isAdmin\(\)/);
  assert.match(rules, /match \/students\/\{studentId\} \{[\s\S]*allow create: if isAdmin\(\)/);
  assert.doesNotMatch(dataService, /role === 'counselor'.*'users'/);
});

test('private drafts remain counselor-owned and carry a TTL field', () => {
  assert.match(rules, /match \/consultationDrafts\/\{draftId\} \{[\s\S]*resource\.data\.counselorUid == request\.auth\.uid/);
  assert.match(rules, /data\.expiresAt is timestamp/);
});
