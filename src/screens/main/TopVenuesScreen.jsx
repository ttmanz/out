import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getTopVenues, matchesCategory } from '../../lib/venues';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import CategoryFilter from '../../components/common/CategoryFilter';
import BackHeader from '../../components/common/BackHeader';

const MEDALS = ['🥇', '🥈', '🥉'];

const TopVenuesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [venues, setVenues] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

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

  const visibleVenues = venues.filter((v) => matchesCategory(category, v.category));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <BackHeader title={t('venueHub.topVenues')} onBack={() => navigation.goBack()} />

      <FlatList
        data={visibleVenues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <>
            <AdBanner page="TopVenues" />
            <ProfileBanner navigation={navigation} />
            <CategoryFilter selected={category} onSelect={setCategory} />
          </>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('venueHub.noTop')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openMaps(item)} activeOpacity={0.8}>
            <View style={styles.rankWrap}>
              <Text style={styles.medal}>{MEDALS[item.rank - 1] ?? `#${item.rank}`}</Text>
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
