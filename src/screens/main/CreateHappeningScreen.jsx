import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import AuthInput from '../../components/auth/AuthInput';
import PhotoPicker from '../../components/common/PhotoPicker';
import LinkInput from '../../components/common/LinkInput';
import { createHappening } from '../../lib/happenings';
import { getSession } from '../../lib/auth';
import { uploadPostPhoto } from '../../lib/storage';

const WHEN_OPTIONS = [
  { key: 'today',       emoji: '🗓️' },
  { key: 'tomorrow',    emoji: '☀️' },
  { key: 'thisWeekend', emoji: '🎊' },
  { key: 'nearby',      emoji: '📍' },
];

const CreateHappeningScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [when, setWhen] = useState(null);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [linkPreview, setLinkPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [whenError, setWhenError] = useState('');

  const handlePost = async () => {
    let valid = true;
    if (!title.trim()) { setTitleError(t('happenings.errors.titleRequired')); valid = false; }
    else setTitleError('');
    if (!when) { setWhenError(t('happenings.errors.whenRequired')); valid = false; }
    else setWhenError('');
    if (!valid) return;

    setLoading(true);

    let latitude = null;
    let longitude = null;

    if (when === 'nearby') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('happenings.errors.locationDenied'));
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    }

    const { data: { session } } = await getSession();
    if (!session) { setLoading(false); return; }

    let photo_url = null;
    if (photoUri) {
      const { url, error } = await uploadPostPhoto(session.user.id, photoUri);
      if (error) {
        Alert.alert(t('common.error'), 'Photo upload failed. Post without photo?');
        setLoading(false);
        return;
      }
      photo_url = url;
    }

    const { error } = await createHappening(session.user.id, {
      title: title.trim(),
      venue: venue.trim() || null,
      happening_at: when,
      description: description.trim() || null,
      latitude,
      longitude,
      photo_url,
      link_url: linkPreview?.url ?? null,
      link_title: linkPreview?.title ?? null,
      link_image: linkPreview?.image ?? null,
      link_domain: linkPreview?.domain ?? null,
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), t('happenings.errors.postFailed'));
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('happenings.post')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <AuthInput
            label={t('happenings.labelTitle')}
            placeholder={t('happenings.placeholderTitle')}
            value={title}
            onChangeText={setTitle}
            error={titleError}
            autoCapitalize="sentences"
          />
          <AuthInput
            label={t('happenings.labelVenue')}
            placeholder={t('happenings.placeholderVenue')}
            value={venue}
            onChangeText={setVenue}
            autoCapitalize="words"
          />

          <Text style={styles.whenLabel}>{t('happenings.labelWhen')}</Text>
          <View style={styles.whenGrid}>
            {WHEN_OPTIONS.map(({ key, emoji }) => (
              <TouchableOpacity
                key={key}
                style={[styles.whenBtn, when === key && styles.whenBtnActive]}
                onPress={() => { setWhen(key); setWhenError(''); }}
              >
                <Text style={styles.whenEmoji}>{emoji}</Text>
                <Text style={[styles.whenText, when === key && styles.whenTextActive]}>
                  {t(`happenings.${key}`).toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!whenError && <Text style={styles.error}>{whenError}</Text>}
          {when === 'nearby' && (
            <Text style={styles.locationNote}>📍 {t('happenings.locationNote')}</Text>
          )}

          <AuthInput
            label={t('happenings.labelDescription')}
            placeholder={t('happenings.placeholderDescription')}
            value={description}
            onChangeText={setDescription}
            multiline
            autoCapitalize="sentences"
          />

          <PhotoPicker uri={photoUri} onChange={setPhotoUri} />
          <LinkInput preview={linkPreview} onPreviewChange={setLinkPreview} />

          <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.black} />
              : <Text style={styles.postBtnText}>{t('happenings.submitPost')}</Text>
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
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  form: { padding: 20, paddingBottom: 40 },
  whenLabel: { fontSize: 14, color: COLORS.text, fontWeight: '500', marginBottom: 10 },
  whenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  whenBtn: {
    flexDirection: 'row', alignItems: 'center',
    width: '47%', paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: COLORS.borderAccent, backgroundColor: COLORS.surface, gap: 8,
  },
  whenBtnActive: { backgroundColor: COLORS.primary },
  whenEmoji: { fontSize: 18 },
  whenText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.4 },
  whenTextActive: { color: COLORS.black },
  error: { fontSize: 12, color: COLORS.error, marginBottom: 8, marginTop: 2 },
  locationNote: { fontSize: 12, color: COLORS.textMuted, marginBottom: 16, marginTop: 4 },
  postBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  postBtnText: { color: COLORS.black, fontWeight: '700', fontSize: 16 },
});

export default CreateHappeningScreen;
