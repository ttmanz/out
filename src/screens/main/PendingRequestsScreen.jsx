import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { getPendingRequests, acceptFriendRequest, declineFriendRequest } from '../../lib/friends';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const Avatar = ({ name, size = 44 }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
  </View>
);

const PendingRequestsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) return;
    const { data, error } = await getPendingRequests(session.user.id);
    if (!error) setPending(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const respond = async (friendshipId, accept) => {
    setActionId(friendshipId);
    await (accept ? acceptFriendRequest(friendshipId) : declineFriendRequest(friendshipId));
    setActionId(null);
    setPending((prev) => prev.filter((p) => p.id !== friendshipId));
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
      <BackHeader title={t('friends.pending')} onBack={() => navigation.goBack()} />

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <>
            <AdBanner page="Friends" />
            <ProfileBanner navigation={navigation} />
          </>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('friends.noPending')}</Text>}
        renderItem={({ item }) => {
          const requester = item.requester;
          const busy = actionId === item.id;
          const isPrivate = requester?.visibility === 'private';

          if (isPrivate) {
            return (
              <View style={styles.privateCard}>
                <Avatar name={requester?.full_name} size={56} />
                <Text style={styles.privateName}>{requester?.full_name}</Text>
                <View style={styles.privateBadge}>
                  <Text style={styles.privateBadgeText}>🔒 {t('friends.privateProfile')}</Text>
                </View>
                <Text style={styles.privateDesc}>{t('friends.privateProfileDesc')}</Text>
                <View style={styles.privateActions}>
                  <TouchableOpacity style={[styles.acceptBtn, { flex: 1 }]} onPress={() => !busy && respond(item.id, true)}>
                    <Text style={styles.acceptText}>{t('friends.accept')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.declineBtn, { flex: 1 }]} onPress={() => !busy && respond(item.id, false)}>
                    <Text style={styles.declineText}>{t('friends.decline')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.row}>
              <Avatar name={requester?.full_name} />
              <Text style={styles.name}>{requester?.full_name}</Text>
              {busy ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(item.id, true)}>
                    <Text style={styles.acceptText}>{t('friends.accept')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => respond(item.id, false)}>
                    <Text style={styles.declineText}>{t('friends.decline')}</Text>
                  </TouchableOpacity>
                </View>
              )}
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700' },
  name: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
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
  privateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
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
});

export default PendingRequestsScreen;
