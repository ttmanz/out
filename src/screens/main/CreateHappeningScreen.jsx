import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import AuthInput from '../../components/auth/AuthInput';
import PhotoPicker from '../../components/common/PhotoPicker';
import LinkInput from '../../components/common/LinkInput';
import BackHeader from '../../components/common/BackHeader';
import { createHappening } from '../../lib/happenings';
import { getSession } from '../../lib/auth';
import { uploadPostPhoto } from '../../lib/storage';
import { useUser } from '../../contexts/UserContext';

const CreateHappeningScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { canAccessFeature } = useUser();
  const prefill = route.params?.prefill ?? {};
  const [title, setTitle] = useState(prefill.title ?? '');
  const [venue, setVenue] = useState(prefill.venue ?? '');
  const [when] = useState(prefill.when ?? 'today');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [linkPreview, setLinkPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState('');

  const handlePost = async () => {
    const access = canAccessFeature('whats_happening');
    if (!access.allowed) {
      Alert.alert(t('subscription.requiredTitle'), access.price ? t('subscription.requiredBodyPriced', { price: access.price }) : t('subscription.requiredBody'));
      return;
    }
    if (!title.trim()) { setTitleError(t('happenings.errors.titleRequired')); return; }
    setTitleError('');

    setLoading(true);

    const { data: { session } } = await getSession();
    if (!session) { setLoading(false); return; }

    let photo_url = null;
    if (photoUri) {
      const { url, error } = await uploadPostPhoto(session.user.id, photoUri);
      if (error) {
        Alert.alert(t('common.error'), t('common.photoUploadFailed'));
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <BackHeader title={t('happenings.post')} onBack={() => navigation.goBack()} />

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
  form: { padding: 20, paddingBottom: 40 },
  postBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  postBtnText: { color: COLORS.black, fontWeight: '700', fontSize: 16 },
});

export default CreateHappeningScreen;
