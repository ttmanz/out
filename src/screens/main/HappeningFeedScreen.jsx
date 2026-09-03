import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { getHappenings, getHappeningReplies, createHappeningReply, adminDeleteHappening, deleteHappening } from '../../lib/happenings';
import { getSession } from '../../lib/auth';
import { formatAgo } from '../../utils/format';
import { useUser } from '../../contexts/UserContext';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import LinkPreviewCard from '../../components/common/LinkPreviewCard';
import BackHeader from '../../components/common/BackHeader';
import ReportModal from '../../components/common/ReportModal';
import Avatar from '../../components/common/Avatar';
import EmojiPickerButton from '../../components/common/EmojiPickerButton';
import FeedMedia from '../../components/common/FeedMedia';
import { LiveTabBar } from '../../components/common/LiveTabButton';

const HappeningCard = ({ item, navigation, t, replyState, onToggleReplies, onReplyTextChange, onEmojiInsert, onSendReply, isAdmin, onAdminDelete, myId, onReport }) => {
  const ps = replyState ?? {};
  const replyCount = ps.replies?.length ?? 0;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar uri={item.profiles?.photo_url} name={item.profiles?.full_name} size={40} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => navigation?.navigate(ROUTES.MEMBER_PROFILE, { userId: item.user_id, fullName: item.profiles?.full_name })}>
            <Text style={styles.posterName}>{item.profiles?.full_name ?? 'Someone'}</Text>
          </TouchableOpacity>
          <Text style={styles.time}>{formatAgo(item.created_at)}</Text>
        </View>
        {item.user_id !== myId && (
          <TouchableOpacity style={styles.adminDeleteBtn} onPress={() => onReport(item)}>
            <Text style={styles.adminDeleteBtnText}>🚩</Text>
          </TouchableOpacity>
        )}
        {(isAdmin || item.user_id === myId) && (
          <TouchableOpacity style={styles.adminDeleteBtn} onPress={() => onAdminDelete(item.id, item.user_id === myId)}>
            <Text style={styles.adminDeleteBtnText}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title}>{item.title}</Text>
      {!!item.venue && <Text style={styles.meta}>📍 {item.venue}</Text>}
      {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
      <FeedMedia photo={item.photo_url} video={item.video_url} style={styles.postPhoto} />
      {!!item.link_url && <LinkPreviewCard url={item.link_url} title={item.link_title} image={item.link_image} domain={item.link_domain} />}

      <TouchableOpacity style={styles.replyToggle} onPress={() => onToggleReplies(item.id)}>
        <Text style={styles.replyToggleText}>
          💬 {ps.expanded ? t('happenings.hideReplies') : `${t('happenings.viewReplies')} ${ps.replies ? `(${replyCount})` : ''}`}
        </Text>
      </TouchableOpacity>

      {ps.expanded && (
        <View style={styles.repliesSection}>
          {ps.loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
          ) : (
            <>
              {(ps.replies ?? []).length === 0 && (
                <Text style={styles.noReplies}>{t('happenings.noReplies')}</Text>
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
                  placeholder={t('happenings.replyPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={ps.text ?? ''}
                  onChangeText={(v) => onReplyTextChange(item.id, v)}
                  returnKeyType="send"
                  onSubmitEditing={() => onSendReply(item.id)}
                />
                <EmojiPickerButton onEmojiSelected={(e) => onEmojiInsert(item.id, e)} />
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={() => onSendReply(item.id)}
                  disabled={ps.sending}
                >
                  {ps.sending
                    ? <ActivityIndicator size="small" color={COLORS.black} />
                    : <Text style={styles.sendBtnText}>{t('happenings.send')}</Text>
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

const HappeningFeedScreen = ({ navigation, route }) => {
  useFeatureGate('whats_happening');
  const { t } = useTranslation();
  const { profile } = useUser();
  const isAdmin = profile?.is_admin === true;
  const focusItemId = route.params?.focusItemId;
  // Jumping in from a "replied to your post" notification: force the tab that
  // actually contains the target happening, rather than defaulting to 'today'
  // and never finding it.
  const [filterOverride, setFilterOverride] = useState(null);
  const filter = route.params?.filter ?? filterOverride ?? 'today';

  const [happenings, setHappenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyState, setReplyState] = useState({});
  const [reportTarget, setReportTarget] = useState(null);
  const flatListRef = useRef(null);
  const focusedRef = useRef(false);

  const handleReport = (item) => setReportTarget({
    targetType: 'happening',
    targetId: item.id,
    reportedUserId: item.user_id,
    contentExcerpt: item.title,
  });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const { data, error } = await getHappenings();
    if (!error) setHappenings(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(
    () => happenings.filter((h) => h.happening_at === filter),
    [happenings, filter]
  );

  useEffect(() => {
    if (!focusItemId || focusedRef.current) return;
    const target = happenings.find((h) => h.id === focusItemId);
    if (!target) return;
    if (!route.params?.filter && target.happening_at !== filter) {
      setFilterOverride(target.happening_at);
      return; // re-run once `filtered` reflects the new tab
    }
    const index = filtered.findIndex((h) => h.id === focusItemId);
    if (index === -1) return;
    focusedRef.current = true;
    toggleReplies(focusItemId);
    setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 }), 300);
  }, [focusItemId, happenings, filtered, filter]);

  const patchReply = (id, patch) =>
    setReplyState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const toggleReplies = async (happeningId) => {
    const cur = replyState[happeningId] ?? {};
    if (cur.expanded) { patchReply(happeningId, { expanded: false }); return; }
    patchReply(happeningId, { expanded: true, loading: true });
    const { data, error } = await getHappeningReplies(happeningId);
    patchReply(happeningId, { loading: false, replies: error ? [] : (data ?? []) });
  };

  const handleReply = async (happeningId) => {
    const text = (replyState[happeningId]?.text ?? '').trim();
    if (!text) return;
    const { data: { session } } = await getSession();
    if (!session) return;
    patchReply(happeningId, { sending: true });
    const { error } = await createHappeningReply(session.user.id, happeningId, text);
    if (error) {
      Alert.alert(t('common.error'), t('happenings.errors.replyFailed'));
      patchReply(happeningId, { sending: false });
    } else {
      const { data } = await getHappeningReplies(happeningId);
      patchReply(happeningId, { sending: false, text: '', replies: data ?? [] });
    }
  };

  const handleAdminDelete = (happeningId, isOwn) => {
    Alert.alert(
      t('common.deletePostTitle'),
      t('common.deletePostDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = isOwn
              ? await deleteHappening(happeningId, profile.id)
              : await adminDeleteHappening(happeningId);
            if (!error) setHappenings((prev) => prev.filter((h) => h.id !== happeningId));
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
      <BackHeader title={t(`happenings.${filter}`).toUpperCase()} onBack={() => navigation.goBack()} />

      <LiveTabBar
        navigation={navigation}
        createRoute={ROUTES.CREATE_HAPPENING}
        extraParams={{ when: filter }}
        label={t(`happenings.${filter}`)}
      />

      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
          setTimeout(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: true }), 100);
        }}
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
          <Text style={styles.empty}>{t('happenings.noHappenings')}</Text>
        }
        renderItem={({ item }) => (
          <HappeningCard
            item={item}
            navigation={navigation}
            t={t}
            replyState={replyState[item.id]}
            onToggleReplies={toggleReplies}
            onReplyTextChange={(id, v) => patchReply(id, { text: v })}
            onEmojiInsert={(id, e) => patchReply(id, { text: (replyState[id]?.text ?? '') + e })}
            onSendReply={handleReply}
            isAdmin={isAdmin}
            onAdminDelete={handleAdminDelete}
            myId={profile?.id}
            onReport={handleReport}
          />
        )}
      />

      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(ROUTES.CREATE_HAPPENING, { prefill: { when: filter } })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
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
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { marginRight: 10 },
  posterName: { fontWeight: '700', fontSize: 14, color: COLORS.text },
  time: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  adminDeleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  adminDeleteBtnText: { fontSize: 18 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  postPhoto: { width: '100%', height: 180, borderRadius: 10, marginTop: 8 },
  meta: { fontSize: 13, color: COLORS.textMuted, marginBottom: 3 },
  desc: { fontSize: 13, color: COLORS.text, marginTop: 6, lineHeight: 18 },
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

export default HappeningFeedScreen;
