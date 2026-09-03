import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { ROUTES } from '../../constants/routes';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';
import GradientBorder from '../../components/common/GradientBorder';
import { GradientIconCircle } from '../../components/common/GradientIcon';

const CATEGORIES = [
  { key: 'myStory',     icon: 'camera',    screen: ROUTES.STORY_FEED },
  { key: 'today',       icon: 'today' },
  { key: 'tomorrow',    icon: 'sunny' },
  { key: 'thisWeekend', icon: 'sparkles' },
  { key: 'nearby',      icon: 'flash',     screen: ROUTES.ACTIVITIES },
];

const CategoryCard = ({ icon, title, onPress }) => (
  <GradientBorder radius={16} style={styles.cardOuter}>
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <GradientIconCircle name={icon} size={46} iconSize={22} style={styles.icon} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  </GradientBorder>
);

const WhatHappeningScreen = ({ navigation }) => {
  useFeatureGate('whats_happening');
  const { t } = useTranslation();

  return (
    <View style={styles.safe}>
      <BackHeader title={t('happenings.title')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <AdBanner page="WhatHappening" />
        <ProfileBanner navigation={navigation} />
        {CATEGORIES.map(({ key, icon, screen }) => (
          <CategoryCard
            key={key}
            icon={icon}
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
  cardOuter: { marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  icon: { marginRight: 14 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  chevron: { fontSize: 22, color: COLORS.primary, marginLeft: 4 },
});

export default WhatHappeningScreen;
