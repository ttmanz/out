import './src/lib/i18n'; // i18n must be imported before any screen renders
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { onAuthStateChange } from './src/lib/auth';
import AuthNavigator from './src/navigation/AuthNavigator';
import { COLORS } from './src/constants/colors';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Show spinner while session is being resolved
  if (session === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* session === null → not logged in → show auth screens */}
      {/* session exists → logged in → main app navigator goes here */}
      <AuthNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
});
