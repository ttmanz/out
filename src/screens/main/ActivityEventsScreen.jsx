import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getActivityEvents, deriveWhen } from '../../lib/activityEvents';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const formatEventDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const EventCard = ({ event, onGoing }) => (
  <View style={styles.card}>
    {!!event.photo_url && (
      <Image source={{ uri: event.photo_url }} style={styles.cardPhoto} resizeMode="cover" />
    )}
    <View style={styles.cardBody}>
      <Text style={styles.eventName}>{event.name}</Text>
      {!!event.venue && <Text style={styles.eventMeta}>📍 {event.venue}</Text>}
      {!!event.event_date && (
        <Text style={styles.eventMeta}>🗓  {formatEventDate(event.event_date)}</Text>
      )}
      {!!event.description && (
        <Text style={styles.eventDesc}>{event.description}</Text>
      )}
      <TouchableOpacity style={styles.goingBtn} onPress={onGoing} activeOpacity={0.8}>
        <Text style={styles.goingBtnText}>I'm Going →</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const ActivityEventsScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { filter } = route.params;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const { data, error } = await getActivityEvents(filter);
    if (!error) setEvents(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleGoing = (event) => {
    navigation.navigate(ROUTES.CREATE_HAPPENING, {
      prefill: {
        title: `Going to ${event.name}`,
        venue: event.venue ?? '',
        when: deriveWhen(event.event_date),
      },
    });
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
      <BackHeader title={t(`happenings.${filter}`).toUpperCase()} onBack={() => navigation.goBack()} />

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={() => (
          <>
            <AdBanner page="HappeningFeed" />
            <ProfileBanner navigation={navigation} />
          </>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No events listed yet — check back soon!</Text>
        }
        renderItem={({ item }) => (
          <EventCard event={item} onGoing={() => handleGoing(item)} />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(ROUTES.CREATE_ACTIVITY_EVENT, { category: filter })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: COLORS.textMuted, fontSize: 15, marginTop: 60, paddingHorizontal: 32, lineHeight: 22 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    overflow: 'hidden',
  },
  cardPhoto: { width: '100%', height: 180 },
  cardBody: { padding: 16 },
  eventName: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  eventMeta: { fontSize: 13, color: COLORS.textMuted, marginBottom: 3 },
  eventDesc: { fontSize: 13, color: COLORS.text, lineHeight: 18, marginTop: 6, marginBottom: 4 },
  goingBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  goingBtnText: { color: COLORS.background, fontWeight: '800', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: COLORS.black, fontSize: 28, lineHeight: 32, fontWeight: '700' },
});

export default ActivityEventsScreen;
