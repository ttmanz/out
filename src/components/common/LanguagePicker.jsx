import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { CONFIG } from '../../constants/config';

const LANGUAGE_LABELS = { en: 'EN', el: 'EL', ru: 'RU' };

const LanguagePicker = ({ style }) => {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <View style={[styles.wrapper, style]}>
      {CONFIG.supportedLanguages.map((lang) => (
        <TouchableOpacity
          key={lang}
          style={[styles.btn, current === lang && styles.btnActive]}
          onPress={() => i18n.changeLanguage(lang)}
        >
          <Text style={[styles.label, current === lang && styles.labelActive]}>
            {LANGUAGE_LABELS[lang]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  btnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },
  labelActive: { color: COLORS.black },
});

export default LanguagePicker;
