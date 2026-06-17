import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { fetchNearbyVenues } from '../../lib/venues';
import { getHappenings } from '../../lib/happenings';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';

const DEFAULT_REGION = {
  latitude: 34.9,
  longitude: 33.1,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const WhereToGoScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [venues, setVenues] = useState([]);
  const [happenings, setHappenings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(null);

    const [locationResult, happeningsRes] = await Promise.all([
      Location.requestForegroundPermissionsAsync()
        .then(({ status }) =>
          status === 'granted'
            ? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            : null
        )
        .catch(() => null),
      getHappenings(),
    ]);

    if (!happeningsRes.error) setHappenings(happeningsRes.data ?? []);

    if (locationResult) {
      const { latitude, longitude } = locationResult.coords;
      setRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      const nearby = await fetchNearbyVenues(latitude, longitude).catch(() => []);
      setVenues(nearby);
    }

    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const memberCount = (venueName) =>
    happenings.filter(
      (h) => h.venue && h.venue.toLowerCase().includes(venueName.toLowerCase())
    ).length;

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('venues.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <AdBanner page="WhereToGo" />
      <ProfileBanner navigation={navigation} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('venues.loading')}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            style={styles.map}
            region={region}
            showsUserLocation
            showsMyLocationButton
            onPress={() => setSelected(null)}
          >
            {venues.map((venue) => (
              <Marker
                key={venue.id}
                coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
                pinColor={COLORS.primary}
                onPress={() => setSelected(venue)}
              />
            ))}
          </MapView>

          {selected && (
            <View style={styles.card}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
              <Text style={styles.venueName}>{selected.name}</Text>
              <Text style={styles.venueType}>{selected.type}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  👥 {memberCount(selected.name)} {t('venues.membersHere')}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  map: { flex: 1 },
  card: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: COLORS.borderAccent,
    padding: 24,
    paddingBottom: 36,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  closeBtn: { position: 'absolute', top: 16, right: 20 },
  closeText: { fontSize: 26, color: COLORS.textMuted, lineHeight: 30 },
  venueName: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4, marginRight: 30 },
  venueType: { fontSize: 13, color: COLORS.textMuted, textTransform: 'capitalize', marginBottom: 16 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});

export default WhereToGoScreen;
