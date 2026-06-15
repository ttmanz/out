import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import AuthInput from '../../components/auth/AuthInput';
import { createOpenChatPost } from '../../lib/openChat';
import { getSession } from '../../lib/auth';

const ACCENT = '#8e8e8d';

const CreateOpenChatScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [venue, setVenue] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageError, setMessageError] = useState('');

  const handlePost = async () => {
    if (!message.trim()) {
      setMessageError(t('openChat.errors.messageRequired'));
      return;
    }
    setMessageError('');
    setLoading(true);

    const { data: { session } } = await getSession();
    if (!session) { setLoading(false); return; }

    const { error } = await createOpenChatPost(session.user.id, {
      message: message.trim(),
      venue: venue.trim(),
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), t('openChat.errors.postFailed'));
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
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

          <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.postBtnText}>{t('openChat.submitPost')}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  form: { padding: 20, paddingBottom: 40 },
  postBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  postBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});

export default CreateOpenChatScreen;
