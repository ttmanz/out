import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import AuthInput from '../../components/auth/AuthInput';
import { createSpurPost } from '../../lib/spur';
import { getSession } from '../../lib/auth';
import AdBanner from '../../components/common/AdBanner';

const ACCENT = '#ffd700';

const CreateSpurScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [venue, setVenue] = useState('');
  const [activity, setActivity] = useState('');
  const [loading, setLoading] = useState(false);
  const [venueError, setVenueError] = useState('');
  const [activityError, setActivityError] = useState('');

  const handlePost = async () => {
    let valid = true;
    if (!venue.trim()) { setVenueError(t('spur.errors.venueRequired')); valid = false; }
    else setVenueError('');
    if (!activity.trim()) { setActivityError(t('spur.errors.activityRequired')); valid = false; }
    else setActivityError('');
    if (!valid) return;

    setLoading(true);
    const { data: { session } } = await getSession();
    if (!session) { setLoading(false); return; }

    const { error } = await createSpurPost(session.user.id, {
      venue: venue.trim(),
      activity: activity.trim(),
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), t('spur.errors.postFailed'));
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
          <Text style={styles.headerTitle}>{t('spur.post')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <AdBanner page="CreateSpur" />
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

          <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.text} />
              : <Text style={styles.postBtnText}>{t('spur.submitPost')}</Text>
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
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  form: { padding: 20, paddingBottom: 40 },
  preview: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    backgroundColor: '#fff9c4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    lineHeight: 24,
    borderLeftWidth: 4,
    borderLeftColor: ACCENT,
  },
  postBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  postBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
});

export default CreateSpurScreen;
