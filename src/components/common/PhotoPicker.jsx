import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';

const PhotoPicker = ({ uri, onChange }) => {
  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      onChange(result.assets[0].uri);
    }
  };

  if (uri) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
        <TouchableOpacity style={styles.removeBtn} onPress={() => onChange(null)}>
          <Text style={styles.removeBtnText}>✕ Remove photo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.addBtn} onPress={pick}>
      <Text style={styles.addBtnIcon}>📷</Text>
      <Text style={styles.addBtnText}>Add photo</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: COLORS.borderAccent,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(200,128,10,0.04)',
  },
  addBtnIcon: { fontSize: 22 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  previewWrap: { marginBottom: 16 },
  preview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 8 },
  removeBtn: { alignSelf: 'flex-start' },
  removeBtnText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
});

export default PhotoPicker;
