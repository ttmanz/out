import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import {
  getClub, getClubMembers, getMemberStatus, requestToJoin, approveMember, rejectMember,
  getClubPosts, createClubPost, adminDeleteClubPost,
} from '../../lib/clubs';
import { getSession } from '../../lib/auth';
import { uploadPostPhoto } from '../../lib/storage';
import { formatAgo } from '../../utils/format';
import { useUser } from '../../contexts/UserContext';
import BackHeader from '../../components/common/BackHeader';
import PhotoPicker from '../../components/common/PhotoPicker';

const ClubDetailScreen = ({ navigation, route }) => {
  const { clubId } = route.params;
  const { profile } = useUser();
  const isSiteAdmin = profile?.is_admin === true;

  const [userId, setUserId] = useState(null);
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [myStatus, setMyStatus] = useState(null); // null | 'pending' | 'approved'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [postText, setPostText] = useState('');
  const [postPhotoUri, setPostPhotoUri] = useState(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const [{ data: { session } }, clubRes, membersRes, postsRes] = await Promise.all([
      getSession(),
      getClub(clubId),
      getClubMembers(clubId),
      getClubPosts(clubId),
    ]);
    const uid = session?.user?.id ?? null;
    setUserId(uid);
    setClub(clubRes.data ?? null);
    setMembers(membersRes.data ?? []);
    setPosts(postsRes.data ?? []);

    const statusRes = uid ? await getMemberStatus(clubId, uid) : { data: null };
    setMyStatus(statusRes.data?.status ?? null);
    setLoading(false);
    setRefreshing(false);
  }, [clubId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isAdmin = club?.admin_id === userId;
  const canPost = isAdmin || myStatus === 'approved';
  const pending = members.filter((m) => m.status === 'pending');
  const approved = members.filter((m) => m.status === 'approved');

  const handleJoin = async () => {
    const { error } = await requestToJoin(clubId, userId);
    if (error) {
      Alert.alert('Error', 'Could not send join request.');
    } else {
      setMyStatus('pending');
    }
  };

  const handleApprove = async (memberId, memberUserId) => {
    setActionId(memberId);
    const { error } = await approveMember(clubId, memberUserId);
    setActionId(null);
    if (error) {
      Alert.alert('Error', 'Could not approve member.');
    } else {
      await load();
    }
  };

  const handleReject = (memberId, memberUserId, memberName) => {
    Alert.alert(
      'Remove request',
      `Reject ${memberName}'s request to join?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive',
          onPress: async () => {
            setActionId(memberId);
            await rejectMember(clubId, memberUserId);
            setActionId(null);
            await load();
          },
        },
      ]
    );
  };

  const handlePost = async () => {
    const text = postText.trim();
    if (!text && !postPhotoUri) return;
    setPosting(true);
    let photo_url = null;
    if (postPhotoUri) {
      const { url, error } = await uploadPostPhoto(userId, postPhotoUri);
      if (error) {
        Alert.alert('Error', 'Could not upload photo.');
        setPosting(false);
        return;
      }
      photo_url = url;
    }
    const { error } = await createClubPost(clubId, userId, { text: text || null, photo_url });
    setPosting(false);
    if (error) {
      Alert.alert('Error', 'Could not post.');
      return;
    }
    setPostText('');
    setPostPhotoUri(null);
    await load();
  };

  const handleAdminDelete = (postId) => {
    Alert.alert(
      'Delete post?',
      'This will permanently remove this post.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await adminDeleteClubPost(postId);
            if (!error) setPosts((prev) => prev.filter((p) => p.id !== postId));
          },
        },
      ]
    );
  };

  if (loading || !club) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.safe} behavior="padding">
      <BackHeader title={club.name} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
      >
        {/* Club hero */}
        {club.photo_url
          ? <Image source={{ uri: club.photo_url }} style={styles.heroPhoto} resizeMode="cover" />
          : <View style={styles.heroPlaceholder}><Text style={styles.heroEmoji}>🏛️</Text></View>
        }

        <View style={styles.infoCard}>
          <Text style={styles.clubName}>{club.name}</Text>
          {!!club.description && <Text style={styles.clubDesc}>{club.description}</Text>}
          <Text style={styles.clubMeta}>
            Admin: {club.admin?.full_name ?? 'Unknown'} · {formatAgo(club.created_at)}
          </Text>
          <Text style={styles.memberCount}>
            {approved.length} member{approved.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Join button — shown to non-members who aren't admin */}
        {!isAdmin && myStatus === null && (
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
            <Text style={styles.joinBtnText}>Request to Join</Text>
          </TouchableOpacity>
        )}
        {!isAdmin && myStatus === 'pending' && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>⏳ Your request is awaiting approval</Text>
          </View>
        )}
        {!isAdmin && myStatus === 'approved' && (
          <View style={styles.memberBanner}>
            <Text style={styles.memberBannerText}>✅ You are a member of this club</Text>
          </View>
        )}

        {/* Admin: pending requests */}
        {isAdmin && pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests ({pending.length})</Text>
            {pending.map((m) => {
              const busy = actionId === m.id;
              return (
                <View key={m.id} style={styles.memberRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{m.member?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <Text style={styles.memberName}>{m.member?.full_name ?? 'Unknown'}</Text>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(m.id, m.user_id)}
                    disabled={busy}
                  >
                    {busy ? <ActivityIndicator size="small" color={COLORS.black} /> : <Text style={styles.approveBtnText}>Accept</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(m.id, m.user_id, m.member?.full_name)}
                    disabled={busy}
                  >
                    <Text style={styles.rejectBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Members list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          {approved.length === 0
            ? <Text style={styles.empty}>No approved members yet.</Text>
            : approved.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{m.member?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <Text style={styles.memberName}>{m.member?.full_name ?? 'Unknown'}</Text>
                {m.user_id === club.admin_id && (
                  <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
                )}
              </View>
            ))
          }
        </View>

        {/* Posts — visible/postable only to approved members and the admin */}
        {canPost && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Club Posts</Text>

            <View style={styles.composeBox}>
              <TextInput
                style={styles.composeInput}
                placeholder="Share something with the club..."
                placeholderTextColor={COLORS.textMuted}
                value={postText}
                onChangeText={setPostText}
                multiline
              />
              <PhotoPicker uri={postPhotoUri} onChange={setPostPhotoUri} />
              <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={posting}>
                {posting
                  ? <ActivityIndicator size="small" color={COLORS.black} />
                  : <Text style={styles.postBtnText}>Post</Text>
                }
              </TouchableOpacity>
            </View>

            {posts.length === 0
              ? <Text style={styles.empty}>No posts yet — be the first!</Text>
              : posts.map((p) => (
                <View key={p.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{p.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{p.profiles?.full_name ?? 'Unknown'}</Text>
                      <Text style={styles.postTime}>{formatAgo(p.created_at)}</Text>
                    </View>
                    {isSiteAdmin && (
                      <TouchableOpacity style={styles.adminDeleteBtn} onPress={() => handleAdminDelete(p.id)}>
                        <Text style={styles.adminDeleteBtnText}>🗑</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {!!p.text && <Text style={styles.postText}>{p.text}</Text>}
                  {!!p.photo_url && <Image source={{ uri: p.photo_url }} style={styles.postPhoto} resizeMode="cover" />}
                </View>
              ))
            }
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  scroll: { paddingBottom: 48 },
  heroPhoto: { width: '100%', height: 200 },
  heroPlaceholder: {
    width: '100%', height: 120,
    backgroundColor: 'rgba(200,128,10,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroEmoji: { fontSize: 52 },
  infoCard: {
    margin: 16, padding: 16,
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  clubName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  clubDesc: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20, marginBottom: 10 },
  clubMeta: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  memberCount: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  joinBtn: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  joinBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 15 },
  pendingBanner: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(200,128,10,0.1)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  pendingBannerText: { fontSize: 14, color: COLORS.primary, fontWeight: '600', textAlign: 'center' },
  memberBanner: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(39,174,96,0.1)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#27ae60',
  },
  memberBannerText: { fontSize: 14, color: '#27ae60', fontWeight: '600', textAlign: 'center' },
  section: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  empty: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: COLORS.black, fontWeight: '700', fontSize: 14 },
  memberName: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  adminBadge: {
    backgroundColor: 'rgba(200,128,10,0.12)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  adminBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  approveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8,
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.black },
  rejectBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(231,76,60,0.1)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.error,
  },
  rejectBtnText: { fontSize: 14, color: COLORS.error, fontWeight: '700' },
  composeBox: { marginBottom: 16 },
  composeInput: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: COLORS.text, backgroundColor: COLORS.surfaceAlt,
    minHeight: 60, textAlignVertical: 'top', marginBottom: 10,
  },
  postBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  postBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.black },
  postCard: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: 14, marginTop: 4,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  postTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  postText: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 8 },
  postPhoto: { width: '100%', height: 180, borderRadius: 10 },
  adminDeleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  adminDeleteBtnText: { fontSize: 18 },
});

export default ClubDetailScreen;
