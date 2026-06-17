import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { COLORS } from '../../constants/colors';

const LinkPreviewCard = ({ url, title, image, domain, description }) => {
  if (!url) return null;
  return (
    <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(url)} activeOpacity={0.8}>
      {!!image && <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />}
      <View style={styles.body}>
        <Text style={styles.domain}>{domain}</Text>
        {!!title && <Text style={styles.title} numberOfLines={2}>{title}</Text>}
        {!!description && <Text style={styles.desc} numberOfLines={1}>{description}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 12,
    overflow: 'hidden', marginTop: 10, backgroundColor: COLORS.surface,
  },
  image: { width: '100%', height: 160 },
  body: { padding: 10 },
  domain: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: 3 },
  title: { fontSize: 14, color: COLORS.text, fontWeight: '600', lineHeight: 18 },
  desc: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
});

export default LinkPreviewCard;
