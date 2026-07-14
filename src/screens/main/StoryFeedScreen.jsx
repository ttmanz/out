import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getStories, getFriendStories, STORY_EXPIRY_DAYS, adminDeleteStory } from '../../lib/stories';
import { getSession } from '../../lib/auth';
import { formatAgo } from '../../utils/format';
import { useUser } from '../../contexts/UserContext';
import AdBanner from '../../components/common/AdBanner';
import BackHeader from '../../components/common/BackHeader';

const daysLeft = (createdAt) => {
  const ms = new Date(createdAt).getTime() + STORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000 - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const ExpiryBadge = ({ createdAt }) => {
  const days = daysLeft(createdAt);
  const expiring = days <= 1;
  return (
    <View style={[styles.expiryBadge, expiring && styles.expiryBadgeWarn]}>
      <Text style={[styles.expiryText, expiring && styles.expiryTextWarn]}>
        ⏱ {days <= 1 ? 'Expires tomorrow' : `${days} days left`}
      </Text>
    </View>
  );
};

const StoryCard = ({ item, navigation, isAdmin, onAdminDelete }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <TouchableOpacity
        style={styles.avatar}
        onPress={() => navigation.navigate(ROUTES.MEMBER_PROFILE, {
          userId: item.user_id,
          fullName: item.profiles?.full_name,
        })}
      >
        <Text style={styles.avatarText}>
          {item.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.MEMBER_PROFILE, {
            userId: item.user_id,
            fullName: item.profiles?.full_name,
          })}
        >
          <Text style={styles.posterName}>{item.profiles?.full_name ?? 'Someone'}</Text>
        </TouchableOpacity>
        <Text style={styles.time}>{formatAgo(item.created_at)}</Text>
      </View>
      <ExpiryBadge createdAt={item.created_at} />
      {isAdmin && (
        <TouchableOpacity style={styles.adminDeleteBtn} onPress={() => onAdminDelete(item.id)}>
          <Text style={styles.adminDeleteBtnText}>🗑</Text>
        </TouchableOpacity>
      )}
    </View>
    {!!item.text && <Text style={styles.storyText}>{item.text}</Text>}
    {!!item.photo_url && (
      <Image source={{ uri: item.photo_url }} style={styles.media} resizeMode="cover" />
    )}
    {!!item.video_url && (
      <View style={styles.videoBadge}>
        <Text style={styles.videoBadgeIcon}>🎬</Text>
        <Text style={styles.videoBadgeText}>Video</Text>
      </View>
    )}
  </View>
);

const StoryFeedScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const isAdmin = profile?.is_admin === true;
  const [mode, setMode] = useState('all');
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const firstRender = useRef(true);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const { data: { session } } = await getSession();
    const uid = session?.user?.id ?? null;
    const res = mode === 'friends' && uid
      ? await getFriendStories(uid)
      : await getStories();
    if (!res.error) setStories(res.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [mode]);

  // Initial load + re-load when screen is focused
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Re-fetch when mode changes (skip first render — useFocusEffect handles that)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setLoading(true);
    load();
  }, [mode]);

  const handleAdminDelete = (storyId) => {
    Alert.alert(
      t('common.deletePostTitle'),
      t('common.deletePostDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await adminDeleteStory(storyId);
            if (!error) setStories((prev) => prev.filter((s) => s.id !== storyId));
          },
        },
      ]
    );
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
      <BackHeader title={t('stories.title')} onBack={() => navigation.goBack()} />

      <View style={styles.toggleBar}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'all' && styles.toggleBtnActive]}
          onPress={() => setMode('all')}
        >
          <Text style={[styles.toggleText, mode === 'all' && styles.toggleTextActive]}>
            {t('stories.seeAll')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'friends' && styles.toggleBtnActive]}
          onPress={() => setMode('friends')}
        >
          <Text style={[styles.toggleText, mode === 'friends' && styles.toggleTextActive]}>
            {t('stories.onlyFriends')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={<AdBanner page="MyStory" />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {mode === 'friends' ? t('stories.noFriendStories') : t('stories.noStories')}
          </Text>
        }
        renderItem={({ item }) => (
          <StoryCard item={item} navigation={navigation} isAdmin={isAdmin} onAdminDelete={handleAdminDelete} />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(ROUTES.CREATE_STORY)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  toggleBar: {
    flexDirection: 'row', margin: 16, marginBottom: 4,
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.borderAccent, overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  toggleTextActive: { color: COLORS.black },
  list: { padding: 16, paddingTop: 12, paddingBottom: 100 },
  empty: {
    textAlign: 'center', color: COLORS.textMuted, fontSize: 15,
    marginTop: 60, paddingHorizontal: 32, lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  posterName: { fontWeight: '700', fontSize: 14, color: COLORS.text },
  time: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  adminDeleteBtn: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 6 },
  adminDeleteBtnText: { fontSize: 18 },
  expiryBadge: {
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  expiryBadgeWarn: { backgroundColor: 'rgba(220,80,30,0.15)' },
  expiryText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  expiryTextWarn: { color: '#E05520' },
  storyText: { fontSize: 15, color: COLORS.text, lineHeight: 22, marginBottom: 10 },
  media: { width: '100%', height: 200, borderRadius: 10, marginTop: 4 },
  videoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, alignSelf: 'flex-start',
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  videoBadgeIcon: { fontSize: 16 },
  videoBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },
  fabText: { color: COLORS.black, fontSize: 28, lineHeight: 32, fontWeight: '700' },
});

export default StoryFeedScreen;
