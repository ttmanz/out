import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getSession } from '../../lib/auth';
import { getFriends, getPendingRequests, acceptFriendRequest, declineFriendRequest } from '../../lib/friends';

const Avatar = ({ name }) => (
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
  </View>
);

const FriendsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid) => {
    const [friendsRes, pendingRes] = await Promise.all([
      getFriends(uid),
      getPendingRequests(uid),
    ]);
    if (friendsRes.error) Alert.alert(t('common.error'), t('friends.errors.loadFailed'));
    else setFriends(friendsRes.data ?? []);
    if (!pendingRes.error) setPending(pendingRes.data ?? []);
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

  // Extract the friend profile from a friendship (could be requester or addressee)
  const friendProfile = (item) =>
    item.requester_id === userId ? item.addressee : item.requester;

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('friends.title')}</Text>

      <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate(ROUTES.SEARCH_USERS)}>
        <Text style={styles.searchBtnText}>{t('friends.search')}</Text>
      </TouchableOpacity>

      {pending.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('friends.pending')}</Text>
          {pending.map((item) => (
            <View key={item.id} style={styles.row}>
              <Avatar name={item.requester?.full_name} />
              <Text style={styles.name}>{item.requester?.full_name}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                  <Text style={styles.acceptText}>{t('friends.accept')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item.id)}>
                  <Text style={styles.declineText}>{t('friends.decline')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>{t('friends.friends')}</Text>
      {friends.length === 0
        ? <Text style={styles.empty}>{t('friends.noFriends')}</Text>
        : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const profile = friendProfile(item);
              return (
                <View style={styles.row}>
                  <Avatar name={profile?.full_name} />
                  <Text style={styles.name}>{profile?.full_name}</Text>
                </View>
              );
            }}
          />
        )
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 60 },
  loader: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.primary, marginBottom: 16 },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 24 },
  searchBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 8 },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  name: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  acceptText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  declineBtn: { backgroundColor: COLORS.backgroundDark, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  declineText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
});

export default FriendsScreen;
