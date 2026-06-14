import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { searchUsers, sendFriendRequest, getSentRequestIds } from '../../lib/friends';
import AuthInput from '../../components/auth/AuthInput';

const Avatar = ({ name }) => (
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
  </View>
);

const SearchUsersScreen = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [sentIds, setSentIds] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      getSentRequestIds(session.user.id).then(({ data }) => {
        setSentIds(new Set((data ?? []).map((r) => r.addressee_id)));
      });
    });
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const { data, error } = await searchUsers(query.trim(), userId);
    setSearching(false);
    if (!error) setResults(data ?? []);
  };

  const handleAdd = async (addresseeId) => {
    const { error } = await sendFriendRequest(userId, addresseeId);
    if (!error) setSentIds((prev) => new Set([...prev, addresseeId]));
    else Alert.alert(t('common.error'), t('friends.errors.sendFailed'));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('friends.search')}</Text>

      <AuthInput
        placeholder={t('friends.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />

      <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
        {searching
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.searchBtnText}>{t('friends.search')}</Text>
        }
      </TouchableOpacity>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={query && !searching ? <Text style={styles.empty}>{t('friends.noResults')}</Text> : null}
        renderItem={({ item }) => {
          const sent = sentIds.has(item.id);
          return (
            <View style={styles.row}>
              <Avatar name={item.full_name} />
              <Text style={styles.name}>{item.full_name}</Text>
              <TouchableOpacity
                style={[styles.addBtn, sent && styles.addBtnSent]}
                onPress={() => !sent && handleAdd(item.id)}
                disabled={sent}
              >
                <Text style={styles.addBtnText}>
                  {sent ? t('friends.requestSent') : t('friends.addFriend')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.primary, marginBottom: 16 },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  searchBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  name: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnSent: { backgroundColor: COLORS.border },
  addBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
});

export default SearchUsersScreen;
