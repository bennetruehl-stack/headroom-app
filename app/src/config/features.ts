export type FeatureName='scheduleScan'|'jobBoard'|'partnerRecommendations'|'premium'|'peerStats'|'osmCompanyCheck';
export const defaultFeatures:Record<FeatureName,boolean>={scheduleScan:false,jobBoard:false,partnerRecommendations:false,premium:false,peerStats:false,osmCompanyCheck:false};
