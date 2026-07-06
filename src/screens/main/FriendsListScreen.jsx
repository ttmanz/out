import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getSession } from '../../lib/auth';
import { getFriends, blockMember, removeFriend, getMyBlockedIds } from '../../lib/friends';
import { getOrCreateConversation } from '../../lib/messages';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const Avatar = ({ name }) => (
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
  </View>
);

const FriendsListScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [blockingId, setBlockingId] = useState(null);
  const [messagingId, setMessagingId] = useState(null);

  const load = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) return;
    const uid = session.user.id;
    setUserId(uid);
    const [friendsRes, blockedRes] = await Promise.all([getFriends(uid), getMyBlockedIds(uid)]);
    if (friendsRes.error) Alert.alert(t('common.error'), t('friends.errors.loadFailed'));
    else setFriends(friendsRes.data ?? []);
    if (!blockedRes.error) setBlockedIds(new Set((blockedRes.data ?? []).map((r) => r.blocked_id)));
    setLoading(false);
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const friendProfile = (item) =>
    item.requester_id === userId ? item.addressee : item.requester;
  const friendId = (item) =>
    item.requester_id === userId ? item.addressee_id : item.requester_id;

  const handleMessage = async (fid, fname) => {
    setMessagingId(fid);
    const { data, error } = await getOrCreateConversation(userId, fid);
    setMessagingId(null);
    if (error || !data) return;
    navigation.navigate(ROUTES.CHAT, { conversationId: data.id, friendName: fname });
  };

  const handleBlock = (item) => {
    const profile = friendProfile(item);
    const fid = friendId(item);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Alphabetical, blocked members hidden
  const visibleFriends = friends
    .filter((item) => !blockedIds.has(friendId(item)))
    .sort((a, b) =>
      (friendProfile(a)?.full_name ?? '').localeCompare(friendProfile(b)?.full_name ?? '', undefined, { sensitivity: 'base' })
    );

  return (
    <View style={styles.safe}>
      <BackHeader title={t('friends.friends')} onBack={() => navigation.goBack()} />

      <FlatList
        data={visibleFriends}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <>
            <AdBanner page="Friends" />
            <ProfileBanner navigation={navigation} />
          </>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('friends.noFriends')}</Text>}
        renderItem={({ item }) => {
          const profile = friendProfile(item);
          const fid = friendId(item);
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
  list: { paddingBottom: 40 },
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
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  nameWrap: { flex: 1 },
  name: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  actionBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 18 },
});

export default FriendsListScreen;
