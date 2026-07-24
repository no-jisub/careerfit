export const DEMO_COUNSELOR_UID = 'demo-counselor';
export const DEMO_STUDENT_UID = 'demo-student-s1';
export const DEMO_STUDENT_ID = 's1';

export const DEMO_STORAGE_KEYS = Object.freeze({
  users: 'careerfit_users',
  studentRegistrations: 'careerfit_student_registrations',
  students: 'careerfit_students',
  consultations: 'careerfit_consultations',
  consultationSummaries: 'careerfit_consultation_summaries',
  consultationNotes: 'careerfit_consultation_notes',
  consultationDrafts: 'careerfit_consultation_drafts',
  followUps: 'careerfit_followups',
  appointments: 'careerfit_appointments',
  counselorAvailability: 'careerfit_counselor_availability',
  notifications: 'careerfit_notifications',
  programs: 'careerfit_program_store',
  programRecommendations: 'careerfit_program_recommendation_store',
});

export function getSessionActorUid({ userUid = '', profileId = '', role = '' } = {}) {
  if (userUid) return userUid;
  if (profileId) return profileId;
  if (role === 'counselor') return DEMO_COUNSELOR_UID;
  if (role === 'student') return DEMO_STUDENT_UID;
  return '';
}

export function filterNotificationsForRecipient(notifications = [], recipientUid = '') {
  if (!recipientUid) return [];
  return notifications.filter(item => item.recipientUid === recipientUid);
}

