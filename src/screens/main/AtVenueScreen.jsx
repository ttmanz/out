import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getSession } from '../../lib/auth';
import { upsertCheckin, getRecentCheckins } from '../../lib/checkins';
import { distanceKm } from '../../utils/geo';
import BackHeader from '../../components/common/BackHeader';

const VENUE_RADIUS_KM = 0.3;

const memberInitial = (name) => name?.[0]?.toUpperCase() ?? '?';

const MemberPin = ({ initial }) => (
  <View style={styles.pin}>
    <Text style={styles.pinText}>{initial}</Text>
  </View>
);

const AtVenueScreen = ({ navigation }) => {
  const { t } = useTranslation();

  const [myLocation, setMyLocation] = useState(null);
  const [nearbyMembers, setNearbyMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationDenied(true);
      setLoading(false);
      return;
    }

    const [position, { data: { session } }] = await Promise.all([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      getSession(),
    ]);

    const { latitude, longitude } = position.coords;
    setMyLocation({ latitude, longitude });

    const [, { data: checkins }] = await Promise.all([
      session ? upsertCheckin(session.user.id, latitude, longitude) : Promise.resolve(),
      getRecentCheckins(),
    ]);
    const myId = session?.user?.id;

    const nearby = (checkins ?? []).filter(
      (c) =>
        c.user_id !== myId &&
        c.profiles?.visibility !== 'private' &&
        distanceKm(latitude, longitude, c.latitude, c.longitude) <= VENUE_RADIUS_KM
    );

    setNearbyMembers(nearby);
    setLoading(false);
  }, []);

  useFocusEffect(load);

  const region = useMemo(
    () => myLocation ? { ...myLocation, latitudeDelta: 0.003, longitudeDelta: 0.003 } : null,
    [myLocation]
  );

  return (
    <View style={styles.safe}>
      <BackHeader
        title={t('home.atVenue')}
        onBack={() => navigation.goBack()}
        right={(
          <TouchableOpacity onPress={load} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('venues.loading')}</Text>
        </View>
      ) : locationDenied ? (
        <View style={styles.center}>
          <Text style={styles.deniedIcon}>📍</Text>
          <Text style={styles.deniedText}>{t('atVenue.locationRequired')}</Text>
        </View>
      ) : region ? (
        <View style={{ flex: 1 }}>
          <MapView
            style={styles.map}
            region={region}
            showsUserLocation
            showsMyLocationButton={false}
            onPress={() => setSelected(null)}
          >
            {nearbyMembers.map((member) => (
              <Marker
                key={member.user_id}
                coordinate={{ latitude: member.latitude, longitude: member.longitude }}
                onPress={() => setSelected(member)}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <MemberPin initial={memberInitial(member.profiles?.full_name)} />
              </Marker>
            ))}
          </MapView>

          {nearbyMembers.length === 0 && (
            <View style={styles.emptyOverlay}>
              <Text style={styles.emptyText}>{t('atVenue.noMembers')}</Text>
            </View>
          )}

          {selected && (
            <View style={styles.card}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
              <View style={styles.cardRow}>
                <View style={styles.cardAvatar}>
                  <Text style={styles.cardAvatarText}>{memberInitial(selected.profiles?.full_name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{selected.profiles?.full_name ?? '—'}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => {
                  setSelected(null);
                  navigation.navigate(ROUTES.MEMBER_PROFILE, {
                    userId: selected.user_id,
                    fullName: selected.profiles?.full_name ?? '—',
                  });
                }}
              >
                <Text style={styles.profileBtnText}>{t('atVenue.viewProfile')} ›</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  refreshBtn: { width: 40, alignItems: 'flex-end' },
  refreshText: { fontSize: 22, color: COLORS.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  deniedIcon: { fontSize: 40, marginBottom: 8 },
  deniedText: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  map: { flex: 1 },

  // Member pin on map
  pin: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    borderWidth: 2, borderColor: COLORS.text,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
  },
  pinText: { color: COLORS.black, fontWeight: '800', fontSize: 16 },

  // Empty state overlay
  emptyOverlay: {
    position: 'absolute', bottom: 24, left: 24, right: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.borderAccent,
    alignItems: 'center',
  },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },

  // Selected member bottom card
  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: COLORS.borderAccent,
    padding: 24, paddingBottom: 36,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
  },
  closeBtn: { position: 'absolute', top: 16, right: 20 },
  closeText: { fontSize: 26, color: COLORS.textMuted, lineHeight: 30 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  cardAvatarText: { color: COLORS.black, fontWeight: '800', fontSize: 22 },
  cardName: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  profileBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  profileBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 15 },
});

export default AtVenueScreen;
