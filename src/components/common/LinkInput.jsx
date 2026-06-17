import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { fetchLinkPreview } from '../../lib/linkPreview';
import LinkPreviewCard from './LinkPreviewCard';

// preview = { url, title, image, domain, description } | null
const LinkInput = ({ preview, onPreviewChange }) => {
  const [url, setUrl] = useState(preview?.url ?? '');
  const [fetching, setFetching] = useState(false);

  const handlePreview = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setFetching(true);
    const result = await fetchLinkPreview(trimmed);
    setFetching(false);
    if (result) {
      onPreviewChange({ url: trimmed, ...result });
    } else {
      Alert.alert('No preview', 'Could not load a preview for that link. Check the URL and try again.');
    }
  };

  const handleRemove = () => {
    setUrl('');
    onPreviewChange(null);
  };

  if (preview) {
    return (
      <View style={styles.wrap}>
        <LinkPreviewCard {...preview} />
        <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
          <Text style={styles.removeBtnText}>✕ Remove link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="Paste a link (YouTube, Spotify…)"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          onSubmitEditing={handlePreview}
        />
        {!!url.trim() && (
          <TouchableOpacity
            style={[styles.previewBtn, fetching && styles.previewBtnBusy]}
            onPress={handlePreview}
            disabled={fetching}
          >
            {fetching
              ? <ActivityIndicator size="small" color={COLORS.black} />
              : <Text style={styles.previewBtnText}>Preview</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.text, backgroundColor: COLORS.surface,
  },
  previewBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, minWidth: 72, alignItems: 'center',
  },
  previewBtnBusy: { opacity: 0.7 },
  previewBtnText: { color: COLORS.black, fontWeight: '700', fontSize: 13 },
  removeBtn: { marginTop: 6, alignSelf: 'flex-start' },
  removeBtnText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
});

export default LinkInput;
