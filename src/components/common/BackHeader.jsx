import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { COLORS } from '../../constants/colors';

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// Shared screen header: back chevron + centered title + optional right action.
// Replaces the header/back/backText/headerTitle block duplicated across screens.
const BackHeader = ({ title, onBack, right = null }) => {
  const statusBarHeight = StatusBar.currentHeight ?? 44;
  return (
    <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.side} hitSlop={HIT_SLOP}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.side} />
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.sideRight}>{right}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  side: { width: 40, alignItems: 'flex-start' },
  sideRight: { minWidth: 40, alignItems: 'flex-end' },
  backText: { fontSize: 30, color: COLORS.primary, lineHeight: 34 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
});

export default BackHeader;
