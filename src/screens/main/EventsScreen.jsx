import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const EVENT_CATEGORIES = [
  { key: 'product_launch', emoji: '🚀' },
  { key: 'workshop',       emoji: '🛠️' },
  { key: 'conference',     emoji: '🎤' },
  { key: 'networking',     emoji: '🤝' },
  { key: 'other',          emoji: '📌' },
];

const CategoryCard = ({ emoji, title, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.cardEmoji}>{emoji}</Text>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const EventsScreen = ({ navigation }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.safe}>
      <BackHeader title={t('events.title')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <AdBanner page="Events" />
        <ProfileBanner navigation={navigation} />
        {EVENT_CATEGORIES.map(({ key, emoji }) => (
          <CategoryCard
            key={key}
            emoji={emoji}
            title={t(`events.${key}`)}
            onPress={() => navigation.navigate(ROUTES.EVENT_FEED, { category: key })}
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

export default EventsScreen;
