import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const CATEGORIES = [
  { key: 'myStory',     emoji: '📸', screen: ROUTES.STORY_FEED },
  { key: 'today',       emoji: '🗓️' },
  { key: 'tomorrow',    emoji: '☀️' },
  { key: 'thisWeekend', emoji: '🎊' },
  { key: 'nearby',      emoji: '🎭', screen: ROUTES.ACTIVITIES },
];

const CategoryCard = ({ emoji, title, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.cardEmoji}>{emoji}</Text>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const WhatHappeningScreen = ({ navigation }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.safe}>
      <BackHeader title={t('happenings.title')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <AdBanner page="WhatHappening" />
        <ProfileBanner navigation={navigation} />
        {CATEGORIES.map(({ key, emoji, screen }) => (
          <CategoryCard
            key={key}
            emoji={emoji}
            title={t(`happenings.${key}`).toUpperCase()}
            onPress={() => navigation.navigate(screen ?? ROUTES.HAPPENING_FEED, screen ? undefined : { filter: key })}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingTop: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    overflow: 'hidden',
  },
  cardEmoji: { fontSize: 24, marginRight: 14 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  chevron: { fontSize: 22, color: COLORS.primary, marginLeft: 4 },
});

export default WhatHappeningScreen;
