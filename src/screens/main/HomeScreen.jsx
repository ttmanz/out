import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform } from 'react-native';
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
  const statusBarHeight = StatusBar.currentHeight ?? 44;

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: statusBarHeight + 16 }]} showsVerticalScrollIndicator={false}>

        {/* Top bar — sits below status bar */}
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
    </View>
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
    paddingBottom: 8,
  },
  langOverride: { marginBottom: 0 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38, height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnText: { fontSize: 16 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
  },
  logoutText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  titleSection: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 6,
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
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

  cards: { paddingHorizontal: 28 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermark: { fontSize: 55, opacity: 0.07 },
  iconRing: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 1.5,
    borderColor: COLORS.borderAccent,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  iconInner: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#080500',
    justifyContent: 'center', alignItems: 'center',
  },
  cardEmoji: { fontSize: 24 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  chevron: { fontSize: 22, color: COLORS.primary, marginLeft: 4 },
});

export default HomeScreen;
