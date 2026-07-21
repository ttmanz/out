import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import {
  getStories, getFriendStories, STORY_EXPIRY_DAYS, adminDeleteStory,
  getStoryReplies, createStoryReply,
} from '../../lib/stories';
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

const StoryCard = ({
  item, navigation, isAdmin, onAdminDelete, t,
  replyState, onToggleReplies, onReplyTextChange, onSendReply,
}) => {
  const ps = replyState ?? {};
  const replyCount = ps.replies?.length ?? 0;
  return (
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

      <TouchableOpacity style={styles.replyToggle} onPress={() => onToggleReplies(item.id)}>
        <Text style={styles.replyToggleText}>
          💬 {ps.expanded ? t('stories.hideReplies') : `${t('stories.viewReplies')} ${ps.replies ? `(${replyCount})` : ''}`}
        </Text>
      </TouchableOpacity>

      {ps.expanded && (
        <View style={styles.repliesSection}>
          {ps.loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
          ) : (
            <>
              {(ps.replies ?? []).length === 0 && (
                <Text style={styles.noReplies}>{t('stories.noReplies')}</Text>
              )}
              {(ps.replies ?? []).map((r) => (
                <View key={r.id} style={styles.replyRow}>
                  <Text style={styles.replyName}>{r.profiles?.full_name ?? 'Someone'}</Text>
                  <Text style={styles.replyText}>{r.message}</Text>
                  <Text style={styles.replyTime}>{formatAgo(r.created_at)}</Text>
                </View>
              ))}
              <View style={styles.replyInputRow}>
                <TextInput
                  style={styles.replyInput}
                  placeholder={t('stories.replyPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={ps.text ?? ''}
                  onChangeText={(v) => onReplyTextChange(item.id, v)}
                  returnKeyType="send"
                  onSubmitEditing={() => onSendReply(item.id)}
                />
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={() => onSendReply(item.id)}
                  disabled={ps.sending}
                >
                  {ps.sending
                    ? <ActivityIndicator size="small" color={COLORS.black} />
                    : <Text style={styles.sendBtnText}>{t('stories.send')}</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const StoryFeedScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const isAdmin = profile?.is_admin === true;
  const [mode, setMode] = useState('all');
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyState, setReplyState] = useState({});
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

  const patchReply = (id, patch) =>
    setReplyState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const toggleReplies = async (storyId) => {
    const cur = replyState[storyId] ?? {};
    if (cur.expanded) { patchReply(storyId, { expanded: false }); return; }
    patchReply(storyId, { expanded: true, loading: true });
    const { data, error } = await getStoryReplies(storyId);
    patchReply(storyId, { loading: false, replies: error ? [] : (data ?? []) });
  };

  const handleReply = async (storyId) => {
    const text = (replyState[storyId]?.text ?? '').trim();
    if (!text) return;
    const { data: { session } } = await getSession();
    if (!session) return;
    patchReply(storyId, { sending: true });
    const { error } = await createStoryReply(session.user.id, storyId, text);
    if (error) {
      Alert.alert(t('common.error'), t('stories.errorReplyFailed'));
      patchReply(storyId, { sending: false });
    } else {
      const { data } = await getStoryReplies(storyId);
      patchReply(storyId, { sending: false, text: '', replies: data ?? [] });
    }
  };

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
    <KeyboardAvoidingView style={styles.safe} behavior="padding">
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
          <StoryCard
            item={item}
            navigation={navigation}
            isAdmin={isAdmin}
            onAdminDelete={handleAdminDelete}
            t={t}
            replyState={replyState[item.id]}
            onToggleReplies={toggleReplies}
            onReplyTextChange={(id, v) => patchReply(id, { text: v })}
            onSendReply={handleReply}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(ROUTES.CREATE_STORY)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
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
  replyToggle: { alignSelf: 'flex-start', marginTop: 10 },
  replyToggleText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  repliesSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  noReplies: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  replyRow: { marginBottom: 10 },
  replyName: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  replyText: { fontSize: 13, color: COLORS.text, marginTop: 1 },
  replyTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.text,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.black },
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
