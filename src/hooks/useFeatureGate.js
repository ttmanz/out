import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ROUTES } from '../constants/routes';
import { useUser } from '../contexts/UserContext';

// Bounce back to Home if an admin has disabled this feature. Belt-and-suspenders
// for deep links, notification taps and stale navigation state — the Home card
// is already hidden, this covers every other way in.
export const useFeatureGate = (featureKey) => {
  const { isFeatureEnabled, canAccessFeature } = useUser();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      if (isFeatureEnabled(featureKey) === false) {
        navigation.navigate(ROUTES.HOME);
        return;
      }
      // Locked by membership level: explain which level unlocks it.
      const access = canAccessFeature(featureKey);
      if (access.locked) {
        navigation.navigate(ROUTES.SUBSCRIPTION, { lockedFeature: featureKey, requiredTier: access.requiredTier });
      }
    }, [featureKey, isFeatureEnabled, canAccessFeature, navigation])
  );
};
