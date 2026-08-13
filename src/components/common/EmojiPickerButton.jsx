import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import EmojiPicker, { en, ru } from 'rn-emoji-keyboard';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

const EMOJI_THEME = {
  backdrop: 'rgba(0,0,0,0.6)',
  knob: COLORS.borderAccent,
  container: COLORS.surface,
  header: COLORS.textMuted,
  skinTonesContainer: COLORS.surfaceAlt,
  category: {
    icon: COLORS.textMuted,
    iconActive: COLORS.primary,
    container: COLORS.surface,
    containerActive: COLORS.surfaceAlt,
  },
  search: {
    background: COLORS.surfaceAlt,
    text: COLORS.text,
    placeholder: COLORS.textMuted,
    icon: COLORS.textMuted,
  },
  customButton: {
    icon: COLORS.text,
    iconPressed: COLORS.primary,
    background: COLORS.surfaceAlt,
    backgroundPressed: COLORS.surface,
  },
  emoji: {
    selected: COLORS.primary,
  },
};

// Appends the picked emoji to the caller's text state — every call site
// uses onEmojiSelected(emojiChar) the same way: setText(prev => prev + emojiChar).
const EmojiPickerButton = ({ onEmojiSelected, style }) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={[styles.btn, style]} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.btnEmoji}>😊</Text>
      </TouchableOpacity>
      <EmojiPicker
        open={open}
        onClose={() => setOpen(false)}
        onEmojiSelected={(e) => { onEmojiSelected(e.emoji); setOpen(false); }}
        theme={EMOJI_THEME}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        translation={i18n.language === 'ru' ? ru : en}
      />
    </>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  btnEmoji: { fontSize: 20 },
});

export default EmojiPickerButton;
