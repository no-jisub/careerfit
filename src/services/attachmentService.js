import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage, firestoreSyncEnabled } from '../lib/firebase';
import { safeAttachmentName } from '../utils/attachments';

export async function uploadAppointmentAttachment({ file, appointmentId, studentUid, counselorUid, uploaderUid }) {
  const id = `attachment-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const fileName = safeAttachmentName(file.name);
  const storagePath = `appointmentAttachments/${appointmentId}/${id}/${fileName}`;
  if (firestoreSyncEnabled && storage) {
    await uploadBytes(ref(storage, storagePath), file, { contentType: file.type, customMetadata: { appointmentId, studentUid, counselorUid, uploaderUid } });
  }
  return { id, appointmentId, studentUid, counselorUid, uploaderUid, fileName, size: file.size, contentType: file.type, storagePath, createdAt: new Date().toISOString() };
}

export async function openAttachment(attachment) {
  if (!firestoreSyncEnabled || !storage) return null;
  const url = await getDownloadURL(ref(storage, attachment.storagePath));
  window.open(url, '_blank', 'noopener,noreferrer');
  return url;
}

export async function deleteStoredAttachment(attachment) {
  if (!firestoreSyncEnabled || !storage || !attachment?.storagePath) return;
  await deleteObject(ref(storage, attachment.storagePath));
}
