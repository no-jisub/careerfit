export const allowedAttachmentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];

export const maxAttachmentSize = 5 * 1024 * 1024;
export const maxAttachmentCount = 5;

export function validateAttachments(files, existingCount = 0) {
  const items = Array.from(files || []);
  if (existingCount + items.length > maxAttachmentCount) return { error: `파일은 최대 ${maxAttachmentCount}개까지 첨부할 수 있습니다.` };
  const invalidType = items.find(file => !allowedAttachmentTypes.includes(file.type));
  if (invalidType) return { error: 'PDF, DOC, DOCX, PNG, JPG 파일만 첨부할 수 있습니다.' };
  const oversized = items.find(file => file.size > maxAttachmentSize);
  if (oversized) return { error: '파일 한 개의 크기는 5MB를 넘을 수 없습니다.' };
  return { value: items };
}

export function safeAttachmentName(name) {
  return String(name || 'file').normalize('NFKC').replace(/[^A-Za-z0-9._()\-가-힣]/g, '_').slice(0, 120);
}

export function canDeleteAttachment(attachment, { uid, role, appointmentStatus }) {
  if (!attachment || !uid) return false;
  if (role === 'student') return attachment.uploaderUid === uid && appointmentStatus !== 'completed';
  return ['counselor', 'admin'].includes(role);
}
