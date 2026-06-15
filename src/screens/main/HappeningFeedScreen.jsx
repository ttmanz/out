import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getHappenings } from '../../lib/happenings';
import { formatAgo } from '../../utils/format';

const distanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const HappeningCard = ({ item, distKm, navigation }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation?.navigate(ROUTES.MEMBER_PROFILE, { userId: item.user_id, fullName: item.profiles?.full_name })}>
          <Text style={styles.posterName}>{item.profiles?.full_name ?? 'Someone'}</Text>
        </TouchableOpacity>
        <Text style={styles.time}>{formatAgo(item.created_at)}</Text>
      </View>
      {distKm != null && (
        <Text style={styles.distance}>{distKm < 1 ? '<1 km' : `${distKm.toFixed(1)} km`}</Text>
      )}
    </View>
    <Text style={styles.title}>{item.title}</Text>
    {!!item.venue && <Text style={styles.meta}>📍 {item.venue}</Text>}
    {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
  </View>
);

const HappeningFeedScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const filter = route.params?.filter ?? 'nearby';
  const [happenings, setHappenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    const [happeningsRes] = await Promise.all([
      getHappenings(),
      filter === 'nearby'
        ? Location.requestForegroundPermissionsAsync()
            .then(({ status }) => status === 'granted'
              ? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
              : null)
            .then(pos => pos && setUserLocation(pos.coords))
            .catch(() => null)
        : Promise.resolve(),
    ]);

    if (!happeningsRes.error) setHappenings(happeningsRes.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const base = happenings.filter((h) => h.happening_at === filter);
    if (filter !== 'nearby' || !userLocation) return base;
    return [...base]
      .map((h) => ({
        ...h,
        _dist: h.latitude != null
          ? distanceKm(userLocation.latitude, userLocation.longitude, h.latitude, h.longitude)
          : null,
      }))
      .sort((a, b) => {
        if (a._dist == null && b._dist == null) return 0;
        if (a._dist == null) return 1;
        if (b._dist == null) return -1;
        return a._dist - b._dist;
      });
  }, [happenings, filter, userLocation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t(`happenings.${filter}`).toUpperCase()}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{t('happenings.noHappenings')}</Text>
        }
        renderItem={({ item }) => (
          <HappeningCard item={item} distKm={item._dist ?? null} navigation={navigation} />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(ROUTES.CREATE_HAPPENING)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  list: { padding: 16, paddingBottom: 100 },
  empty: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: 60,
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  posterName: { fontWeight: '700', fontSize: 14, color: COLORS.text },
  time: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  distance: {
    fontSize: 12,
    fontWeight: '700',
    color: '#24c6fb',
    backgroundColor: '#e8f9ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  meta: { fontSize: 13, color: COLORS.textMuted, marginBottom: 3 },
  desc: { fontSize: 13, color: COLORS.text, marginTop: 6, lineHeight: 18 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#24c6fb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: COLORS.white, fontSize: 28, lineHeight: 32, fontWeight: '400' },
});

export default HappeningFeedScreen;
