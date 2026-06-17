import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, RefreshControl, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import {
  getOpenChatPosts, getOpenChatReplies, createOpenChatReply,
  getPostBlocks, blockUserFromPost,
} from '../../lib/openChat';
import { getSession } from '../../lib/auth';
import { formatAgo } from '../../utils/format';
import { moderateContent } from '../../lib/moderation';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import LinkPreviewCard from '../../components/common/LinkPreviewCard';

const OpenChatScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const [userId, setUserId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyState, setReplyState] = useState({});

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const [{ data: { session } }, postsRes] = await Promise.all([
      getSession(),
      getOpenChatPosts(),
    ]);
    if (session) setUserId(session.user.id);
    if (!postsRes.error) setPosts(postsRes.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patchPost = (id, patch) =>
    setReplyState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const toggleReplies = async (postId) => {
    const cur = replyState[postId] ?? {};
    if (cur.expanded) { patchPost(postId, { expanded: false }); return; }

    patchPost(postId, { expanded: true, loading: true });
    const [repliesRes, blocksRes] = await Promise.all([
      getOpenChatReplies(postId),
      getPostBlocks(postId),
    ]);
    const blockSet = new Set((blocksRes.data ?? []).map((b) => b.blocked_user_id));
    const replies = (repliesRes.data ?? []).filter((r) => !blockSet.has(r.user_id));
    patchPost(postId, { loading: false, replies, blocks: blockSet });
  };

  const handleReply = async (postId) => {
    const ps = replyState[postId] ?? {};
    const text = (ps.text ?? '').trim();
    if (!text) return;
    if (ps.blocks?.has(userId)) {
      Alert.alert(t('common.error'), t('openChat.errors.blocked'));
      return;
    }
    const { flagged, reason } = await moderateContent(text);
    if (flagged) {
      Alert.alert(
        'Reply not allowed',
        `Your reply was flagged for: ${reason}.\nPlease revise it.`
      );
      return;
    }

    patchPost(postId, { sending: true });
    const { error } = await createOpenChatReply(userId, postId, text);
    if (error) {
      Alert.alert(t('common.error'), t('openChat.errors.replyFailed'));
      patchPost(postId, { sending: false });
    } else {
      const repliesRes = await getOpenChatReplies(postId);
      const currentBlocks = replyState[postId]?.blocks ?? new Set();
      const replies = (repliesRes.data ?? []).filter((r) => !currentBlocks.has(r.user_id));
      patchPost(postId, { sending: false, text: '', replies });
    }
  };

  const handleBlock = async (postId, targetUserId) => {
    setReplyState((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], blocking: targetUserId },
    }));
    const { error } = await blockUserFromPost(postId, targetUserId, userId);
    if (error) {
      Alert.alert(t('common.error'), t('openChat.errors.blockFailed'));
      setReplyState((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], blocking: null },
      }));
      return;
    }
    setReplyState((prev) => {
      const ps = prev[postId] ?? {};
      const newBlocks = new Set([...(ps.blocks ?? []), targetUserId]);
      return {
        ...prev,
        [postId]: {
          ...ps,
          blocking: null,
          blocks: newBlocks,
          replies: (ps.replies ?? []).filter((r) => r.user_id !== targetUserId),
        },
      };
    });
  };

  const renderPost = ({ item }) => {
    const ps = replyState[item.id] ?? {};
    const isOwner = userId === item.user_id;
    const isBlocked = ps.blocks?.has(userId);
    const replyCount = ps.replies?.length ?? 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.MEMBER_PROFILE, { userId: item.user_id, fullName: item.profiles?.full_name })}>
              <Text style={styles.posterName}>{item.profiles?.full_name ?? 'Someone'}</Text>
            </TouchableOpacity>
            <Text style={styles.time}>{formatAgo(item.created_at)}</Text>
          </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        {!!item.venue && <Text style={styles.venue}>📍 {item.venue}</Text>}
        {!!item.photo_url && <Image source={{ uri: item.photo_url }} style={styles.postPhoto} resizeMode="cover" />}
        {!!item.link_url && <LinkPreviewCard url={item.link_url} title={item.link_title} image={item.link_image} domain={item.link_domain} />}

        <TouchableOpacity style={styles.replyToggle} onPress={() => toggleReplies(item.id)}>
          <Text style={styles.replyToggleText}>
            💬 {ps.expanded
              ? t('openChat.hideReplies')
              : `${t('openChat.viewReplies')}${ps.replies != null ? ` (${replyCount})` : ''}`}
          </Text>
        </TouchableOpacity>

        {ps.expanded && (
          <View style={styles.repliesSection}>
            {ps.loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
            ) : (
              <>
                {(ps.replies ?? []).length === 0 && !isBlocked && (
                  <Text style={styles.noReplies}>{t('openChat.noReplies')}</Text>
                )}
                {(ps.replies ?? []).map((r) => {
                  const isBeingBlocked = ps.blocking === r.user_id;
                  return (
                    <View key={r.id} style={styles.replyRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.replyName}>{r.profiles?.full_name ?? 'Someone'}</Text>
                        <Text style={styles.replyText}>{r.message}</Text>
                        <Text style={styles.replyTime}>{formatAgo(r.created_at)}</Text>
                      </View>
                      {isOwner && r.user_id !== userId && (
                        <TouchableOpacity
                          style={styles.blockBtn}
                          onPress={() => handleBlock(item.id, r.user_id)}
                          disabled={isBeingBlocked}
                        >
                          {isBeingBlocked
                            ? <ActivityIndicator size="small" color={COLORS.error} />
                            : <Text style={styles.blockBtnText}>⊘</Text>
                          }
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                {isBlocked ? (
                  <View style={styles.blockedNotice}>
                    <Text style={styles.blockedText}>{t('openChat.blockedFromPost')}</Text>
                  </View>
                ) : (
                  <View style={styles.replyInputRow}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder={t('openChat.replyPlaceholder')}
                      placeholderTextColor={COLORS.textMuted}
                      value={ps.text ?? ''}
                      onChangeText={(v) => patchPost(item.id, { text: v })}
                      returnKeyType="send"
                      onSubmitEditing={() => handleReply(item.id)}
                    />
                    <TouchableOpacity
                      style={styles.sendBtn}
                      onPress={() => handleReply(item.id)}
                      disabled={ps.sending}
                    >
                      {ps.sending
                        ? <ActivityIndicator size="small" color={COLORS.black} />
                        : <Text style={styles.sendBtnText}>{t('openChat.send')}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
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
      <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('openChat.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={() => (
          <>
            <AdBanner page="OpenChat" />
            <ProfileBanner navigation={navigation} />
          </>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('openChat.noPosts')}</Text>}
        renderItem={renderPost}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(ROUTES.CREATE_OPEN_CHAT)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  list: { padding: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', color: COLORS.textMuted, fontSize: 15, marginTop: 60, paddingHorizontal: 32, lineHeight: 22 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
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
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 6, lineHeight: 22 },
  venue: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  postPhoto: { width: '100%', height: 180, borderRadius: 10, marginBottom: 10 },
  replyToggle: { alignSelf: 'flex-start' },
  replyToggleText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  repliesSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  noReplies: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  replyRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  replyName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  replyText: { fontSize: 13, color: COLORS.text, marginTop: 1 },
  replyTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  blockBtn: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8, marginTop: 2 },
  blockBtnText: { fontSize: 18, color: COLORS.error },
  blockedNotice: {
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderRadius: 10, padding: 12, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.error,
  },
  blockedText: { fontSize: 13, color: COLORS.error, textAlign: 'center' },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  replyInput: {
    flex: 1,
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 13, backgroundColor: COLORS.surface, color: COLORS.text,
  },
  sendBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.black },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: COLORS.black, fontSize: 28, lineHeight: 32, fontWeight: '700' },
});

export default OpenChatScreen;
