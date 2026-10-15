import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { getGiveaways, deleteGiveaway } from '../../lib/giveaways';
import { useUser } from '../../contexts/UserContext';
import FeedMedia from '../../components/common/FeedMedia';
import GradientBorder from '../../components/common/GradientBorder';
import i18n from '../../lib/i18n';
import { useTranslation } from 'react-i18next';
// Module-level translate helper so every helper component in this file can use t().
const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

const endsLabel = (iso) => {
  const ms = new Date(iso).getTime() - Date.now();
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 1) return t('rw.giveaways.ending_soon', 'Ending soon');
  if (hours < 48) return t('rw.giveaways.ends_in_hour', 'Ends in {{hours}} h', { hours: hours });
  return `Ends ${new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`;
};

const GiveawaysScreen = ({ navigation }) => {
  useTranslation();
  useFeatureGate('giveaways');
  const { profile } = useUser();
  const isAdmin = profile?.is_admin === true;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const { data, error } = await getGiveaways();
    if (!error) setItems(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = (id) =>
    Alert.alert(t('rw.giveaways.delete_giveaway', 'Delete giveaway'), t('rw.giveaways.remove_this_giveaway_for_eve', 'Remove this giveaway for everyone?'), [
      { text: t('rw.giveaways.cancel', 'Cancel'), style: 'cancel' },
      { text: t('rw.giveaways.delete', 'Delete'), style: 'destructive',
        onPress: async () => {
          const { error } = await deleteGiveaway(id);
          if (error) Alert.alert(t('rw.giveaways.error', 'Error'), t('rw.giveaways.could_not_delete_it_please_t', 'Could not delete it. Please try again.'));
          else setItems((prev) => prev.filter((g) => g.id !== id));
        },
      },
    ]);

  const renderItem = ({ item }) => (
    <GradientBorder radius={16} style={styles.cardOuter}>
      <View style={styles.card}>
        <FeedMedia photo={item.photo_url} video={item.video_url} style={styles.cardPhoto} />
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { flex: 1 }]}>🎁 {item.title}</Text>
            {(isAdmin || item.created_by === profile?.id) && (
              <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.delBtn}>
                <Text style={styles.delText}>🗑</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.meta}>📍 {item.venue_name || item.profiles?.full_name || t('rw.giveaways.find_mee', 'Find-Mee')}</Text>
          <Text style={styles.ends}>⏱ {endsLabel(item.ends_at)}</Text>
          {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
        </View>
      </View>
    </GradientBorder>
  );

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('rw.giveaways.give_away', 'Give Away')}</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.postBtn} onPress={() => navigation.navigate(ROUTES.CREATE_GIVEAWAY)}>
            <Text style={styles.postBtnText}>+ Post</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>{t('rw.giveaways.nobody_is_giving_anything_aw', 'Nobody is giving anything away right now. Check back soon!')}</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  postBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  postBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 14 },
  list: { padding: 16, paddingBottom: 40 },
  cardOuter: { marginBottom: 16 },
  card: { borderRadius: 15, overflow: 'hidden', backgroundColor: COLORS.surface },
  cardPhoto: { width: '100%', height: 200 },
  cardBody: { padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  delBtn: { padding: 6 },
  delText: { fontSize: 16 },
  meta: { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
  ends: { fontSize: 13, color: COLORS.glow, fontWeight: '700', marginTop: 4 },
  desc: { fontSize: 14, color: COLORS.text, marginTop: 10, lineHeight: 20 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 60, fontSize: 15, paddingHorizontal: 30 },
});

export default GiveawaysScreen;
