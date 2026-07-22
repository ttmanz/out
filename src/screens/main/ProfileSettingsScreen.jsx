import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { ROUTES } from '../../constants/routes';
import { getProfile, updateProfileSettings } from '../../lib/profile';
import { getFriends, getCloseFriendIds, addCloseFriend, removeCloseFriend, getMyBlockedProfiles, unblockMember } from '../../lib/friends';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const VISIBILITY_OPTIONS = [
  { key: 'everyone',      emoji: '🌍', labelKey: 'profileSettings.everyone',     descKey: 'profileSettings.everyoneDesc' },
  { key: 'friends',       emoji: '👥', labelKey: 'profileSettings.friends',       descKey: 'profileSettings.friendsDesc' },
  { key: 'close_friends', emoji: '⭐', labelKey: 'profileSettings.closeFriends',  descKey: 'profileSettings.closeFriendsDesc' },
  { key: 'private',       emoji: '🔒', labelKey: 'profileSettings.private',       descKey: 'profileSettings.privateDesc' },
];

const VENUE_VISIBILITY_OPTIONS = [
  { key: 'invisible',          emoji: '🙈', labelKey: 'profileSettings.venueInvisible',        descKey: 'profileSettings.venueInvisibleDesc' },
  { key: 'friends',            emoji: '👥', labelKey: 'profileSettings.venueFriends',          descKey: 'profileSettings.venueFriendsDesc' },
  { key: 'friends_of_friends', emoji: '🔗', labelKey: 'profileSettings.venueFriendsOfFriends', descKey: 'profileSettings.venueFriendsOfFriendsDesc' },
  { key: 'everyone',           emoji: '🌍', labelKey: 'profileSettings.venueEveryone',          descKey: 'profileSettings.venueEveryoneDesc' },
];

const ProfileSettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [fullName, setFullName] = useState('');
  const [visibility, setVisibility] = useState('everyone');
  const [venueVisibility, setVenueVisibility] = useState('everyone');
  const [allowRequests, setAllowRequests] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [friends, setFriends] = useState([]);
  const [closeFriendIds, setCloseFriendIds] = useState(new Set());
  const [togglingId, setTogglingId] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const uid = session.user.id;
      setUserId(uid);
      const [profileRes, friendsRes, closeRes, blockedRes] = await Promise.all([
        getProfile(uid),
        getFriends(uid),
        getCloseFriendIds(uid),
        getMyBlockedProfiles(uid),
      ]);
      if (!profileRes.error) {
        setFullName(profileRes.data?.full_name ?? '');
        setVisibility(profileRes.data?.visibility ?? 'everyone');
        setVenueVisibility(profileRes.data?.venue_visibility ?? 'everyone');
        setAllowRequests(profileRes.data?.allow_friend_requests ?? true);
      }
      if (!friendsRes.error) setFriends(friendsRes.data ?? []);
      if (!closeRes.error) setCloseFriendIds(new Set((closeRes.data ?? []).map((r) => r.friend_id)));
      if (!blockedRes.error) setBlocked(blockedRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const handleUnblock = async (blockedId) => {
    setUnblockingId(blockedId);
    const { error } = await unblockMember(userId, blockedId);
    setUnblockingId(null);
    if (error) Alert.alert(t('common.error'), t('profileSettings.unblockFailed'));
    else setBlocked((prev) => prev.filter((b) => b.id !== blockedId));
  };

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert(t('common.error'), t('profileSettings.errorName')); return; }
    setSaving(true);
    const { error } = await updateProfileSettings(userId, {
      visibility, allow_friend_requests: allowRequests, full_name: fullName.trim(),
      venue_visibility: venueVisibility,
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

  const friendProfile = (item) => item.requester_id === userId ? item.addressee : item.requester;
  const friendId = (item) => item.requester_id === userId ? item.addressee_id : item.requester_id;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <BackHeader title={t('profileSettings.title')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AdBanner page="ProfileSettings" />
        <ProfileBanner navigation={navigation} />

        <Text style={styles.sectionLabel}>{t('profileSettings.fullNameLabel')}</Text>
        <TextInput
          style={styles.nameInput}
          value={fullName}
          onChangeText={setFullName}
          placeholder={t('profileSettings.fullNamePlaceholder')}
          placeholderTextColor={COLORS.textMuted}
          maxLength={80}
        />

        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => navigation.navigate(ROUTES.COMPLETE_PROFILE)}
          activeOpacity={0.8}
        >
          <Text style={styles.editProfileEmoji}>👤</Text>
          <View style={styles.editProfileText}>
            <Text style={styles.editProfileLabel}>Edit My Profile</Text>
            <Text style={styles.editProfileDesc}>Photo, bio, interests, city & more</Text>
          </View>
          <Text style={styles.editProfileChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => navigation.navigate(ROUTES.SUBSCRIPTION)}
          activeOpacity={0.8}
        >
          <Text style={styles.editProfileEmoji}>⭐</Text>
          <View style={styles.editProfileText}>
            <Text style={styles.editProfileLabel}>{t('subscription.title')}</Text>
            <Text style={styles.editProfileDesc}>{t('subscription.manageDesc')}</Text>
          </View>
          <Text style={styles.editProfileChevron}>›</Text>
        </TouchableOpacity>

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
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{t(labelKey)}</Text>
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

        {[
          { val: true,  emoji: '👐', labelKey: 'profileSettings.requestsEveryone', descKey: 'profileSettings.requestsEveryoneDesc' },
          { val: false, emoji: '🚫', labelKey: 'profileSettings.requestsNobody',   descKey: 'profileSettings.requestsNobodyDesc' },
        ].map(({ val, emoji, labelKey, descKey }) => {
          const selected = allowRequests === val;
          return (
            <TouchableOpacity
              key={String(val)}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setAllowRequests(val)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{emoji}</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{t(labelKey)}</Text>
                <Text style={styles.optionDesc}>{t(descKey)}</Text>
              </View>
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{t('profileSettings.whoSeesAtVenue')}</Text>

        {VENUE_VISIBILITY_OPTIONS.map(({ key, emoji, labelKey, descKey }) => {
          const selected = venueVisibility === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setVenueVisibility(key)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{emoji}</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{t(labelKey)}</Text>
                <Text style={styles.optionDesc}>{t(descKey)}</Text>
              </View>
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

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
                      <Text style={styles.avatarText}>{profile?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <Text style={styles.friendName}>{profile?.full_name}</Text>
                    <TouchableOpacity
                      style={[styles.starBtn, isClose && styles.starBtnActive]}
                      onPress={() => !toggling && toggleCloseFriend(fid)}
                      disabled={toggling}
                    >
                      {toggling
                        ? <ActivityIndicator size="small" color={isClose ? COLORS.black : COLORS.textMuted} />
                        : <Text style={[styles.starText, isClose && styles.starTextActive]}>{isClose ? '★' : '☆'}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}

        {blocked.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{t('profileSettings.blockedMembers')}</Text>
            {blocked.map((b) => {
              const unblocking = unblockingId === b.id;
              return (
                <View key={b.id} style={styles.friendRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{b.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <Text style={styles.friendName}>{b.full_name}</Text>
                  <TouchableOpacity
                    style={styles.unblockBtn}
                    onPress={() => !unblocking && handleUnblock(b.id)}
                    disabled={unblocking}
                  >
                    {unblocking
                      ? <ActivityIndicator size="small" color={COLORS.primary} />
                      : <Text style={styles.unblockText}>{t('profileSettings.unblock')}</Text>
                    }
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={COLORS.black} />
            : <Text style={styles.saveBtnText}>{t('profileSettings.save')}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 8,
  },
  nameInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.borderAccent,
    borderRadius: 14, padding: 16, marginBottom: 20,
    fontSize: 15, color: COLORS.text,
  },
  option: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(200,128,10,0.12)',
  },
  optionEmoji: { fontSize: 26, marginRight: 14 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  optionLabelSelected: { color: COLORS.primary },
  optionDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.black, fontSize: 14, fontWeight: '700' },
  infoBox: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12,
    padding: 14, marginBottom: 16, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  friendName: { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.text },
  starBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: COLORS.borderAccent,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(200,128,10,0.08)',
  },
  starBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  starText: { fontSize: 20, color: COLORS.textMuted },
  starTextActive: { color: COLORS.black },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 16 },
  unblockBtn: {
    borderWidth: 1, borderColor: COLORS.borderAccent,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(200,128,10,0.08)',
    minWidth: 90, alignItems: 'center',
  },
  unblockText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  editProfileEmoji: { fontSize: 26, marginRight: 14 },
  editProfileText: { flex: 1 },
  editProfileLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  editProfileDesc: { fontSize: 12, color: COLORS.textMuted },
  editProfileChevron: { fontSize: 22, color: COLORS.primary, marginLeft: 4 },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 24,
  },
  saveBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 16 },
});

export default ProfileSettingsScreen;
