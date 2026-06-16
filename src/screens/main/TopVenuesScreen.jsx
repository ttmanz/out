import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, StatusBar, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getTopVenues } from '../../lib/venues';

const MEDALS = ['🥇', '🥈', '🥉'];

const TopVenuesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const statusBarHeight = StatusBar.currentHeight ?? 44;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getTopVenues();
    if (!error) setVenues(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openMaps = (venue) => {
    const query = encodeURIComponent(venue.address || venue.name);
    Linking.openURL(`https://www.google.com/maps/search/${query}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('venueHub.topVenues')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={venues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('venueHub.noTop')}</Text>}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.card} onPress={() => openMaps(item)} activeOpacity={0.8}>
            <View style={styles.rankWrap}>
              <Text style={styles.medal}>{MEDALS[index] ?? `#${index + 1}`}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.venueName}>{item.name}</Text>
              {!!item.address && <Text style={styles.address}>📍 {item.address}</Text>}
              {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
            </View>
            <Text style={styles.mapsHint}>🗺️</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  list: { padding: 16, paddingBottom: 40 },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 60 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  rankWrap: { width: 44, alignItems: 'center' },
  medal: { fontSize: 26 },
  cardContent: { flex: 1, paddingHorizontal: 12 },
  venueName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  address: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  desc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  mapsHint: { fontSize: 22 },
});

export default TopVenuesScreen;
