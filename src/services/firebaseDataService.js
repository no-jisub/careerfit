import { collection, doc, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, firestoreSyncEnabled } from '../lib/firebase';

const collectionNames = ['students', 'consultations', 'followUps'];

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
  const unsubscribes = collectionNames.map(name => {
    const source = collection(db, name);
    const scopedQuery = query(source, ...constraintsFor(name, session));
    return onSnapshot(scopedQuery, snapshot => {
      handlers[name](snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, onError);
  });
  return () => unsubscribes.forEach(unsubscribe => unsubscribe());
}

export async function saveCareerRecords(name, records) {
  if (!firestoreSyncEnabled || !records.length) return;
  if (records.length === 1) {
    const record = records[0];
    await setDoc(doc(db, name, record.id), record, { merge: true });
    return;
  }
  const batch = writeBatch(db);
  records.forEach(record => batch.set(doc(db, name, record.id), record, { merge: true }));
  await batch.commit();
}
