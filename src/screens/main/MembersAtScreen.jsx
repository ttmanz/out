import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getHappenings } from '../../lib/happenings';
import { formatAgo } from '../../utils/format';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const MembersAtScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const name = query.trim();
    if (!name) return;
    setLoading(true);
    const { data, error } = await getHappenings();
    if (!error) {
      const lower = name.toLowerCase();
      const matches = (data ?? []).filter(
        (h) => h.venue && h.venue.toLowerCase().includes(lower)
      );
      setResults(matches);
    }
    setSearched(true);
    setLoading(false);
  };

  const uniqueMembers = [...new Map(results.map((h) => [h.user_id, h])).values()];

  return (
    <View style={styles.safe}>
      <BackHeader title={t('venueHub.membersAt')} onBack={() => navigation.goBack()} />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={t('venueHub.searchPlaceholder')}
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading || !query.trim()}>
          {loading
            ? <ActivityIndicator size="small" color={COLORS.black} />
            : <Text style={styles.searchBtnText}>→</Text>
          }
        </TouchableOpacity>
      </View>

      {searched && (
        <View style={styles.countBanner}>
          <Text style={styles.countText}>
            👥 {uniqueMembers.length} {t('venueHub.membersRecent')}
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          searched && !loading
            ? <Text style={styles.empty}>{t('venueHub.noMembers')}</Text>
            : null
        }
        ListHeaderComponent={() => (
          <View>
            <AdBanner page="MembersAt" />
            <ProfileBanner navigation={navigation} />
            {results.length > 0 && <Text style={styles.sectionLabel}>{t('venueHub.recentPosts')}</Text>}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.memberName}>{item.profiles?.full_name ?? '—'}</Text>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardTime}>{formatAgo(item.created_at)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  input: {
    flex: 1, borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.text, backgroundColor: COLORS.surface,
  },
  searchBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  searchBtnText: { fontSize: 20, color: COLORS.black, fontWeight: '700' },
  countBanner: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  countText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4,
  },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  cardContent: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  cardTitle: { fontSize: 13, color: COLORS.text },
  cardTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});

export default MembersAtScreen;
