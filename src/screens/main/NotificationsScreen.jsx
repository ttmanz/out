import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getSession } from '../../lib/auth';
import { getNotifications, markAllNotificationsRead } from '../../lib/notifications';
import { formatAgo } from '../../utils/format';

const TYPE_ICON = {
  friend_request: '👥',
  reply: '💬',
  night_out_invite: '🌙',
};

const NotificationsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) return;
    const uid = session.user.id;
    const { data, error } = await getNotifications(uid);
    if (!error) setNotifications(data ?? []);
    setLoading(false);
    markAllNotificationsRead(uid);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePress = (item) => {
    if (item.type === 'friend_request') {
      navigation.navigate('FriendsTab');
    } else if (item.type === 'reply') {
      if (item.reference_type === 'spur') navigation.navigate('HomeTab', { screen: ROUTES.SPUR_OF_MOMENT });
      else if (item.reference_type === 'open_chat') navigation.navigate('HomeTab', { screen: ROUTES.OPEN_CHAT });
    } else if (item.type === 'night_out_invite') {
      navigation.navigate('HomeTab', { screen: ROUTES.NIGHT_OUT });
    }
  };

  const formatMessage = (item) => {
    const actor = item.actor?.full_name ?? t('notifications.someone');
    if (item.type === 'friend_request') return t('notifications.friendRequest', { name: actor });
    if (item.type === 'reply') return t('notifications.reply', { name: actor, post: item.reference_text ?? '' });
    if (item.type === 'night_out_invite') return t('notifications.nightOutInvite', { name: actor, plan: item.reference_text ?? '' });
    return '';
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
        <Text style={styles.title}>{t('notifications.title')}</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.empty}>{t('notifications.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, !item.read && styles.rowUnread]}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
              <Text style={styles.icon}>{TYPE_ICON[item.type] ?? '🔔'}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.message}>{formatMessage(item)}</Text>
              <Text style={styles.time}>{formatAgo(item.created_at)}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
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
  rowUnread: { backgroundColor: COLORS.primaryLight },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  iconWrapUnread: { backgroundColor: COLORS.primaryLight },
  icon: { fontSize: 20 },
  content: { flex: 1 },
  message: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  time: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  dot: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  },
});

export default NotificationsScreen;
