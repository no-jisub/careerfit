import test from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteAttachment, safeAttachmentName, validateAttachments } from '../src/utils/attachments.js';

test('attachment validation enforces type, size, and count limits', () => {
  assert.ok(validateAttachments([{ name: 'resume.pdf', type: 'application/pdf', size: 1024 }]).value);
  assert.match(validateAttachments([{ name: 'tool.exe', type: 'application/octet-stream', size: 10 }]).error, /PDF/);
  assert.match(validateAttachments([{ name: 'large.pdf', type: 'application/pdf', size: 6 * 1024 * 1024 }]).error, /5MB/);
  assert.match(validateAttachments([{ name: 'a.pdf', type: 'application/pdf', size: 1 }], 5).error, /최대 5개/);
});

test('attachment names are normalized and delete permission follows appointment state', () => {
  assert.equal(safeAttachmentName('자기 소개서 최종.pdf'), '자기_소개서_최종.pdf');
  const attachment = { uploaderUid: 'student-1' };
  assert.equal(canDeleteAttachment(attachment, { uid: 'student-1', role: 'student', appointmentStatus: 'confirmed' }), true);
  assert.equal(canDeleteAttachment(attachment, { uid: 'student-1', role: 'student', appointmentStatus: 'completed' }), false);
  assert.equal(canDeleteAttachment(attachment, { uid: 'counselor-1', role: 'counselor', appointmentStatus: 'completed' }), true);
});
