import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getRecentVenueSearches } from '../../lib/venues';

const TrendingVenuesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const statusBarHeight = StatusBar.currentHeight ?? 44;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getRecentVenueSearches();
    if (!error && data) {
      const counts = {};
      data.forEach(({ venue_name }) => {
        const key = venue_name.toLowerCase().trim();
        counts[key] = (counts[key] ?? 0) + 1;
      });
      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([name, count], i) => ({ id: String(i), name, count }));
      setTrending(sorted);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
        <Text style={styles.headerTitle}>{t('venueHub.trending')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={trending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('venueHub.noTrending')}</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <View style={styles.rowContent}>
              <Text style={styles.venueName}>{item.name}</Text>
              <Text style={styles.searchCount}>🔍 {item.count} searches this week</Text>
            </View>
            {index === 0 && <Text style={styles.fire}>🔥</Text>}
          </View>
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
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  rank: { fontSize: 18, fontWeight: '800', color: COLORS.primary, width: 36 },
  rowContent: { flex: 1 },
  venueName: { fontSize: 15, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  searchCount: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  fire: { fontSize: 20 },
});

export default TrendingVenuesScreen;
