import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { signOut } from '../../lib/auth';

const HomeScreen = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
      <Text style={styles.subtitle}>Welcome!</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  subtitle: { fontSize: 18, color: COLORS.textMuted, marginBottom: 40 },
  logoutBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.backgroundDark, borderRadius: 10 },
  logoutText: { color: COLORS.text, fontWeight: '600' },
});

export default HomeScreen;
