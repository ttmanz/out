import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, TextInput, StatusBar,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { getFriends } from '../../lib/friends';
import { createNightOut, addNightOutMembers } from '../../lib/nightOut';
import { uploadPostPhoto } from '../../lib/storage';
import PhotoPicker from '../../components/common/PhotoPicker';

const Avatar = ({ name, size = 36 }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
  </View>
);

const CreateNightOutScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const [userId, setUserId] = useState(null);
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [when, setWhen] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      const { data, error } = await getFriends(session.user.id);
      if (!error) setFriends(data ?? []);
    });
  }, []);

  const friendProfile = (item) =>
    item.requester_id === userId ? item.addressee : item.requester;
  const friendId = (item) =>
    item.requester_id === userId ? item.addressee_id : item.requester_id;

  const toggleFriend = (fid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid); else next.add(fid);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('nightOut.titleRequired'));
      return;
    }
    setSaving(true);

    let photo_url = null;
    if (photoUri) {
      const { url, error } = await uploadPostPhoto(userId, photoUri);
      if (error) {
        Alert.alert(t('common.error'), 'Photo upload failed. Create without photo?');
        setSaving(false);
        return;
      }
      photo_url = url;
    }

    const { data, error } = await createNightOut(userId, {
      title: title.trim(),
      venue: venue.trim(),
      planned_at: when.trim(),
      description: description.trim(),
      photo_url,
    });
    if (error || !data) {
      Alert.alert(t('common.error'), t('nightOut.createFailed'));
      setSaving(false);
      return;
    }
    if (selectedIds.size > 0) {
      await addNightOutMembers(data.id, [...selectedIds]);
    }
    setSaving(false);
    navigation.goBack();
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nightOut.create')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('nightOut.labelTitle')} *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('nightOut.placeholderTitle')}
          placeholderTextColor={COLORS.textMuted}
          maxLength={100}
        />

        <Text style={styles.label}>{t('nightOut.labelVenue')}</Text>
        <TextInput
          style={styles.input}
          value={venue}
          onChangeText={setVenue}
          placeholder={t('nightOut.placeholderVenue')}
          placeholderTextColor={COLORS.textMuted}
          maxLength={100}
        />

        <Text style={styles.label}>{t('nightOut.labelWhen')}</Text>
        <TextInput
          style={styles.input}
          value={when}
          onChangeText={setWhen}
          placeholder={t('nightOut.placeholderWhen')}
          placeholderTextColor={COLORS.textMuted}
          maxLength={80}
        />

        <Text style={styles.label}>{t('nightOut.labelDescription')}</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('nightOut.placeholderDescription')}
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={300}
        />

        <Text style={styles.label}>Photo</Text>
        <PhotoPicker uri={photoUri} onChange={setPhotoUri} />

        {friends.length > 0 && (
          <>
            <Text style={styles.label}>{t('nightOut.inviteFriends')}</Text>
            {friends.map((item) => {
              const profile = friendProfile(item);
              const fid = friendId(item);
              const selected = selectedIds.has(fid);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.friendRow, selected && styles.friendRowSelected]}
                  onPress={() => toggleFriend(fid)}
                  activeOpacity={0.7}
                >
                  <Avatar name={profile?.full_name} />
                  <Text style={styles.friendName}>{profile?.full_name}</Text>
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
          {saving
            ? <ActivityIndicator color={COLORS.black} />
            : <Text style={styles.submitText}>{t('nightOut.submitCreate')}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  scroll: { padding: 20, paddingBottom: 48 },
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 16,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.text, backgroundColor: COLORS.surface, marginBottom: 4,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  friendRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  friendRowSelected: { borderColor: COLORS.borderAccent, backgroundColor: 'rgba(200,128,10,0.08)' },
  avatar: { backgroundColor: COLORS.primaryDark, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: COLORS.white, fontWeight: '700' },
  friendName: { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.text },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.black, fontSize: 14, fontWeight: '700' },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 28,
  },
  submitText: { color: COLORS.black, fontWeight: '800', fontSize: 16 },
});

export default CreateNightOutScreen;
