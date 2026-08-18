import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getFlaggedCommercialMembers, getCommercialFlagsForUser } from '../../lib/admin';
import { formatAgo } from '../../utils/format';
import BackHeader from '../../components/common/BackHeader';

const AdminFlaggedMembersScreen = ({ navigation }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [flagsByUser, setFlagsByUser] = useState({});
  const [flagsLoading, setFlagsLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getFlaggedCommercialMembers();
    if (!error) setMembers(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleExpand = async (member) => {
    if (expandedId === member.user_id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(member.user_id);
    if (!flagsByUser[member.user_id]) {
      setFlagsLoading(member.user_id);
      const { data, error } = await getCommercialFlagsForUser(member.user_id);
      setFlagsLoading(null);
      if (!error) setFlagsByUser((prev) => ({ ...prev, [member.user_id]: data ?? [] }));
    }
  };

  return (
    <View style={styles.safe}>
      <BackHeader title="Flagged Members" onBack={() => navigation.goBack()} />
      <Text style={styles.hint}>
        Members (not venue owners) who posted commercial content more than twice this month.
      </Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No flagged members this month 🎉</Text>}
          renderItem={({ item }) => {
            const expanded = expandedId === item.user_id;
            const flags = flagsByUser[item.user_id];
            const busy = flagsLoading === item.user_id;
            return (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardTop} onPress={() => toggleExpand(item)} activeOpacity={0.75}>
                  <View style={styles.cardTopText}>
                    <Text style={styles.name}>{item.full_name ?? 'Unknown'}</Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('MessagesTab', {
                        screen: ROUTES.MEMBER_PROFILE,
                        params: { userId: item.user_id, fullName: item.full_name },
                        initial: false,
                      })}
                    >
                      <Text style={styles.memberLink}>👤 View profile</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.flagCount}>{item.flag_count} flags</Text>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.detail}>
                    {busy ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      (flags ?? []).map((f) => (
                        <View key={f.id} style={styles.flagRow}>
                          <View style={styles.flagRowTop}>
                            <Text style={styles.flagType}>{f.target_type}</Text>
                            <Text style={styles.flagAgo}>{formatAgo(f.created_at)}</Text>
                          </View>
                          {!!f.content_excerpt && (
                            <Text style={styles.excerpt} numberOfLines={3}>"{f.content_excerpt}"</Text>
                          )}
                          {!!f.reason && <Text style={styles.reason}>{f.reason}</Text>}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 20, paddingVertical: 10, lineHeight: 17 },
  list: { padding: 16, paddingBottom: 48 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40, fontSize: 14 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTopText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  memberLink: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  flagCount: { fontSize: 13, fontWeight: '800', color: COLORS.error },
  detail: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, gap: 10 },
  flagRow: { gap: 2 },
  flagRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  flagType: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'capitalize' },
  flagAgo: { fontSize: 11, color: COLORS.textMuted },
  excerpt: { fontSize: 13, color: COLORS.textLight, fontStyle: 'italic' },
  reason: { fontSize: 12, color: COLORS.textMuted },
});

export default AdminFlaggedMembersScreen;
