import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, StatusBar, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getMarketListings, deleteMarketListing, adminDeleteListing } from '../../lib/market';
import { getSession } from '../../lib/auth';
import { useUser } from '../../contexts/UserContext';
import { formatAgo } from '../../utils/format';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';

const MarketScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { hasAccess, profile } = useUser();
  const isAdmin = profile?.is_admin === true;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myId, setMyId] = useState(null);
  const statusBarHeight = StatusBar.currentHeight ?? 44;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const [sessionRes, listingsRes] = await Promise.all([
      getSession(),
      getMarketListings(),
    ]);
    if (sessionRes.data?.session) setMyId(sessionRes.data.session.user.id);
    if (!listingsRes.error) setListings(listingsRes.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePostPress = () => {
    if (!hasAccess) {
      Alert.alert(t('subscription.requiredTitle'), t('subscription.requiredBody'));
      return;
    }
    navigation.navigate(ROUTES.CREATE_MARKET_LISTING);
  };

  const handleDelete = (item) => {
    const isOwn = item.user_id === myId;
    Alert.alert(t('market.deleteTitle'), t('market.deleteDesc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('market.delete'), style: 'destructive',
        onPress: async () => {
          const { error } = isOwn
            ? await deleteMarketListing(item.id, myId)
            : await adminDeleteListing(item.id);
          if (!error) setListings((prev) => prev.filter((l) => l.id !== item.id));
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>{t('market.title')}</Text>
        <TouchableOpacity style={styles.postBtn} onPress={handlePostPress}>
          <Text style={styles.postBtnText}>+ {t('market.post')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
        ListHeaderComponent={() => (
          <>
            <AdBanner page="Market" />
            <ProfileBanner navigation={navigation} />
            <Text style={styles.subtitle}>{t('market.subtitle')}</Text>
          </>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.empty}>{t('market.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOwn = item.user_id === myId;
          const sellerName = item.profiles?.full_name ?? t('market.unknownSeller');
          return (
            <View style={styles.card}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.photo} resizeMode="cover" />
              ) : null}
              <View style={styles.cardBody}>
                <Text style={styles.description}>{item.description}</Text>
                <View style={styles.cardFooter}>
                  <View style={styles.sellerRow}>
                    <View style={styles.sellerAvatar}>
                      <Text style={styles.sellerAvatarText}>{sellerName[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <Text style={styles.sellerName}>{sellerName}</Text>
                  </View>
                  <Text style={styles.time}>{formatAgo(item.created_at)}</Text>
                  {(isOwn || isAdmin) && (
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
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
    backgroundColor: COLORS.background,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  postBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  postBtnText: { color: COLORS.black, fontWeight: '700', fontSize: 13 },
  list: { paddingBottom: 40 },
  subtitle: {
    fontSize: 12, color: COLORS.textMuted, textAlign: 'center',
    paddingHorizontal: 24, paddingVertical: 10, lineHeight: 17,
  },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center' },
  card: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  photo: { width: '100%', height: 220 },
  cardBody: { padding: 14 },
  description: { fontSize: 15, color: COLORS.text, lineHeight: 22, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center', alignItems: 'center',
  },
  sellerAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 11 },
  sellerName: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  time: { fontSize: 11, color: COLORS.textMuted },
  deleteBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  deleteText: { color: COLORS.error, fontSize: 13, fontWeight: '700' },
});

export default MarketScreen;
