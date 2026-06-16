import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';
import { getMemberHappenings } from '../../lib/happenings';
import { getOrCreateConversation } from '../../lib/messages';
import { formatAgo } from '../../utils/format';
import AdBanner from '../../components/common/AdBanner';

const POST_TYPE_LABEL = {
  spur: '⚡ Spur',
  open_chat: '💬 Chat',
  today: '🎉 Today',
  tomorrow: '🎉 Tomorrow',
  thisWeekend: '🎉 Weekend',
  nearby: '🎉 Nearby',
};

const MemberProfileScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { userId: targetId, fullName } = route.params;
  const [myId, setMyId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) return;
    const uid = session.user.id;
    setMyId(uid);

    const [profileRes, postsRes, friendRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, visibility').eq('id', targetId).single(),
      getMemberHappenings(targetId),
      supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${uid},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${uid})`)
        .maybeSingle(),
    ]);

    if (!profileRes.error) setProfile(profileRes.data);
    if (!postsRes.error) setPosts(postsRes.data ?? []);
    setIsFriend(!!friendRes.data);
    setLoading(false);
  }, [targetId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleMessage = async () => {
    setMessaging(true);
    const { data, error } = await getOrCreateConversation(myId, targetId);
    setMessaging(false);
    if (error || !data) return;
    navigation.navigate(ROUTES.CHAT, {
      conversationId: data.id,
      friendName: profile?.full_name ?? fullName,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{profile?.full_name ?? fullName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View style={styles.profileCard}>
            <AdBanner page="MemberProfile" />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.full_name ?? fullName)?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={styles.profileName}>{profile?.full_name ?? fullName}</Text>
            {profile?.visibility === 'private' && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>🔒 Private</Text>
              </View>
            )}
            {isFriend && targetId !== myId && (
              <TouchableOpacity style={styles.messageBtn} onPress={handleMessage} disabled={messaging}>
                {messaging
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={styles.messageBtnText}>💬 {t('messages.sendMessage')}</Text>
                }
              </TouchableOpacity>
            )}
            <Text style={styles.postsLabel}>{t('profile.activity')}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('profile.noPosts')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text style={styles.postType}>{POST_TYPE_LABEL[item.happening_at] ?? '📌'}</Text>
            <Text style={styles.postTitle}>{item.title}</Text>
            {!!item.venue && <Text style={styles.postMeta}>📍 {item.venue}</Text>}
            <Text style={styles.postTime}>{formatAgo(item.created_at)}</Text>
          </View>
        )}
      />
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
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  profileCard: { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 30 },
  profileName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  badge: { backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  messageBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 20,
  },
  messageBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  postsLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, alignSelf: 'flex-start',
  },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 30 },
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  postType: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4 },
  postTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  postMeta: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  postTime: { fontSize: 11, color: COLORS.textMuted },
});

export default MemberProfileScreen;
