import { httpsCallable, httpsCallableFromURL } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import {
  isValidNotificationEmail,
  loadEmailNotificationPreference,
} from './emailNotificationPreferenceService';

export async function queueDemoAppointmentEmail({
  recipientUid,
  eventKey,
  appointment,
  studentName,
}) {
  if (!auth?.currentUser?.isAnonymous || !functions || !recipientUid) {
    return { queued: false, reason: 'demo-session-unavailable' };
  }

  const preference = await loadEmailNotificationPreference({
    uid: recipientUid,
    demoMode: true,
  });
  if (!preference.appointmentEmailEnabled) {
    return { queued: false, reason: 'disabled' };
  }
  if (!isValidNotificationEmail(preference.email)) {
    return { queued: false, reason: 'email-not-configured' };
  }

  try {
    const isFirebaseHosting = typeof window !== 'undefined'
      && (window.location.hostname.endsWith('.web.app')
        || window.location.hostname.endsWith('.firebaseapp.com'));
    const callable = isFirebaseHosting
      ? httpsCallableFromURL(
        functions,
        `${window.location.origin}/api/sendDemoAppointmentEmail`,
        { timeout: 30000 },
      )
      : httpsCallable(functions, 'sendDemoAppointmentEmail', { timeout: 30000 });
    const result = await callable({
      recipientEmail: preference.email,
      eventKey,
      studentName,
      appointment: {
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        location: appointment.location,
      },
    });
    return result.data || { queued: false };
  } catch (error) {
    return {
      queued: false,
      reason: error?.code || 'send-failed',
      message: error?.message || '',
    };
  }
}
