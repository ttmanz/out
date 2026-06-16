import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getSession } from '../../lib/auth';
import { getFriends, getPendingRequests, acceptFriendRequest, declineFriendRequest, blockMember, removeFriend, getMyBlockedIds } from '../../lib/friends';
import { getOrCreateConversation } from '../../lib/messages';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';

const Avatar = ({ name, size = 44 }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
  </View>
);

const FriendsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [blockingId, setBlockingId] = useState(null);
  const [messagingId, setMessagingId] = useState(null);

  const load = useCallback(async (uid) => {
    const [friendsRes, pendingRes, blockedRes] = await Promise.all([
      getFriends(uid),
      getPendingRequests(uid),
      getMyBlockedIds(uid),
    ]);
    if (friendsRes.error) Alert.alert(t('common.error'), t('friends.errors.loadFailed'));
    else setFriends(friendsRes.data ?? []);
    if (!pendingRes.error) setPending(pendingRes.data ?? []);
    if (!blockedRes.error) setBlockedIds(new Set((blockedRes.data ?? []).map((r) => r.blocked_id)));
  }, [t]);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        load(session.user.id).finally(() => setLoading(false));
      }
    });
  }, [load]);

  const handleAccept = async (friendshipId) => {
    await acceptFriendRequest(friendshipId);
    load(userId);
  };

  const handleDecline = async (friendshipId) => {
    await declineFriendRequest(friendshipId);
    load(userId);
  };

  const handleBlock = (item) => {
    const profile = friendProfile(item);
    const fid = item.requester_id === userId ? item.addressee_id : item.requester_id;
    Alert.alert(
      t('friends.blockConfirm'),
      t('friends.blockConfirmDesc', { name: profile?.full_name }),
      [
        { text: t('friends.cancel'), style: 'cancel' },
        {
          text: t('friends.block'),
          style: 'destructive',
          onPress: async () => {
            setBlockingId(fid);
            await Promise.all([blockMember(userId, fid), removeFriend(userId, fid)]);
            setBlockingId(null);
            setBlockedIds((prev) => new Set([...prev, fid]));
            setFriends((prev) => prev.filter((f) => f.id !== item.id));
          },
        },
      ]
    );
  };

  const friendProfile = (item) =>
    item.requester_id === userId ? item.addressee : item.requester;

  const handleMessage = async (fid, fname) => {
    setMessagingId(fid);
    const { data, error } = await getOrCreateConversation(userId, fid);
    setMessagingId(null);
    if (error || !data) return;
    navigation.navigate(ROUTES.CHAT, { conversationId: data.id, friendName: fname });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const visibleFriends = friends.filter((item) => {
    const fid = item.requester_id === userId ? item.addressee_id : item.requester_id;
    return !blockedIds.has(fid);
  });

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
        <Text style={styles.title}>{t('friends.title')}</Text>
        <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate(ROUTES.SEARCH_USERS)}>
          <Text style={styles.searchBtnText}>🔍 {t('friends.search')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleFriends}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => pending.length > 0 ? (
          <View>
            <AdBanner page="Friends" />
            <ProfileBanner navigation={navigation} />
            <Text style={styles.sectionTitle}>{t('friends.pending')}</Text>
            {pending.map((item) => {
              const requester = item.requester;
              const isPrivate = requester?.visibility === 'private';
              if (isPrivate) {
                return (
                  <View key={item.id} style={styles.privateCard}>
                    <Avatar name={requester?.full_name} size={56} />
                    <Text style={styles.privateName}>{requester?.full_name}</Text>
                    <View style={styles.privateBadge}>
                      <Text style={styles.privateBadgeText}>🔒 {t('friends.privateProfile')}</Text>
                    </View>
                    <Text style={styles.privateDesc}>{t('friends.privateProfileDesc')}</Text>
                    <View style={styles.privateActions}>
                      <TouchableOpacity style={[styles.acceptBtn, { flex: 1 }]} onPress={() => handleAccept(item.id)}>
                        <Text style={styles.acceptText}>{t('friends.accept')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.declineBtn, { flex: 1 }]} onPress={() => handleDecline(item.id)}>
                        <Text style={styles.declineText}>{t('friends.decline')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }
              return (
                <View key={item.id} style={styles.pendingRow}>
                  <Avatar name={requester?.full_name} />
                  <Text style={styles.pendingName}>{requester?.full_name}</Text>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                      <Text style={styles.acceptText}>{t('friends.accept')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item.id)}>
                      <Text style={styles.declineText}>{t('friends.decline')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            <Text style={styles.sectionTitle}>{t('friends.friends')}</Text>
          </View>
        ) : (
          <View>
            <AdBanner page="Friends" />
            <ProfileBanner navigation={navigation} />
            <Text style={styles.sectionTitle}>{t('friends.friends')}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('friends.noFriends')}</Text>}
        renderItem={({ item }) => {
          const profile = friendProfile(item);
          const fid = item.requester_id === userId ? item.addressee_id : item.requester_id;
          const isBlocking = blockingId === fid;
          const isMessaging = messagingId === fid;
          return (
            <View style={styles.row}>
              <Avatar name={profile?.full_name} />
              <TouchableOpacity
                style={styles.nameWrap}
                onPress={() => navigation.navigate(ROUTES.MEMBER_PROFILE, { userId: fid, fullName: profile?.full_name })}
              >
                <Text style={styles.name}>{profile?.full_name}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleMessage(fid, profile?.full_name)}
                disabled={isMessaging}
              >
                {isMessaging
                  ? <ActivityIndicator size="small" color={COLORS.primary} />
                  : <Text style={styles.actionBtnText}>💬</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleBlock(item)}
                disabled={isBlocking}
              >
                {isBlocking
                  ? <ActivityIndicator size="small" color={COLORS.error} />
                  : <Text style={styles.actionBtnText}>⊘</Text>
                }
              </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  searchBtn: {
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
  },
  searchBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  list: { paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 32, paddingHorizontal: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700' },
  nameWrap: { flex: 1 },
  name: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  actionBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 18 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pendingName: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '600', marginLeft: 0 },
  pendingActions: { flexDirection: 'row', gap: 8 },
  privateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  privateName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 10, marginBottom: 6 },
  privateBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 8,
  },
  privateBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  privateDesc: {
    fontSize: 12, color: COLORS.textMuted, textAlign: 'center',
    lineHeight: 18, marginBottom: 16, paddingHorizontal: 8,
  },
  privateActions: { flexDirection: 'row', gap: 10, width: '100%' },
  acceptBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, alignItems: 'center',
  },
  acceptText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  declineBtn: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, alignItems: 'center',
  },
  declineText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },
});

export default FriendsScreen;
