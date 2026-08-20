import './src/lib/i18n';
import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { onAuthStateChange, getSession } from './src/lib/auth';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { COLORS } from './src/constants/colors';
import { UserProvider } from './src/contexts/UserContext';
import { addNotificationResponseListener, resolvePostDeepLink } from './src/lib/pushNotifications';

const navigationRef = createNavigationContainerRef();

// navigationRef may not be ready yet on a cold start, so retry briefly
// instead of dropping the navigation.
const navigateWhenReady = (route, attempt = 0) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(route.stack, { screen: route.screen, params: route.params });
  } else if (attempt < 10) {
    setTimeout(() => navigateWhenReady(route, attempt + 1), 300);
  }
};

// Shared-post links (outandaround://post/:type/:id, opened from the
// find-mee.com/p/:type/:id web fallback).
const handlePostDeepLink = async (url) => {
  if (!url) return;
  const { path } = Linking.parse(url);
  const parts = (path ?? '').split('/').filter(Boolean);
  if (parts[0] !== 'post' || parts.length < 3) return;
  const [, type, id] = parts;
  const route = await resolvePostDeepLink(type, id);
  if (route) navigateWhenReady(route);
};

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    const { data: { subscription } } = onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const sub = addNotificationResponseListener(navigationRef);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(handlePostDeepLink);
    const sub = Linking.addEventListener('url', ({ url }) => handlePostDeepLink(url));
    return () => sub.remove();
  }, []);

  if (session === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <NavigationContainer ref={navigationRef}>
          {session
            ? <UserProvider><MainNavigator /></UserProvider>
            : <AuthNavigator />
          }
        </NavigationContainer>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
});
