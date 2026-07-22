import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Linking, Alert, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';
import BackHeader from '../../components/common/BackHeader';

const VenueSearchScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const name = query.trim();
    if (!name) return;
    setLoading(true);
    const url = `https://www.google.com/maps/search/${encodeURIComponent(name)}`;
    const canOpen = await Linking.canOpenURL(url);
    setLoading(false);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert(t('common.error'), 'Unable to open Maps.');
    }
  };

  return (
    <View style={styles.safe}>
      <BackHeader title={t('venueHub.search')} onBack={() => navigation.goBack()} />

      <AdBanner page="VenueSearch" />
      <ProfileBanner navigation={navigation} />
      <View style={styles.body}>
        <Text style={styles.label}>{t('venueHub.searchPlaceholder')}</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={t('venueHub.searchPlaceholder')}
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          autoFocus
        />
        <TouchableOpacity style={styles.btn} onPress={handleSearch} disabled={loading || !query.trim()}>
          {loading
            ? <ActivityIndicator color={COLORS.black} />
            : <Text style={styles.btnText}>🗺️  {t('venueHub.openMaps')}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 24, paddingTop: 32 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    color: COLORS.text, backgroundColor: COLORS.surface, marginBottom: 16,
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  btnText: { color: COLORS.black, fontWeight: '800', fontSize: 15 },
});

export default VenueSearchScreen;
