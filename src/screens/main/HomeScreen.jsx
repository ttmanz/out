import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { signOut } from '../../lib/auth';
import LanguagePicker from '../../components/common/LanguagePicker';

const FEATURES = [
  { emoji: '🎉', titleKey: 'home.whatsHappening', route: ROUTES.WHAT_HAPPENING, iconBg: COLORS.blueBg },
  { emoji: '🗺️', titleKey: 'home.whereToGo', route: ROUTES.WHERE_TO_GO, iconBg: COLORS.tealBg },
  { emoji: '⚡', titleKey: 'home.spurOfMoment', route: ROUTES.SPUR_OF_MOMENT, iconBg: COLORS.amberBg },
  { emoji: '💬', titleKey: 'home.openChat', route: ROUTES.OPEN_CHAT, iconBg: COLORS.indigoBg },
  { emoji: '🌙', titleKey: 'home.nightOut', route: ROUTES.NIGHT_OUT, iconBg: COLORS.purpleBg },
];

const FeatureCard = ({ emoji, title, iconBg, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.72}>
    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.appName}>{t('common.appName')}</Text>
          <View style={styles.headerActions}>
            <LanguagePicker />
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate(ROUTES.PROFILE_SETTINGS)}
            >
              <Text style={styles.iconBtnText}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
              <Text style={styles.logoutText}>{t('auth.logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cards}>
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.route}
              emoji={f.emoji}
              title={t(f.titleKey)}
              iconBg={f.iconBg}
              onPress={() => navigation.navigate(f.route)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  appName: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnText: { fontSize: 16 },
  logoutBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
  },
  logoutText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 12 },
  cards: { paddingHorizontal: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 50, height: 50,
    borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  cardEmoji: { fontSize: 26 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  chevron: { fontSize: 22, color: COLORS.textMuted, marginLeft: 8 },
});

export default HomeScreen;
