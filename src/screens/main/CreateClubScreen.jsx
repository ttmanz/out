import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { createClub } from '../../lib/clubs';
import { uploadPostPhoto } from '../../lib/storage';
import PhotoPicker from '../../components/common/PhotoPicker';

const CreateClubScreen = ({ navigation }) => {
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a club name.');
      return;
    }
    setSaving(true);

    const { data: { session } } = await getSession();
    if (!session) { setSaving(false); return; }

    let photo_url = null;
    if (photoUri) {
      const { url, error } = await uploadPostPhoto(session.user.id, photoUri);
      if (error) {
        Alert.alert('Error', 'Photo upload failed. Create without photo?');
        setSaving(false);
        return;
      }
      photo_url = url;
    }

    const { data, error } = await createClub(session.user.id, {
      name: name.trim(),
      description: description.trim(),
      photo_url,
    });

    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Could not create club. Please try again.');
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
          <Text style={styles.headerTitle}>Start a Club</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Club Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Friday Night Runners"
            placeholderTextColor={COLORS.textMuted}
            maxLength={80}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this club about?"
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={300}
            autoCapitalize="sentences"
          />

          <Text style={styles.label}>Club Photo</Text>
          <PhotoPicker uri={photoUri} onChange={setPhotoUri} />

          <View style={styles.adminNote}>
            <Text style={styles.adminNoteText}>
              ✦  You will be the administrator of this club and can approve or reject member requests.
            </Text>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
            {saving
              ? <ActivityIndicator color={COLORS.black} />
              : <Text style={styles.submitText}>Create Club</Text>
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
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 16,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.text, backgroundColor: COLORS.surface,
  },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  adminNote: {
    backgroundColor: 'rgba(200,128,10,0.08)',
    borderRadius: 12, padding: 14, marginTop: 8,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  adminNoteText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 24,
  },
  submitText: { color: COLORS.black, fontWeight: '800', fontSize: 16 },
});

export default CreateClubScreen;
