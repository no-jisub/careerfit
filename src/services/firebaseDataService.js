import { collection, doc, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, firestoreSyncEnabled } from '../lib/firebase';

const collectionNamesFor = role => role === 'student' ? ['students', 'consultations', 'followUps'] : ['students', 'consultations', 'consultationNotes', 'followUps'];

function constraintsFor(name, session) {
  if (session.role === 'admin') return [];
  if (session.role === 'counselor') {
    return [where(name === 'followUps' ? 'ownerUid' : 'counselorUid', '==', session.user.uid)];
  }
  if (name === 'students') return [where('uid', '==', session.user.uid)];
  if (name === 'consultations') return [where('studentUid', '==', session.user.uid), where('studentVisible', '==', true)];
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
  await setDoc(doc(db, name, record.id), record, { merge: true });
}

export async function saveCareerDocumentGroup(entries) {
  if (!firestoreSyncEnabled || !entries.length) return;
  const batch = writeBatch(db);
  entries.forEach(({ name, record }) => {
    if (!record?.id) throw new Error(`Firestore document id is required for ${name}.`);
    batch.set(doc(db, name, record.id), record, { merge: true });
  });
  await batch.commit();
}
