import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Image, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getActivityEvents, deriveWhen, getActivityEventReplies, createActivityEventReply, adminDeleteActivityEvent } from '../../lib/activityEvents';
import { getSession } from '../../lib/auth';
import { formatAgo } from '../../utils/format';
import { useUser } from '../../contexts/UserContext';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const formatEventDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const EventCard = ({ event, onGoing, t, replyState, onToggleReplies, onReplyTextChange, onSendReply, isAdmin, onAdminDelete }) => {
  const ps = replyState ?? {};
  const replyCount = ps.replies?.length ?? 0;
  return (
    <View style={styles.card}>
      {!!event.photo_url && (
        <Image source={{ uri: event.photo_url }} style={styles.cardPhoto} resizeMode="cover" />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.eventName, { flex: 1 }]}>{event.name}</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.adminDeleteBtn} onPress={() => onAdminDelete(event.id)}>
              <Text style={styles.adminDeleteBtnText}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
        {!!event.venue && <Text style={styles.eventMeta}>📍 {event.venue}</Text>}
        {!!event.event_date && (
          <Text style={styles.eventMeta}>🗓  {formatEventDate(event.event_date)}</Text>
        )}
        {!!event.description && (
          <Text style={styles.eventDesc}>{event.description}</Text>
        )}
        <TouchableOpacity style={styles.goingBtn} onPress={onGoing} activeOpacity={0.8}>
          <Text style={styles.goingBtnText}>I'm Going →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.replyToggle} onPress={() => onToggleReplies(event.id)}>
          <Text style={styles.replyToggleText}>
            💬 {ps.expanded ? t('happenings.hideReplies') : `${t('happenings.viewReplies')} ${ps.replies ? `(${replyCount})` : ''}`}
          </Text>
        </TouchableOpacity>

        {ps.expanded && (
          <View style={styles.repliesSection}>
            {ps.loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
            ) : (
              <>
                {(ps.replies ?? []).length === 0 && (
                  <Text style={styles.noReplies}>{t('happenings.noReplies')}</Text>
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
                    placeholder={t('happenings.replyPlaceholder')}
                    placeholderTextColor={COLORS.textMuted}
                    value={ps.text ?? ''}
                    onChangeText={(v) => onReplyTextChange(event.id, v)}
                    returnKeyType="send"
                    onSubmitEditing={() => onSendReply(event.id)}
                  />
                  <TouchableOpacity
                    style={styles.sendBtn}
                    onPress={() => onSendReply(event.id)}
                    disabled={ps.sending}
                  >
                    {ps.sending
                      ? <ActivityIndicator size="small" color={COLORS.black} />
                      : <Text style={styles.sendBtnText}>{t('happenings.send')}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const ActivityEventsScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const isAdmin = profile?.is_admin === true;
  const { filter } = route.params;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyState, setReplyState] = useState({});

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const { data, error } = await getActivityEvents(filter);
    if (!error) setEvents(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patchReply = (id, patch) =>
    setReplyState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const toggleReplies = async (eventId) => {
    const cur = replyState[eventId] ?? {};
    if (cur.expanded) { patchReply(eventId, { expanded: false }); return; }
    patchReply(eventId, { expanded: true, loading: true });
    const { data, error } = await getActivityEventReplies(eventId);
    patchReply(eventId, { loading: false, replies: error ? [] : (data ?? []) });
  };

  const handleReply = async (eventId) => {
    const text = (replyState[eventId]?.text ?? '').trim();
    if (!text) return;
    const { data: { session } } = await getSession();
    if (!session) return;
    patchReply(eventId, { sending: true });
    const { error } = await createActivityEventReply(session.user.id, eventId, text);
    if (error) {
      Alert.alert(t('common.error'), t('happenings.errors.replyFailed'));
      patchReply(eventId, { sending: false });
    } else {
      const { data } = await getActivityEventReplies(eventId);
      patchReply(eventId, { sending: false, text: '', replies: data ?? [] });
    }
  };

  const handleGoing = (event) => {
    navigation.navigate(ROUTES.CREATE_HAPPENING, {
      prefill: {
        title: `Going to ${event.name}`,
        venue: event.venue ?? '',
        when: deriveWhen(event.event_date),
      },
    });
  };

  const handleAdminDelete = (eventId) => {
    Alert.alert(
      t('common.deletePostTitle'),
      t('common.deletePostDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await adminDeleteActivityEvent(eventId);
            if (!error) setEvents((prev) => prev.filter((e) => e.id !== eventId));
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

  return (
    <View style={styles.safe}>
      <BackHeader title={t(`happenings.${filter}`).toUpperCase()} onBack={() => navigation.goBack()} />

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={() => (
          <>
            <AdBanner page="HappeningFeed" />
            <ProfileBanner navigation={navigation} />
          </>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No events listed yet — check back soon!</Text>
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onGoing={() => handleGoing(item)}
            t={t}
            replyState={replyState[item.id]}
            onToggleReplies={toggleReplies}
            onReplyTextChange={(id, v) => patchReply(id, { text: v })}
            onSendReply={handleReply}
            isAdmin={isAdmin}
            onAdminDelete={handleAdminDelete}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(ROUTES.CREATE_ACTIVITY_EVENT, { category: filter })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: COLORS.textMuted, fontSize: 15, marginTop: 60, paddingHorizontal: 32, lineHeight: 22 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    overflow: 'hidden',
  },
  cardPhoto: { width: '100%', height: 180 },
  cardBody: { padding: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  adminDeleteBtn: { paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 },
  adminDeleteBtnText: { fontSize: 18 },
  eventName: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  eventMeta: { fontSize: 13, color: COLORS.textMuted, marginBottom: 3 },
  eventDesc: { fontSize: 13, color: COLORS.text, lineHeight: 18, marginTop: 6, marginBottom: 4 },
  goingBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  goingBtnText: { color: COLORS.background, fontWeight: '800', fontSize: 14 },
  replyToggle: { alignSelf: 'flex-start', marginTop: 12 },
  replyToggleText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  repliesSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  noReplies: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  replyRow: { marginBottom: 10 },
  replyName: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  replyText: { fontSize: 13, color: COLORS.text, marginTop: 1 },
  replyTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.text,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.black },
  fab: {
    position: 'absolute',
    bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: COLORS.black, fontSize: 28, lineHeight: 32, fontWeight: '700' },
});

export default ActivityEventsScreen;
