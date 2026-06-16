import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';

const OPTIONS = [
  { emoji: '🔍', titleKey: 'venueHub.search',     descKey: 'venueHub.searchDesc',     route: ROUTES.VENUE_SEARCH,    watermark: '🗺️' },
  { emoji: '👥', titleKey: 'venueHub.membersAt',  descKey: 'venueHub.membersAtDesc',  route: ROUTES.MEMBERS_AT,      watermark: '📍' },
  { emoji: '🔥', titleKey: 'venueHub.trending',   descKey: 'venueHub.trendingDesc',   route: ROUTES.TRENDING_VENUES, watermark: '📈' },
  { emoji: '🏆', titleKey: 'venueHub.topVenues',  descKey: 'venueHub.topVenuesDesc',  route: ROUTES.TOP_VENUES,      watermark: '⭐' },
];

const VenueHubScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const statusBarHeight = StatusBar.currentHeight ?? 44;

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('home.venue')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.route}
            style={styles.card}
            onPress={() => navigation.navigate(opt.route)}
            activeOpacity={0.8}
          >
            <View style={styles.watermarkContainer}>
              <Text style={styles.watermark}>{opt.watermark}</Text>
            </View>
            <View style={styles.iconRing}>
              <View style={styles.iconInner}>
                <Text style={styles.emoji}>{opt.emoji}</Text>
              </View>
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.cardTitle}>{t(opt.titleKey)}</Text>
              <Text style={styles.cardDesc}>{t(opt.descKey)}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.borderAccent,
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute', right: 8, top: 0, bottom: 0, width: 80,
    justifyContent: 'center', alignItems: 'center',
  },
  watermark: { fontSize: 55, opacity: 0.07 },
  iconRing: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 1.5, borderColor: COLORS.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  iconInner: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#080500', justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 24 },
  textWrap: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  cardDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  chevron: { fontSize: 22, color: COLORS.primary, marginLeft: 4 },
});

export default VenueHubScreen;
