import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { signOut } from '../../lib/auth';
import LanguagePicker from '../../components/common/LanguagePicker';

const FEATURES = [
  { emoji: '🎉', titleKey: 'home.whatsHappening', route: ROUTES.WHAT_HAPPENING, watermark: '🎆' },
  { emoji: '🗺️', titleKey: 'home.whereToGo', route: ROUTES.WHERE_TO_GO, watermark: '🏙️' },
  { emoji: '⚡', titleKey: 'home.spurOfMoment', route: ROUTES.SPUR_OF_MOMENT, watermark: '⚡' },
  { emoji: '💬', titleKey: 'home.openChat', route: ROUTES.OPEN_CHAT, watermark: '💭' },
  { emoji: '🌙', titleKey: 'home.nightOut', route: ROUTES.NIGHT_OUT, watermark: '🌃' },
];

const FeatureCard = ({ emoji, title, watermark, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.watermarkContainer}>
      <Text style={styles.watermark}>{watermark}</Text>
    </View>
    <View style={styles.iconRing}>
      <View style={styles.iconInner}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
      </View>
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

        {/* Top bar */}
        <View style={styles.topBar}>
          <LanguagePicker style={styles.langOverride} />
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate(ROUTES.PROFILE_SETTINGS)}
            >
              <Text style={styles.iconBtnText}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
              <Text style={styles.logoutText}>↗  {t('auth.logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title section */}
        <View style={styles.titleSection}>
          <Text style={styles.appName}>{t('common.appName')}</Text>
          <Text style={styles.tagline}>{t('home.tagline')}</Text>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerDiamond}>✦</Text>
            <View style={styles.dividerLine} />
          </View>
        </View>

        {/* Feature cards */}
        <View style={styles.cards}>
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.route}
              emoji={f.emoji}
              title={t(f.titleKey)}
              watermark={f.watermark}
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
  scroll: { paddingBottom: 40 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  langOverride: { marginBottom: 0 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnText: { fontSize: 18 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
  },
  logoutText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  titleSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 8,
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    width: '55%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderAccent,
    opacity: 0.5,
  },
  dividerDiamond: {
    color: COLORS.primary,
    fontSize: 10,
    marginHorizontal: 10,
  },

  cards: { paddingHorizontal: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    paddingVertical: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermark: { fontSize: 70, opacity: 0.07 },
  iconRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1.5,
    borderColor: COLORS.borderAccent,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  iconInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#080500',
    justifyContent: 'center', alignItems: 'center',
  },
  cardEmoji: { fontSize: 30 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text },
  chevron: { fontSize: 24, color: COLORS.primary, marginLeft: 4 },
});

export default HomeScreen;
