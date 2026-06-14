import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { CONFIG } from '../../constants/config';

const LANGUAGE_LABELS = { en: 'EN', el: 'EL', ru: 'RU' };

const LanguagePicker = () => {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <View style={styles.wrapper}>
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
  wrapper: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  labelActive: { color: COLORS.white },
});

export default LanguagePicker;
