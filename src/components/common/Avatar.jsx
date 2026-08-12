import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

// Shared avatar: shows the member's profile photo when they have one,
// otherwise falls back to a colored circle with their initial.
const Avatar = ({ uri, name, size = 44, backgroundColor = COLORS.primary, textColor = COLORS.white, style }) => {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, shape, style]} />;
  }

  return (
    <View style={[styles.circle, shape, { backgroundColor }, style]}>
      <Text style={[styles.text, { color: textColor, fontSize: size * 0.36 }]}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: { backgroundColor: COLORS.surfaceAlt },
  circle: { justifyContent: 'center', alignItems: 'center' },
  text: { fontWeight: '700' },
});

export default Avatar;
