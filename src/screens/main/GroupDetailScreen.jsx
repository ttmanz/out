import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import {
  getGroupPosts, getFriendGroupPosts, createGroupPost,
  getGroupPostReplies, createGroupPostReply, adminDeleteGroupPost,
} from '../../lib/groups';
import { getSession } from '../../lib/auth';
import { uploadPostPhoto } from '../../lib/storage';
import { moderateContent } from '../../lib/moderation';
import { formatAgo } from '../../utils/format';
import { useUser } from '../../contexts/UserContext';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import LinkPreviewCard from '../../components/common/LinkPreviewCard';
import LinkInput from '../../components/common/LinkInput';
import PhotoPicker from '../../components/common/PhotoPicker';
import BackHeader from '../../components/common/BackHeader';

const GroupDetailScreen = ({ navigation, route }) => {
  const { groupId, groupName } = route.params;
  const { t } = useTranslation();
  const { canAccessFeature, profile } = useUser();
  const isAdmin = profile?.is_admin === true;

  const [userId, setUserId] = useState(null);
  const [mode, setMode] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyState, setReplyState] = useState({});
  const firstRender = useRef(true);

  const [postText, setPostText] = useState('');
  const [postPhotoUri, setPostPhotoUri] = useState(null);
  const [linkPreview, setLinkPreview] = useState(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const { data: { session } } = await getSession();
    const uid = session?.user?.id ?? null;
    setUserId(uid);
    const res = mode === 'friends' && uid
      ? await getFriendGroupPosts(groupId, uid)
      : await getGroupPosts(groupId);
    if (!res.error) setPosts(res.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [groupId, mode]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setLoading(true);
    load();
  }, [mode]);

  const patchPost = (id, patch) =>
    setReplyState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const toggleReplies = async (postId) => {
    const cur = replyState[postId] ?? {};
    if (cur.expanded) { patchPost(postId, { expanded: false }); return; }

    patchPost(postId, { expanded: true, loading: true });
    const { data } = await getGroupPostReplies(postId);
    patchPost(postId, { loading: false, replies: data ?? [] });
  };

  const handleReply = async (postId) => {
    const ps = replyState[postId] ?? {};
    const text = (ps.text ?? '').trim();
    if (!text) return;

    const { flagged, reason } = await moderateContent(text);
    if (flagged) {
      Alert.alert(t('openGroups.flaggedTitle'), t('openGroups.flaggedBody', { reason }));
      return;
    }

    patchPost(postId, { sending: true });
    const { error } = await createGroupPostReply(userId, postId, text);
    if (error) {
      Alert.alert(t('common.error'), t('openGroups.errors.replyFailed'));
      patchPost(postId, { sending: false });
    } else {
      const { data } = await getGroupPostReplies(postId);
      patchPost(postId, { sending: false, text: '', replies: data ?? [] });
    }
  };

  const handlePost = async () => {
    const access = canAccessFeature('open_groups');
    if (!access.allowed) {
      Alert.alert(t('subscription.requiredTitle'), access.price ? t('subscription.requiredBodyPriced', { price: access.price }) : t('subscription.requiredBody'));
      return;
    }
    const text = postText.trim();
    if (!text && !postPhotoUri) return;

    if (text) {
      const { flagged, reason } = await moderateContent(text);
      if (flagged) {
        Alert.alert(t('openGroups.flaggedTitle'), t('openGroups.flaggedBody', { reason }));
        return;
      }
    }

    setPosting(true);
    let photo_url = null;
    if (postPhotoUri) {
      const { url, error } = await uploadPostPhoto(userId, postPhotoUri);
      if (error) {
        Alert.alert(t('common.error'), t('common.photoUploadFailed'));
        setPosting(false);
        return;
      }
      photo_url = url;
    }
    const { error } = await createGroupPost(groupId, userId, {
      text: text || null,
      photo_url,
      link_url: linkPreview?.url ?? null,
      link_title: linkPreview?.title ?? null,
      link_image: linkPreview?.image ?? null,
      link_domain: linkPreview?.domain ?? null,
    });
    setPosting(false);
    if (error) {
      Alert.alert(t('common.error'), t('openGroups.errors.postFailed'));
      return;
    }
    setPostText('');
    setPostPhotoUri(null);
    setLinkPreview(null);
    await load();
  };

  const handleAdminDelete = (postId) => {
    Alert.alert(
      t('common.deletePostTitle'),
      t('common.deletePostDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await adminDeleteGroupPost(postId);
            if (!error) setPosts((prev) => prev.filter((p) => p.id !== postId));
          },
        },
      ]
    );
  };

  const renderPost = (item) => {
    const ps = replyState[item.id] ?? {};
    const replyCount = ps.replies?.length ?? 0;

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.MEMBER_PROFILE, { userId: item.user_id, fullName: item.profiles?.full_name })}>
              <Text style={styles.posterName}>{item.profiles?.full_name ?? 'Someone'}</Text>
            </TouchableOpacity>
            <Text style={styles.time}>{formatAgo(item.created_at)}</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity style={styles.adminDeleteBtn} onPress={() => handleAdminDelete(item.id)}>
              <Text style={styles.adminDeleteBtnText}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!item.text && <Text style={styles.postText}>{item.text}</Text>}
        {!!item.photo_url && <Image source={{ uri: item.photo_url }} style={styles.postPhoto} resizeMode="cover" />}
        {!!item.link_url && <LinkPreviewCard url={item.link_url} title={item.link_title} image={item.link_image} domain={item.link_domain} />}

        <TouchableOpacity style={styles.replyToggle} onPress={() => toggleReplies(item.id)}>
          <Text style={styles.replyToggleText}>
            💬 {ps.expanded
              ? t('openGroups.hideReplies')
              : `${t('openGroups.viewReplies')}${ps.replies != null ? ` (${replyCount})` : ''}`}
          </Text>
        </TouchableOpacity>

        {ps.expanded && (
          <View style={styles.repliesSection}>
            {ps.loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
            ) : (
              <>
                {(ps.replies ?? []).length === 0 && (
                  <Text style={styles.noReplies}>{t('openGroups.noReplies')}</Text>
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
                    placeholder={t('openGroups.replyPlaceholder')}
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
                      : <Text style={styles.sendBtnText}>{t('openGroups.send')}</Text>
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.safe} behavior="padding">
      <BackHeader title={groupName ?? t('openGroups.title')} onBack={() => navigation.goBack()} />

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

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.composeBox}>
          <TextInput
            style={styles.composeInput}
            placeholder={t('openGroups.composePlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            value={postText}
            onChangeText={setPostText}
            multiline
          />
          <PhotoPicker uri={postPhotoUri} onChange={setPostPhotoUri} />
          <LinkInput preview={linkPreview} onPreviewChange={setLinkPreview} />
          <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={posting}>
            {posting
              ? <ActivityIndicator size="small" color={COLORS.black} />
              : <Text style={styles.postBtnText}>{t('openGroups.post')}</Text>
            }
          </TouchableOpacity>
        </View>

        <AdBanner page="OpenGroupDetail" />
        <ProfileBanner navigation={navigation} />

        {posts.length === 0 ? (
          <Text style={styles.empty}>
            {mode === 'friends' ? t('openGroups.noFriendPosts') : t('openGroups.noPosts')}
          </Text>
        ) : (
          posts.map(renderPost)
        )}
      </ScrollView>
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
  toggleBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  toggleTextActive: { color: COLORS.black },
  list: { padding: 16, paddingTop: 12, paddingBottom: 60 },
  empty: { textAlign: 'center', color: COLORS.textMuted, fontSize: 15, marginTop: 40, paddingHorizontal: 32, lineHeight: 22 },
  composeBox: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderAccent, marginBottom: 16,
  },
  composeInput: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: COLORS.text, backgroundColor: COLORS.background,
    minHeight: 60, textAlignVertical: 'top', marginBottom: 12,
  },
  postBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  postBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.black },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  posterName: { fontWeight: '700', fontSize: 14, color: COLORS.text },
  time: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  adminDeleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  adminDeleteBtnText: { fontSize: 18 },
  postText: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 8 },
  postPhoto: { width: '100%', height: 180, borderRadius: 10, marginBottom: 8 },
  replyToggle: { alignSelf: 'flex-start' },
  replyToggleText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  repliesSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  noReplies: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  replyRow: { marginBottom: 12 },
  replyName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  replyText: { fontSize: 13, color: COLORS.text, marginTop: 1 },
  replyTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  replyInput: {
    flex: 1, borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 13, backgroundColor: COLORS.background, color: COLORS.text,
  },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.black },
});

export default GroupDetailScreen;
