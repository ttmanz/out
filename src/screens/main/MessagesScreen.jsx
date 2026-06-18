import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getSession } from '../../lib/auth';
import { getConversations } from '../../lib/messages';
import { formatAgo } from '../../utils/format';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';

const Avatar = ({ name }) => (
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
  </View>
);

const MessagesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) return;
    const uid = session.user.id;
    setUserId(uid);
    const { data, error } = await getConversations(uid);
    if (!error) setConversations(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const getPartner = (conv) => {
    if (!userId) return null;
    return conv.user1_id === userId ? conv.user2 : conv.user1;
  };

  const openChat = (conv) => {
    const partner = getPartner(conv);
    navigation.navigate(ROUTES.CHAT, {
      conversationId: conv.id,
      friendName: partner?.full_name ?? t('messages.unknownMember'),
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('messages.title')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <>
            <AdBanner page="Messages" />
            <ProfileBanner navigation={navigation} />
          </>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.empty}>{t('messages.noConversations')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const partner = getPartner(item);
          return (
            <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.7}>
              <Avatar name={partner?.full_name} />
              <View style={styles.rowContent}>
                <Text style={styles.partnerName}>{partner?.full_name ?? t('messages.unknownMember')}</Text>
                {!!item.last_message_content && (
                  <Text style={styles.lastMsg} numberOfLines={1}>{item.last_message_content}</Text>
                )}
              </View>
              {!!item.last_message_at && (
                <Text style={styles.time}>{formatAgo(item.last_message_at)}</Text>
              )}
            </TouchableOpacity>
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
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  title: { flex: 1, fontSize: 26, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  list: { paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { color: COLORS.textMuted, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 18 },
  rowContent: { flex: 1 },
  partnerName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  lastMsg: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  time: { fontSize: 11, color: COLORS.textMuted, marginLeft: 8 },
});

export default MessagesScreen;
