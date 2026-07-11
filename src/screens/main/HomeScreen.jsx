import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { signOut } from '../../lib/auth';
import { useUser } from '../../contexts/UserContext';
import LanguagePicker from '../../components/common/LanguagePicker';

const FEATURES = [
  { emoji: '👥', titleKey: 'home.friends',        descKey: 'home.friendsDesc',        route: ROUTES.FRIENDS_HUB,    watermark: '🤝' },
  { emoji: '📸', titleKey: 'home.myStory',        descKey: 'home.myStoryDesc',        route: ROUTES.STORY_FEED,     watermark: '🌟' },
  { emoji: '🎉', titleKey: 'home.whatsHappening', descKey: 'home.whatsHappeningDesc', route: ROUTES.WHAT_HAPPENING, watermark: '🎆' },
  { emoji: '🗺️', titleKey: 'home.whereToGo',      descKey: 'home.whereToGoDesc',      route: ROUTES.WHERE_TO_GO,    watermark: '🏙️' },
  { emoji: '⚡', titleKey: 'home.spurOfMoment',   descKey: 'home.spurOfMomentDesc',   route: ROUTES.SPUR_OF_MOMENT, watermark: '⚡' },
  { emoji: '💬', titleKey: 'home.openChat',        descKey: 'home.openChatDesc',       route: ROUTES.OPEN_CHAT,      watermark: '💭' },
  { emoji: '📍', titleKey: 'home.atVenue',         descKey: 'home.atVenueDesc',        route: ROUTES.AT_VENUE,       watermark: '👥' },
  { emoji: '🏛️', titleKey: 'home.clubGroups',      descKey: 'home.clubGroupsDesc',     route: ROUTES.CLUB_GROUPS,    watermark: '🎭' },
  { emoji: '🧩', titleKey: 'home.openGroups',      descKey: 'home.openGroupsDesc',     route: ROUTES.OPEN_GROUPS,    watermark: '🌐' },
  { emoji: '🍸', titleKey: 'home.venue',           descKey: 'home.venueDesc',          route: ROUTES.VENUE_HUB,      watermark: '📍' },
  { emoji: '🛍️', titleKey: 'home.market',          descKey: 'home.marketDesc',         route: ROUTES.MARKET,         watermark: '🏷️' },
];

const RESTRICTED_ROUTES = new Set([ROUTES.WHERE_TO_GO, ROUTES.VENUE_HUB]);

const FeatureCard = ({ emoji, title, description, watermark, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.watermarkContainer}>
      <Text style={styles.watermark}>{watermark}</Text>
    </View>
    <View style={styles.iconRing}>
      <View style={styles.iconInner}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
      </View>
    </View>
    <View style={styles.textWrap}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{description}</Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const statusBarHeight = StatusBar.currentHeight ?? 44;

  const isRestricted = profile?.status === 'restricted';
  const needsProfile = profile && !profile.profile_completed;
  const visibleFeatures = isRestricted
    ? FEATURES.filter((f) => RESTRICTED_ROUTES.has(f.route))
    : FEATURES;

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: statusBarHeight + 16 }]} showsVerticalScrollIndicator={false}>

        <View style={styles.topBar}>
          <LanguagePicker style={styles.langOverride} />
          <View style={styles.topActions}>
            {!isRestricted && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate(ROUTES.PROFILE_SETTINGS)}
              >
                <Text style={styles.iconBtnText}>⚙️</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
              <Text style={styles.logoutText}>↗  {t('auth.logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.appName}>{t('common.appName')}</Text>
          <Text style={styles.tagline}>{t('home.tagline')}</Text>
          {isRestricted && (
            <Text style={styles.restrictedNote}>Limited access</Text>
          )}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerDiamond}>✦</Text>
            <View style={styles.dividerLine} />
          </View>
        </View>

        {needsProfile && (
          <TouchableOpacity
            style={styles.profileBanner}
            onPress={() => navigation.navigate(ROUTES.COMPLETE_PROFILE)}
            activeOpacity={0.85}
          >
            <Text style={styles.profileBannerText}>✦  Complete your profile for full access</Text>
            <Text style={styles.profileBannerCta}>Tap to finish →</Text>
          </TouchableOpacity>
        )}

        <View style={styles.cards}>
          {visibleFeatures.map((f) => (
            <FeatureCard
              key={f.route}
              emoji={f.emoji}
              title={t(f.titleKey)}
              description={t(f.descKey)}
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
  restrictedNote: {
    fontSize: 11,
    color: '#f39c12',
    marginTop: 4,
    letterSpacing: 1,
    fontWeight: '600',
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

  profileBanner: {
    marginHorizontal: 28,
    marginBottom: 14,
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  profileBannerText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  profileBannerCta: { fontSize: 12, color: COLORS.textMuted },

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
  textWrap: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  cardDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 15 },
  chevron: { fontSize: 22, color: COLORS.primary, marginLeft: 4 },
});

export default HomeScreen;
