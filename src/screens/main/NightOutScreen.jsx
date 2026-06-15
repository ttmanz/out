import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getSession } from '../../lib/auth';
import { getMyNightOuts, deleteNightOut } from '../../lib/nightOut';
import { formatAgo } from '../../utils/format';

const STATUS_EMOJI = { going: '✅', maybe: '🤔', declined: '❌', invited: '⏳' };

const NightOutScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) return;
    setUserId(session.user.id);
    const { data, error } = await getMyNightOuts();
    if (!error) setPlans(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (id) => {
    Alert.alert(t('nightOut.deleteTitle'), t('nightOut.deleteDesc'), [
      { text: t('friends.cancel'), style: 'cancel' },
      {
        text: t('nightOut.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteNightOut(id);
          setPlans((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('nightOut.title')}</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate(ROUTES.CREATE_NIGHT_OUT)}
        >
          <Text style={styles.createBtnText}>+ {t('nightOut.create')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🌙</Text>
            <Text style={styles.empty}>{t('nightOut.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const myStatus = item.members?.find((m) => m.user_id === userId)?.status;
          const isOrganizer = item.organizer_id === userId;
          const goingCount = item.members?.filter((m) => m.status === 'going').length ?? 0;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate(ROUTES.NIGHT_OUT_DETAIL, { nightOutId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {!!item.venue && <Text style={styles.cardMeta}>📍 {item.venue}</Text>}
                  {!!item.planned_at && <Text style={styles.cardMeta}>🕐 {item.planned_at}</Text>}
                  <Text style={styles.cardOrganizer}>
                    {isOrganizer ? t('nightOut.youOrganized') : `${t('nightOut.by')} ${item.organizer?.full_name}`}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  {myStatus && !isOrganizer && (
                    <Text style={styles.myStatus}>{STATUS_EMOJI[myStatus]}</Text>
                  )}
                  <Text style={styles.goingCount}>{goingCount} {t('nightOut.going')}</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardTime}>{formatAgo(item.created_at)}</Text>
                {isOrganizer && (
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>{t('nightOut.delete')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
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
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.purple },
  createBtn: {
    backgroundColor: COLORS.purpleBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createBtnText: { color: COLORS.purple, fontWeight: '700', fontSize: 13 },
  list: { paddingVertical: 12, paddingHorizontal: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { color: COLORS.textMuted, fontSize: 15 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.purpleBg,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', marginBottom: 10 },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  cardOrganizer: { fontSize: 11, color: COLORS.purple, fontWeight: '600', marginTop: 4 },
  myStatus: { fontSize: 22, marginBottom: 4 },
  goingCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTime: { fontSize: 11, color: COLORS.textMuted },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  deleteBtnText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },
});

export default NightOutScreen;
