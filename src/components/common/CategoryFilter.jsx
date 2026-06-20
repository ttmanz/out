import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { VENUE_CATEGORIES } from '../../lib/venues';

const CategoryFilter = ({ selected, onSelect }) => {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {VENUE_CATEGORIES.map((cat) => {
        const active = cat.id === selected;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {cat.emoji} {t(cat.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  labelActive: { color: COLORS.background },
});

export default CategoryFilter;
