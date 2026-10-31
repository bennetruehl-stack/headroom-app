import type { Job, ProfileStatus } from '@headroom/core';
import type { FeatureName } from '@headroom/core';
import type { MessageKey } from '../i18n/translations';

export const profileChoices: { value: ProfileStatus; key: MessageKey }[] = [
  { value: 'Student', key: 'profileStudent' },
  { value: 'Working student', key: 'profileWorking' },
  { value: 'Mini-jobber', key: 'profileMini' },
  { value: 'Employee', key: 'profileEmployee' },
  { value: 'Pupil', key: 'profilePupil' },
  { value: 'School leaver', key: 'profileSchoolLeaver' },
  { value: 'Apprentice', key: 'profileApprentice' },
];

export const employmentTypes: { value: Job['type']; key: MessageKey }[] = [
  { value: 'mini-job', key: 'typeMini' },
  { value: 'short-term', key: 'typeShort' },
  { value: 'working student', key: 'typeWorking' },
  { value: 'regular', key: 'typeRegular' },
];

export const featureLabels: Record<FeatureName, MessageKey> = {
  jobBoard: 'featureBoard',
  partnerRecommendations: 'featurePartners',
  premium: 'featurePremium',
  peerStats: 'featurePeers',
  osmCompanyCheck: 'featureOsm',
};
