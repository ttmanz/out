import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { getProfile, updateProfileSettings } from '../../lib/profile';
import { getFriends, getCloseFriendIds, addCloseFriend, removeCloseFriend } from '../../lib/friends';

const VISIBILITY_OPTIONS = [
  {
    key: 'everyone',
    emoji: '🌍',
    labelKey: 'profileSettings.everyone',
    descKey: 'profileSettings.everyoneDesc',
  },
  {
    key: 'friends',
    emoji: '👥',
    labelKey: 'profileSettings.friends',
    descKey: 'profileSettings.friendsDesc',
  },
  {
    key: 'close_friends',
    emoji: '⭐',
    labelKey: 'profileSettings.closeFriends',
    descKey: 'profileSettings.closeFriendsDesc',
  },
  {
    key: 'private',
    emoji: '🔒',
    labelKey: 'profileSettings.private',
    descKey: 'profileSettings.privateDesc',
  },
];

const ProfileSettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [visibility, setVisibility] = useState('everyone');
  const [allowRequests, setAllowRequests] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [friends, setFriends] = useState([]);
  const [closeFriendIds, setCloseFriendIds] = useState(new Set());
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const uid = session.user.id;
      setUserId(uid);

      const [profileRes, friendsRes, closeRes] = await Promise.all([
        getProfile(uid),
        getFriends(uid),
        getCloseFriendIds(uid),
      ]);

      if (!profileRes.error) {
        setVisibility(profileRes.data?.visibility ?? 'everyone');
        setAllowRequests(profileRes.data?.allow_friend_requests ?? true);
      }
      if (!friendsRes.error) setFriends(friendsRes.data ?? []);
      if (!closeRes.error) setCloseFriendIds(new Set((closeRes.data ?? []).map((r) => r.friend_id)));

      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfileSettings(userId, {
      visibility,
      allow_friend_requests: allowRequests,
    });
    setSaving(false);
    if (error) Alert.alert(t('common.error'), t('profileSettings.saveFailed'));
    else navigation.goBack();
  };

  const toggleCloseFriend = async (fid) => {
    setTogglingId(fid);
    if (closeFriendIds.has(fid)) {
      const { error } = await removeCloseFriend(userId, fid);
      if (!error) setCloseFriendIds((prev) => { const s = new Set(prev); s.delete(fid); return s; });
    } else {
      const { error } = await addCloseFriend(userId, fid);
      if (!error) setCloseFriendIds((prev) => new Set([...prev, fid]));
    }
    setTogglingId(null);
  };

  const friendProfile = (item) =>
    item.requester_id === userId ? item.addressee : item.requester;

  const friendId = (item) =>
    item.requester_id === userId ? item.addressee_id : item.requester_id;

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
        <Text style={styles.headerTitle}>{t('profileSettings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>{t('profileSettings.whoCanFind')}</Text>

        {VISIBILITY_OPTIONS.map(({ key, emoji, labelKey, descKey }) => {
          const selected = visibility === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setVisibility(key)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{emoji}</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {t(labelKey)}
                </Text>
                <Text style={styles.optionDesc}>{t(descKey)}</Text>
              </View>
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        {visibility === 'private' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{t('profileSettings.privateNote')}</Text>
          </View>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{t('profileSettings.whoCanRequest')}</Text>

        <TouchableOpacity
          style={[styles.option, allowRequests && styles.optionSelected]}
          onPress={() => setAllowRequests(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.optionEmoji}>👐</Text>
          <View style={styles.optionText}>
            <Text style={[styles.optionLabel, allowRequests && styles.optionLabelSelected]}>
              {t('profileSettings.requestsEveryone')}
            </Text>
            <Text style={styles.optionDesc}>{t('profileSettings.requestsEveryoneDesc')}</Text>
          </View>
          <View style={[styles.checkbox, allowRequests && styles.checkboxSelected]}>
            {allowRequests && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, !allowRequests && styles.optionSelected]}
          onPress={() => setAllowRequests(false)}
          activeOpacity={0.7}
        >
          <Text style={styles.optionEmoji}>🚫</Text>
          <View style={styles.optionText}>
            <Text style={[styles.optionLabel, !allowRequests && styles.optionLabelSelected]}>
              {t('profileSettings.requestsNobody')}
            </Text>
            <Text style={styles.optionDesc}>{t('profileSettings.requestsNobodyDesc')}</Text>
          </View>
          <View style={[styles.checkbox, !allowRequests && styles.checkboxSelected]}>
            {!allowRequests && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {visibility === 'close_friends' && (
          <>
            <Text style={styles.sectionLabel}>{t('profileSettings.markCloseFriends')}</Text>
            {friends.length === 0 ? (
              <Text style={styles.emptyText}>{t('profileSettings.noFriendsYet')}</Text>
            ) : (
              friends.map((item) => {
                const profile = friendProfile(item);
                const fid = friendId(item);
                const isClose = closeFriendIds.has(fid);
                const toggling = togglingId === fid;
                return (
                  <View key={item.id} style={styles.friendRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <Text style={styles.friendName}>{profile?.full_name}</Text>
                    <TouchableOpacity
                      style={[styles.starBtn, isClose && styles.starBtnActive]}
                      onPress={() => !toggling && toggleCloseFriend(fid)}
                      disabled={toggling}
                    >
                      {toggling
                        ? <ActivityIndicator size="small" color={isClose ? COLORS.white : COLORS.textMuted} />
                        : <Text style={[styles.starText, isClose && styles.starTextActive]}>
                            {isClose ? '★' : '☆'}
                          </Text>
                      }
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.saveBtnText}>{t('profileSettings.save')}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 20, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  optionEmoji: { fontSize: 26, marginRight: 14 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  optionLabelSelected: { color: COLORS.primary },
  optionDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  infoBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  infoText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  friendName: { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.text },
  starBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starBtnActive: { backgroundColor: '#ffd700', borderColor: '#b8960c' },
  starText: { fontSize: 20, color: COLORS.textMuted },
  starTextActive: { color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 16 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});

export default ProfileSettingsScreen;
