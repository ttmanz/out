import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Image, ActivityIndicator, Alert, StatusBar, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { getProfile, updateFullProfile } from '../../lib/profile';
import { uploadAvatar } from '../../lib/storage';
import { useUser } from '../../contexts/UserContext';
import { resizeForUpload } from '../../lib/imageResize';
import { PARTICIPATION_OPTIONS, rewardOptions } from '../../lib/cashback';
import { useCashBackEnabled } from '../../hooks/useCashBackEnabled';
import i18n from '../../lib/i18n';
import { useTranslation } from 'react-i18next';
// Module-level translate helper so every helper component in this file can use t().
const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

const GENDERS = ['Male', 'Female', 'Non-binary', t('rw.profile.prefer_not_to_say', 'Prefer not to say')];
const ACCOUNT_TYPES = [
  { key: 'member', label: t('rw.profile.member', 'Member') },
  { key: 'venue_owner', label: t('rw.profile.venue_owner', 'Venue Owner') },
];
const INTERESTS = [
  '🍸 Cocktail Bars', '🎵 Live Music', '💃 Dancing', '🍔 Food & Drinks',
  '🎮 Gaming', '🎭 Events', '🏖️ Outdoor', '🎨 Arts & Culture', '✏️ Other',
];
const OTHER_KEY = '✏️ Other';

const formatDob = (text) => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
};

// Stored as ISO (YYYY-MM-DD); displayed and edited as DD/MM/YYYY
const isoToDisplayDob = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '');
};

const displayToISODob = (display) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : display.trim();
};

const ALL_REWARDS = PARTICIPATION_OPTIONS.map((o) => o.key);

const CompleteProfileScreen = ({ navigation }) => {
  useTranslation();
  const { refreshProfile } = useUser();
  const statusBarHeight = StatusBar.currentHeight ?? 44;

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [photoUri, setPhotoUri] = useState(null);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [otherInterests, setOtherInterests] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [accountType, setAccountType] = useState('member');
  // profiles.account_type defaults to 'member' in the database, so the
  // loaded value is never actually empty — this tracks whether the person
  // has deliberately picked one, so first-time setup can require a real
  // choice without retroactively blocking anyone who completed their
  // profile before this field existed.
  const [participation, setParticipation] = useState([]);
  const cashEnabled = useCashBackEnabled();
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);
  const [accountTypeTouched, setAccountTypeTouched] = useState(false);

  useEffect(() => {
    getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      const { data } = await getProfile(session.user.id);
      if (data) {
        setPhotoUri(data.photo_url ?? null);
        setParticipation(data.participation ?? []);
        setWasAlreadyCompleted(data.profile_completed === true);
        setDob(isoToDisplayDob(data.dob));
        setGender(data.gender ?? '');
        setCity(data.city ?? '');
        setBio(data.bio ?? '');
        const saved = data.interests ?? [];
        const presetKeys = new Set(INTERESTS);
        const custom = saved.filter((i) => !presetKeys.has(i));
        const preset = saved.filter((i) => presetKeys.has(i));
        if (custom.length) {
          setSelectedInterests([...preset, OTHER_KEY]);
          setOtherInterests(custom.join(', '));
        } else {
          setSelectedInterests(preset);
        }
        setPhone(data.phone ?? '');
        setInstagram(data.instagram ?? '');
        setAccountType(data.account_type ?? 'member');
        setAccountTypeTouched(data.profile_completed === true);
      }
      setLoading(false);
    });
  }, []);

  const pickPhoto = async () => {
    // iOS's picker (PHPicker) runs out-of-process and needs no photo-library
    // permission — requesting it manually shows a redundant native dialog
    // that blocks the picker from presenting afterward. Android still needs it.
    if (Platform.OS === 'android') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('rw.profile.permission_needed', 'Permission needed'), t('rw.profile.please_allow_access_to_your_', 'Please allow access to your photo library.'));
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = await resizeForUpload(result.assets[0].uri);
    setUploadingPhoto(true);
    const { url, error } = await uploadAvatar(userId, uri);
    setUploadingPhoto(false);
    if (error) { Alert.alert(t('rw.profile.upload_failed', 'Upload failed'), error.message); return; }
    setPhotoUri(url);
  };

  const toggleInterest = (item) => {
    setSelectedInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleReward = (key) =>
    setParticipation((prev) => ALL_REWARDS.filter((k) => (k === key ? !prev.includes(k) : prev.includes(k))));

  const handleSave = async () => {
    if (!dob.trim() || !gender || !city.trim() || !accountTypeTouched) {
      Alert.alert(t('rw.profile.required_fields', 'Required fields'), t('rw.profile.please_fill_in_account_type_', 'Please fill in account type, date of birth, gender and city.'));
      return;
    }
    setSaving(true);
    const { error } = await updateFullProfile(userId, {
      photo_url: photoUri,
      dob: displayToISODob(dob),
      gender,
      city: city.trim(),
      bio: bio.trim(),
      interests: [
        ...selectedInterests.filter((i) => i !== OTHER_KEY),
        ...(selectedInterests.includes(OTHER_KEY)
          ? otherInterests.split(',').map((s) => s.trim()).filter(Boolean)
          : []),
      ],
      phone: phone.trim(),
      instagram: instagram.trim().replace(/^@/, ''),
      account_type: accountType,
      participation: accountType === 'venue_owner' ? participation : null,
    });
    setSaving(false);
    if (error) { Alert.alert(t('rw.profile.error', 'Error'), error.message); return; }
    await refreshProfile();
    if (!wasAlreadyCompleted) {
      Alert.alert(t('rw.profile.profile_complete', 'Profile complete! 🎉'), t('rw.profile.you_ve_earned_20_points_for_', 'You\'ve earned +20 points for finishing your profile.'));
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={[styles.scroll, { paddingTop: statusBarHeight + 16 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rw.profile.complete_profile', 'Complete Profile')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Photo */}
      <View style={styles.photoSection}>
        <TouchableOpacity style={styles.photoWrap} onPress={pickPhoto} disabled={uploadingPhoto}>
          {uploadingPhoto ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>📷</Text>
              <Text style={styles.photoPlaceholderLabel}>{t('rw.profile.add_photo', 'Add Photo')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Field label={t('rw.profile.account_type', 'Account Type')} required>
          <View style={styles.chipRow}>
            {ACCOUNT_TYPES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, accountType === key && accountTypeTouched && styles.chipActive]}
                onPress={() => { setAccountType(key); setAccountTypeTouched(true); }}
              >
                <Text style={[styles.chipText, accountType === key && accountTypeTouched && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {accountType === 'venue_owner' && (
          <Field label="Rewards you'll offer" hint={t('rw.profile.you_set_the_percentages_late', 'you set the percentages later under {{where}}', { where: cashEnabled ? t('rw.profile.cash_back_credit', 'Cash Back & Credit') : t('rw.profile.rewards', 'Rewards') })}>
            <View style={styles.chipRow}>
              {rewardOptions(cashEnabled).map((o) => {
                const active = participation.includes(o.key);
                return (
                  <TouchableOpacity
                    key={o.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleReward(o.key)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.emoji} {o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>
        )}

        <Field label={t('rw.profile.date_of_birth', 'Date of Birth')} hint={t('rw.profile.dd_mm_yyyy', 'DD/MM/YYYY')}>
          <TextInput
            style={styles.input}
            value={dob}
            onChangeText={(text) => setDob(formatDob(text))}
            placeholder={t('rw.profile.dd_mm_yyyy', 'DD/MM/YYYY')}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
          />
        </Field>

        <Field label={t('rw.profile.gender', 'Gender')} required>
          <View style={styles.chipRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, gender === g && styles.chipActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label={t('rw.profile.city', 'City')} required>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder={t('rw.profile.your_city', 'Your city')}
            placeholderTextColor={COLORS.textMuted}
          />
        </Field>

        <Field label={t('rw.profile.about_me', 'About Me')}>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={bio}
            onChangeText={setBio}
            placeholder={t('rw.profile.a_short_bio', 'A short bio...')}
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </Field>

        <Field label={t('rw.profile.interests', 'Interests')}>
          <View style={styles.chipRow}>
            {INTERESTS.map((item) => {
              const active = selectedInterests.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleInterest(item)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedInterests.includes(OTHER_KEY) && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={otherInterests}
              onChangeText={setOtherInterests}
              placeholder={t('rw.profile.type_your_interests_separate', 'Type your interests, separated by commas')}
              placeholderTextColor={COLORS.textMuted}
            />
          )}
        </Field>

        <Field label={t('rw.profile.phone', 'Phone')}>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+357..."
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
          />
        </Field>

        <Field label={t('rw.profile.instagram', 'Instagram')}>
          <TextInput
            style={styles.input}
            value={instagram}
            onChangeText={setInstagram}
            placeholder={t('rw.profile.username', '@username')}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
        </Field>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color={COLORS.black} />
          : <Text style={styles.saveBtnText}>{t('rw.profile.save_profile', 'Save Profile')}</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const Field = ({ label, hint, required, children }) => (
  <View style={styles.field}>
    <Text style={styles.label}>
      {label}{required && <Text style={styles.required}> *</Text>}
      {hint && <Text style={styles.hint}>  {hint}</Text>}
    </Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },

  photoSection: { alignItems: 'center', paddingVertical: 24 },
  photoWrap: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderColor: COLORS.borderAccent,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center' },
  photoPlaceholderText: { fontSize: 32 },
  photoPlaceholderLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  form: { paddingHorizontal: 24 },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  required: { color: COLORS.primary },
  hint: { fontSize: 11, color: COLORS.textMuted, textTransform: 'none', fontWeight: '400' },
  input: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.text, backgroundColor: COLORS.surface,
  },
  multiline: { height: 90, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.surface,
  },
  chipActive: { borderColor: COLORS.borderAccent, backgroundColor: 'rgba(41,93,255,0.12)' },
  chipText: { fontSize: 13, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },

  saveBtn: {
    marginHorizontal: 24, marginTop: 8,
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 16 },
});

export default CompleteProfileScreen;
