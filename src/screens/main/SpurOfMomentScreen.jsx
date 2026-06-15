import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, RefreshControl, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getSpurPosts, getSpurReplies, createSpurReply } from '../../lib/spur';
import { getSession } from '../../lib/auth';
import { formatAgo } from '../../utils/format';

const ACCENT = '#ffd700';

const SpurOfMomentScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyState, setReplyState] = useState({});

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const { data, error } = await getSpurPosts();
    if (!error) setPosts(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patchPost = (id, patch) =>
    setReplyState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const toggleReplies = async (postId) => {
    const cur = replyState[postId] ?? {};
    if (cur.expanded) {
      patchPost(postId, { expanded: false });
      return;
    }
    patchPost(postId, { expanded: true, loading: true });
    const { data, error } = await getSpurReplies(postId);
    patchPost(postId, { loading: false, replies: error ? [] : (data ?? []) });
  };

  const handleReply = async (postId) => {
    const text = (replyState[postId]?.text ?? '').trim();
    if (!text) return;

    const { data: { session } } = await getSession();
    if (!session) return;

    patchPost(postId, { sending: true });
    const { error } = await createSpurReply(session.user.id, postId, text);
    if (error) {
      Alert.alert(t('common.error'), t('spur.errors.replyFailed'));
      patchPost(postId, { sending: false });
    } else {
      const { data } = await getSpurReplies(postId);
      patchPost(postId, { sending: false, text: '', replies: data ?? [] });
    }
  };

  const renderPost = ({ item }) => {
    const ps = replyState[item.id] ?? {};
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

        <TouchableOpacity style={styles.replyToggle} onPress={() => toggleReplies(item.id)}>
          <Text style={styles.replyToggleText}>
            💬 {ps.expanded ? t('spur.hideReplies') : `${t('spur.viewReplies')} ${ps.replies ? `(${replyCount})` : ''}`}
          </Text>
        </TouchableOpacity>

        {ps.expanded && (
          <View style={styles.repliesSection}>
            {ps.loading ? (
              <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 8 }} />
            ) : (
              <>
                {(ps.replies ?? []).length === 0 && (
                  <Text style={styles.noReplies}>{t('spur.noReplies')}</Text>
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
                    placeholder={t('spur.replyPlaceholder')}
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
                      ? <ActivityIndicator size="small" color={COLORS.text} />
                      : <Text style={styles.sendBtnText}>{t('spur.send')}</Text>
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('spur.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{t('spur.noSpur')}</Text>
        }
        renderItem={renderPost}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(ROUTES.CREATE_SPUR)}
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
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  posterName: { fontWeight: '700', fontSize: 14, color: COLORS.text },
  time: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12, lineHeight: 22 },
  replyToggle: { alignSelf: 'flex-start' },
  replyToggleText: { fontSize: 13, color: ACCENT, fontWeight: '700' },
  repliesSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  noReplies: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  replyRow: { marginBottom: 10 },
  replyName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  replyText: { fontSize: 13, color: COLORS.text, marginTop: 1 },
  replyTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  replyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  sendBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: COLORS.text, fontSize: 28, lineHeight: 32, fontWeight: '400' },
});

export default SpurOfMomentScreen;
