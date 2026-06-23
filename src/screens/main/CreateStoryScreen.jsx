import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import AuthInput from '../../components/auth/AuthInput';
import PhotoPicker from '../../components/common/PhotoPicker';
import { createStory } from '../../lib/stories';
import { uploadStoryMedia } from '../../lib/storage';
import { getSession } from '../../lib/auth';
import { useUser } from '../../contexts/UserContext';

const CreateStoryScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { hasAccess } = useUser();
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const [text, setText] = useState('');
  const [mediaUri, setMediaUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!hasAccess) { Alert.alert(t('subscription.requiredTitle'), t('subscription.requiredBody')); return; }
    if (!text.trim() && !mediaUri) {
      Alert.alert(t('common.error'), t('stories.errors.contentRequired'));
      return;
    }
    setLoading(true);
    const { data: { session } } = await getSession();
    if (!session) { setLoading(false); return; }

    let photo_url = null;
    let video_url = null;
    if (mediaUri) {
      const { url, isVideo, error } = await uploadStoryMedia(session.user.id, mediaUri);
      if (error) {
        Alert.alert(t('common.error'), t('stories.errors.mediaFailed'));
        setLoading(false);
        return;
      }
      if (isVideo) video_url = url;
      else photo_url = url;
    }

    const { error } = await createStory(session.user.id, {
      text: text.trim() || null,
      photo_url,
      video_url,
    });
    setLoading(false);
    if (error) Alert.alert(t('common.error'), t('stories.errors.postFailed'));
    else navigation.goBack();
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('stories.createPost')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <AuthInput
            label={t('stories.labelText')}
            placeholder={t('stories.placeholderText')}
            value={text}
            onChangeText={setText}
            multiline
            autoCapitalize="sentences"
          />
          <PhotoPicker uri={mediaUri} onChange={setMediaUri} allowVideo />
          <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.black} />
              : <Text style={styles.postBtnText}>{t('stories.submitPost')}</Text>
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

export default CreateStoryScreen;
