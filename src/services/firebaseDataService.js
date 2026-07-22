import { collection, doc, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, firestoreSyncEnabled } from '../lib/firebase';
import { isOperationsStaff } from '../utils/roles';

const collectionNamesFor = role => {
  if (role === 'student') return ['students', 'consultationSummaries', 'followUps', 'appointments', 'counselorAvailability'];
  return ['users', 'studentRegistrations', 'students', 'consultations', 'consultationSummaries', 'consultationNotes', 'followUps', 'appointments', 'counselorAvailability'];
};

function constraintsFor(name, session) {
  if (isOperationsStaff(session.role)) return [];
  if (name === 'students') return [where('uid', '==', session.user.uid)];
  if (name === 'consultations') return [where('studentUid', '==', session.user.uid), where('studentVisible', '==', true)];
  if (name === 'consultationSummaries') return [where('studentUid', '==', session.user.uid), where('published', '==', true)];
  if (name === 'appointments') return [where('studentUid', '==', session.user.uid)];
  if (name === 'counselorAvailability') return [where('status', '==', 'open')];
  return [where('assigneeUid', '==', session.user.uid)];
}

export function subscribeCareerData(session, handlers, onError) {
  if (!firestoreSyncEnabled || !session.user || !session.role) return () => {};
  const unsubscribes = collectionNamesFor(session.role).map(name => {
    const source = collection(db, name);
    const scopedQuery = query(source, ...constraintsFor(name, session));
    return onSnapshot(scopedQuery, snapshot => {
      handlers[name](snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, onError);
  });
  return () => unsubscribes.forEach(unsubscribe => unsubscribe());
}

export async function saveCareerDocument(name, record) {
  if (!firestoreSyncEnabled) return;
  if (!record?.id) throw new Error(`Firestore document id is required for ${name}.`);
  const { id, ...data } = record;
  await setDoc(doc(db, name, id), data, { merge: true });
}

export async function saveCareerDocumentGroup(entries) {
  if (!firestoreSyncEnabled || !entries.length) return;
  for (let offset = 0; offset < entries.length; offset += 400) {
    const batch = writeBatch(db);
    entries.slice(offset, offset + 400).forEach(({ name, record }) => {
      if (!record?.id) throw new Error(`Firestore document id is required for ${name}.`);
      const { id, ...data } = record;
      batch.set(doc(db, name, id), data, { merge: true });
    });
    await batch.commit();
  }
}
