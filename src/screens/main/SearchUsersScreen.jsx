import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { searchUsers, sendFriendRequest, getSentRequestIds, getMyBlockedIds, blockMember } from '../../lib/friends';
import { getSession } from '../../lib/auth';
import { useUser } from '../../contexts/UserContext';
import AuthInput from '../../components/auth/AuthInput';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const Avatar = ({ name }) => (
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
  </View>
);

const sharedCount = (a = [], b = []) => a.filter((i) => b.includes(i)).length;

// Directory-style search: the whole visible member list is loaded once and
// shown alphabetically; typing narrows it locally letter by letter. No
// per-keystroke server round-trips.
const SearchUsersScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [userId, setUserId] = useState(null);
  const [query, setQuery] = useState('');
  const [directory, setDirectory] = useState([]);
  const [sentIds, setSentIds] = useState(new Set());
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [blockingId, setBlockingId] = useState(null);

  const loadDirectory = async (uid) => {
    setLoading(true);
    setLoadError(false);
    // Empty prefix matches everyone the caller is allowed to see
    const { data, error } = await searchUsers('', uid);
    if (error) {
      setLoadError(true);
    } else {
      setDirectory((data ?? []).sort((a, b) =>
        (a.full_name ?? '').localeCompare(b.full_name ?? '', undefined, { sensitivity: 'base' })
      ));
    }
    setLoading(false);
  };

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      loadDirectory(uid);
      if (!uid) return;
      Promise.all([
        getSentRequestIds(uid),
        getMyBlockedIds(uid),
      ]).then(([sentRes, blockedRes]) => {
        setSentIds(new Set((sentRes.data ?? []).map((r) => r.addressee_id)));
        setBlockedIds(new Set((blockedRes.data ?? []).map((r) => r.blocked_id)));
      });
    });
  }, []);

  const myInterests = profile?.interests ?? [];

  // Narrow letter by letter: match the start of the full name or of any word in it
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory.filter((r) => {
      if (blockedIds.has(r.id)) return false;
      if (!q) return true;
      const name = (r.full_name ?? '').toLowerCase();
      return name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q));
    });
  }, [directory, query, blockedIds]);

  const handleAdd = async (addresseeId) => {
    const { error } = await sendFriendRequest(userId, addresseeId);
    if (!error) {
      setSentIds((prev) => new Set([...prev, addresseeId]));
    } else if (error.code === 'REQUESTS_CLOSED') {
      Alert.alert(t('common.error'), t('friends.errors.requestsClosed'));
    } else {
      Alert.alert(t('common.error'), t('friends.errors.sendFailed'));
    }
  };

  const handleBlock = (targetId, targetName) => {
    Alert.alert(
      t('friends.blockConfirm'),
      t('friends.blockConfirmDesc', { name: targetName }),
      [
        { text: t('friends.cancel'), style: 'cancel' },
        {
          text: t('friends.block'),
          style: 'destructive',
          onPress: async () => {
            setBlockingId(targetId);
            const { error } = await blockMember(userId, targetId);
            setBlockingId(null);
            if (error) {
              Alert.alert(t('common.error'), t('friends.errors.blockFailed'));
            } else {
              setBlockedIds((prev) => new Set([...prev, targetId]));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.safe}>
      <BackHeader title={t('friends.search')} onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <AuthInput
          placeholder={t('friends.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : loadError ? (
          <View style={styles.center}>
            <Text style={styles.empty}>{t('friends.errors.searchFailed')}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadDirectory(userId)}>
              <Text style={styles.retryText}>{t('friends.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={() => (
              <>
                <AdBanner page="SearchUsers" />
                <ProfileBanner navigation={navigation} />
              </>
            )}
            ListEmptyComponent={<Text style={styles.empty}>{t('friends.noResults')}</Text>}
            renderItem={({ item }) => {
              const sent = sentIds.has(item.id);
              const requestsClosed = !item.allow_friend_requests;
              const isBlocking = blockingId === item.id;
              const shared = sharedCount(item.interests, myInterests);

              return (
                <View style={styles.row}>
                  <Avatar name={item.full_name} />
                  <View style={styles.nameWrap}>
                    <Text style={styles.name}>{item.full_name}</Text>
                    {shared > 0 && (
                      <Text style={styles.sharedBadge}>✦ {shared} shared interest{shared > 1 ? 's' : ''}</Text>
                    )}
                  </View>
                  {requestsClosed ? (
                    <View style={styles.closedBadge}>
                      <Text style={styles.closedBadgeText}>{t('friends.requestsClosed')}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addBtn, sent && styles.addBtnSent]}
                      onPress={() => !sent && handleAdd(item.id)}
                      disabled={sent}
                    >
                      <Text style={styles.addBtnText}>
                        {sent ? t('friends.requestSent') : t('friends.addFriend')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.blockBtn}
                    onPress={() => handleBlock(item.id, item.full_name)}
                    disabled={isBlocking}
                  >
                    {isBlocking
                      ? <ActivityIndicator size="small" color={COLORS.error} />
                      : <Text style={styles.blockBtnText}>⊘</Text>
                    }
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1, padding: 20, paddingTop: 12 },
  center: { alignItems: 'center', marginTop: 40, gap: 14 },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
  retryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 22, paddingVertical: 10,
  },
  retryText: { color: COLORS.black, fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  nameWrap: { flex: 1 },
  name: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  sharedBadge: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnSent: { backgroundColor: COLORS.border },
  addBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  closedBadge: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  closedBadgeText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 12 },
  blockBtn: { paddingHorizontal: 10, paddingVertical: 6, marginLeft: 6 },
  blockBtnText: { fontSize: 20, color: COLORS.error },
});

export default SearchUsersScreen;
