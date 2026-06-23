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
import { createOpenChatPost } from '../../lib/openChat';
import { getSession } from '../../lib/auth';
import { moderateContent } from '../../lib/moderation';
import { uploadPostPhoto } from '../../lib/storage';
import { useUser } from '../../contexts/UserContext';

const CreateOpenChatScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { hasAccess } = useUser();
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const [message, setMessage] = useState('');
  const [venue, setVenue] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [linkPreview, setLinkPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messageError, setMessageError] = useState('');

  const handlePost = async () => {
    if (!hasAccess) { Alert.alert(t('subscription.requiredTitle'), t('subscription.requiredBody')); return; }
    if (!message.trim()) {
      setMessageError(t('openChat.errors.messageRequired'));
      return;
    }
    setMessageError('');
    setLoading(true);

    const [{ flagged, reason }, { data: { session } }] = await Promise.all([
      moderateContent(message.trim()),
      getSession(),
    ]);
    if (flagged) {
      setLoading(false);
      Alert.alert('Post not allowed', `Your message was flagged for: ${reason}.\nPlease revise it before posting.`);
      return;
    }
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

    const { error } = await createOpenChatPost(session.user.id, {
      message: message.trim(),
      venue: venue.trim(),
      photo_url,
      link_url: linkPreview?.url ?? null,
      link_title: linkPreview?.title ?? null,
      link_image: linkPreview?.image ?? null,
      link_domain: linkPreview?.domain ?? null,
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), t('openChat.errors.postFailed'));
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
          <Text style={styles.headerTitle}>{t('openChat.post')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <AuthInput
            label={t('openChat.labelMessage')}
            placeholder={t('openChat.placeholderMessage')}
            value={message}
            onChangeText={setMessage}
            error={messageError}
            multiline
            autoCapitalize="sentences"
          />
          <AuthInput
            label={t('openChat.labelVenue')}
            placeholder={t('openChat.placeholderVenue')}
            value={venue}
            onChangeText={setVenue}
            autoCapitalize="words"
          />
          <PhotoPicker uri={photoUri} onChange={setPhotoUri} />
          <LinkInput preview={linkPreview} onPreviewChange={setLinkPreview} />

          <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.black} />
              : <Text style={styles.postBtnText}>{t('openChat.submitPost')}</Text>
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
  postBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  postBtnText: { color: COLORS.black, fontWeight: '700', fontSize: 16 },
});

export default CreateOpenChatScreen;
