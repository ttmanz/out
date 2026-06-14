import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const Divider = ({ label }) => (
  <View style={styles.wrapper}>
    <View style={styles.line} />
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <View style={styles.line} />
  </View>
);

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
  label: { marginHorizontal: 12, color: COLORS.textMuted, fontSize: 13 },
});

export default Divider;
