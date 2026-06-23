import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import AuthInput from '../../components/auth/AuthInput';
import PhotoPicker from '../../components/common/PhotoPicker';
import LinkInput from '../../components/common/LinkInput';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import { createSpurPost } from '../../lib/spur';
import { getSession } from '../../lib/auth';
import { uploadPostPhoto } from '../../lib/storage';
import { useUser } from '../../contexts/UserContext';

const CreateSpurScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { hasAccess } = useUser();
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const [venue, setVenue] = useState('');
  const [activity, setActivity] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [linkPreview, setLinkPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [venueError, setVenueError] = useState('');
  const [activityError, setActivityError] = useState('');

  const handlePost = async () => {
    if (!hasAccess) { Alert.alert(t('subscription.requiredTitle'), t('subscription.requiredBody')); return; }
    let valid = true;
    if (!venue.trim()) { setVenueError(t('spur.errors.venueRequired')); valid = false; }
    else setVenueError('');
    if (!activity.trim()) { setActivityError(t('spur.errors.activityRequired')); valid = false; }
    else setActivityError('');
    if (!valid) return;

    setLoading(true);
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

    const { error } = await createSpurPost(session.user.id, {
      venue: venue.trim(),
      activity: activity.trim(),
      photo_url,
      link_url: linkPreview?.url ?? null,
      link_title: linkPreview?.title ?? null,
      link_image: linkPreview?.image ?? null,
      link_domain: linkPreview?.domain ?? null,
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), t('spur.errors.postFailed'));
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
          <Text style={styles.headerTitle}>{t('spur.post')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <AdBanner page="CreateSpur" />
          <ProfileBanner navigation={navigation} />

          <Text style={styles.preview}>
            {t('spur.goingTo')} {venue.trim() || '___'} {t('spur.forWhat')} {activity.trim() || '___'}, {t('spur.joinMe')}
          </Text>

          <AuthInput
            label={t('spur.labelVenue')}
            placeholder={t('spur.placeholderVenue')}
            value={venue}
            onChangeText={setVenue}
            error={venueError}
            autoCapitalize="words"
          />
          <AuthInput
            label={t('spur.labelActivity')}
            placeholder={t('spur.placeholderActivity')}
            value={activity}
            onChangeText={setActivity}
            error={activityError}
            autoCapitalize="sentences"
          />

          <PhotoPicker uri={photoUri} onChange={setPhotoUri} />
          <LinkInput preview={linkPreview} onPreviewChange={setLinkPreview} />

          <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.text} />
              : <Text style={styles.postBtnText}>{t('spur.submitPost')}</Text>
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
  preview: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    backgroundColor: 'rgba(200,128,10,0.08)',
    borderRadius: 12, padding: 16, marginBottom: 24, lineHeight: 24,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  postBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  postBtnText: { color: COLORS.black, fontWeight: '700', fontSize: 16 },
});

export default CreateSpurScreen;
