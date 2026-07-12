import './src/lib/i18n';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { onAuthStateChange, getSession } from './src/lib/auth';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { COLORS } from './src/constants/colors';
import { UserProvider } from './src/contexts/UserContext';

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
        <NavigationContainer>
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
