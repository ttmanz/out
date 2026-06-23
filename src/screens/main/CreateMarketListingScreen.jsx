import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { createMarketListing } from '../../lib/market';
import { uploadPostPhoto } from '../../lib/storage';
import { useUser } from '../../contexts/UserContext';
import PhotoPicker from '../../components/common/PhotoPicker';

const CreateMarketListingScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { hasAccess } = useUser();
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const [userId, setUserId] = useState(null);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
  }, []);

  const handleCreate = async () => {
    if (!hasAccess) {
      Alert.alert(t('subscription.requiredTitle'), t('subscription.requiredBody'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('common.error'), t('market.descriptionRequired'));
      return;
    }
    setSaving(true);

    let photo_url = null;
    if (photoUri) {
      const { url, error } = await uploadPostPhoto(userId, photoUri);
      if (error) {
        Alert.alert(t('common.error'), t('market.photoFailed'));
        setSaving(false);
        return;
      }
      photo_url = url;
    }

    const { error } = await createMarketListing(userId, description.trim(), photo_url);
    setSaving(false);
    if (error) {
      Alert.alert(t('common.error'), t('market.createFailed'));
      return;
    }
    navigation.goBack();
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('market.createTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('market.labelPhoto')}</Text>
          <PhotoPicker uri={photoUri} onChange={setPhotoUri} />

          <Text style={styles.label}>{t('market.labelDescription')} *</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('market.placeholderDescription')}
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={800}
            autoCapitalize="sentences"
          />
          <Text style={styles.charCount}>{description.length}/800</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{t('market.paymentNote')}</Text>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
            {saving
              ? <ActivityIndicator color={COLORS.black} />
              : <Text style={styles.submitText}>{t('market.submit')}</Text>
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
  form: { padding: 20, paddingBottom: 48 },
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 20,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.text, backgroundColor: COLORS.surface,
  },
  inputMulti: { height: 160, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  infoBox: {
    marginTop: 20,
    backgroundColor: 'rgba(200,128,10,0.08)',
    borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  infoText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 24,
  },
  submitText: { color: COLORS.black, fontWeight: '800', fontSize: 16 },
});

export default CreateMarketListingScreen;
