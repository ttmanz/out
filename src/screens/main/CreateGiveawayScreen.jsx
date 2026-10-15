import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Platform, Alert, ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import { createGiveaway } from '../../lib/giveaways';
import { getSession } from '../../lib/auth';
import { uploadPostMedia } from '../../lib/storage';
import { useUser } from '../../contexts/UserContext';
import PhotoPicker from '../../components/common/PhotoPicker';
import BackHeader from '../../components/common/BackHeader';
import i18n from '../../lib/i18n';
import { useTranslation } from 'react-i18next';
// Module-level translate helper so every helper component in this file can use t().
const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

const formatDate = (date) =>
  date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Used by approved venues (from their profile page) and by admins (from the Give Away tab).
const CreateGiveawayScreen = ({ navigation }) => {
  useTranslation();
  const { profile } = useUser();
  const [title, setTitle] = useState('');
  const [venueName, setVenueName] = useState(profile?.account_type === 'venue_owner' ? (profile?.full_name ?? '') : '');
  const [description, setDescription] = useState('');
  const [endsAt, setEndsAt] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [mediaUri, setMediaUri] = useState(null);
  const [saving, setSaving] = useState(false);

  // Android shows date and time as two separate dialogs
  const onPickerChange = (event, selected) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') return;
      setEndsAt(selected ?? endsAt ?? new Date());
      if (pickerMode === 'date') { setPickerMode('time'); setShowPicker(true); } else setPickerMode('date');
    } else {
      setEndsAt(selected ?? endsAt);
    }
  };

  const handlePost = async () => {
    if (!title.trim()) { Alert.alert(t('rw.giveawaycreate.error', 'Error'), t('rw.giveawaycreate.say_what_you_are_giving_away', 'Say what you are giving away.')); return; }
    if (!endsAt || endsAt <= new Date()) { Alert.alert(t('rw.giveawaycreate.error', 'Error'), t('rw.giveawaycreate.choose_an_end_date_and_time_', 'Choose an end date and time in the future.')); return; }
    if (endsAt > new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) { Alert.alert(t('rw.giveawaycreate.error', 'Error'), t('rw.giveawaycreate.a_giveaway_can_run_for_90_da', 'A giveaway can run for 90 days at most.')); return; }
    setSaving(true);
    const { data: { session } } = await getSession();
    if (!session) { setSaving(false); return; }

    let photo_url = null;
    let video_url = null;
    if (mediaUri) {
      const { url, isVideo, error } = await uploadPostMedia(session.user.id, mediaUri);
      if (error) { Alert.alert(t('rw.giveawaycreate.error', 'Error'), t('rw.giveawaycreate.could_not_upload_the_photo_p', 'Could not upload the photo. Please try again.')); setSaving(false); return; }
      if (isVideo) video_url = url; else photo_url = url;
    }

    const { error } = await createGiveaway({
      userId: session.user.id,
      venueName: venueName.trim() || null,
      title: title.trim(),
      description: description.trim() || null,
      photo_url,
      video_url,
      endsAt: endsAt.toISOString(),
    });
    setSaving(false);
    if (error) {
      Alert.alert(t('rw.giveawaycreate.error', 'Error'), t('rw.giveawaycreate.could_not_post_the_giveaway_', 'Could not post the giveaway. Only approved venues and admins can post.'));
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.safe} behavior="padding">
      <BackHeader title={t('rw.giveawaycreate.post_a_giveaway', 'Post a giveaway')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('rw.giveawaycreate.what_are_you_giving_away', 'What are you giving away? *')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={100}
          placeholder={t('rw.giveawaycreate.e_g_free_drink_for_the_first', 'e.g. Free drink for the first 20 guests')} placeholderTextColor={COLORS.textMuted} />

        <Text style={styles.label}>{t('rw.giveawaycreate.venue_who_is_giving', 'Venue / who is giving')}</Text>
        <TextInput style={styles.input} value={venueName} onChangeText={setVenueName} maxLength={100}
          placeholder={t('rw.giveawaycreate.venue_or_business_name', 'Venue or business name')} placeholderTextColor={COLORS.textMuted} />

        <Text style={styles.label}>{t('rw.giveawaycreate.ends', 'Ends *')}</Text>
        <TouchableOpacity style={[styles.input, styles.dateBtn]} activeOpacity={0.7}
          onPress={() => { setPickerMode('date'); setShowPicker(true); }}>
          <Text style={endsAt ? styles.dateText : styles.datePlaceholder}>{endsAt ? formatDate(endsAt) : t('rw.giveawaycreate.tap_to_set_the_end_date_and_', 'Tap to set the end date and time')}</Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={endsAt ?? new Date()}
            mode={Platform.OS === 'ios' ? 'datetime' : pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={onPickerChange}
          />
        )}
        {Platform.OS === 'ios' && showPicker && (
          <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPicker(false)}>
            <Text style={styles.doneBtnText}>{t('rw.giveawaycreate.done', 'Done')}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>{t('rw.giveawaycreate.details', 'Details')}</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={description} onChangeText={setDescription}
          multiline maxLength={500} placeholder={t('rw.giveawaycreate.how_to_get_it_where_any_cond', 'How to get it, where, any conditions…')} placeholderTextColor={COLORS.textMuted} />

        <Text style={styles.label}>{t('rw.giveawaycreate.photo_or_video', 'Photo or video')}</Text>
        <PhotoPicker uri={mediaUri} onChange={setMediaUri} allowVideo />

        <TouchableOpacity style={styles.submitBtn} onPress={handlePost} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.submitText}>{t('rw.giveawaycreate.post_giveaway', 'Post giveaway')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface, marginBottom: 4 },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 15, color: COLORS.text, flex: 1 },
  datePlaceholder: { fontSize: 15, color: COLORS.textMuted, flex: 1 },
  dateIcon: { fontSize: 18 },
  doneBtn: { alignSelf: 'flex-end', marginTop: 6, marginBottom: 4, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: 8 },
  doneBtnText: { color: COLORS.black, fontWeight: '700', fontSize: 13 },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  submitText: { color: COLORS.black, fontWeight: '800', fontSize: 16 },
});

export default CreateGiveawayScreen;
