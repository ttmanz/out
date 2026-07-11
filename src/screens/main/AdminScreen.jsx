import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { getAllMembers, setMemberStatus, setStaffStatus } from '../../lib/admin';
import { useUser } from '../../contexts/UserContext';
import { ROUTES } from '../../constants/routes';

const STATUS_CYCLE = { active: 'restricted', restricted: 'disabled', disabled: 'active' };
const STATUS_COLOR = {
  active: '#2ecc71',
  restricted: '#f39c12',
  disabled: '#e74c3c',
};
const STATUS_LABEL = {
  active: 'Active',
  restricted: 'Restricted',
  disabled: 'Disabled',
};

const AdminScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [staffUpdating, setStaffUpdating] = useState(null);
  const statusBarHeight = StatusBar.currentHeight ?? 44;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAllMembers();
    if (!error) setMembers(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleStaffToggle = async (member) => {
    const next = !member.is_staff;
    Alert.alert(
      next ? 'Grant Staff Access' : 'Remove Staff Access',
      `${next ? 'Give' : 'Remove'} free subscription for ${member.full_name ?? 'this member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setStaffUpdating(member.id);
            await setStaffStatus(member.id, next);
            setStaffUpdating(null);
            load();
          },
        },
      ]
    );
  };

  const handleStatusPress = (member) => {
    if (member.id === profile?.id) {
      Alert.alert('Cannot change your own status.');
      return;
    }
    const next = STATUS_CYCLE[member.status ?? 'active'];
    Alert.alert(
      'Change Status',
      `Set ${member.full_name ?? 'this member'} to ${STATUS_LABEL[next]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(member.id);
            await setMemberStatus(member.id, next);
            setUpdating(null);
            load();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
        <Text style={styles.title}>Members</Text>
        <TouchableOpacity
          style={styles.plansBtn}
          onPress={() => navigation.navigate(ROUTES.ADMIN_TOP_VENUES)}
        >
          <Text style={styles.plansBtnText}>📍 Venues</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.plansBtn}
          onPress={() => navigation.navigate(ROUTES.ADMIN_OPEN_GROUPS)}
        >
          <Text style={styles.plansBtnText}>🧩 Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.plansBtn}
          onPress={() => navigation.navigate(ROUTES.ADMIN_SUBSCRIPTION_PLANS)}
        >
          <Text style={styles.plansBtnText}>⭐ Plans</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.count}>{members.length} members</Text>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const status = item.status ?? 'active';
          const isUpdating = updating === item.id;
          const isStaffUpdating = staffUpdating === item.id;
          return (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.full_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.full_name ?? '—'}</Text>
                {item.is_admin && <Text style={styles.adminBadge}>Admin</Text>}
              </View>
              <TouchableOpacity
                style={[styles.staffChip, item.is_staff && styles.staffChipActive]}
                onPress={() => handleStaffToggle(item)}
                disabled={isStaffUpdating}
              >
                {isStaffUpdating
                  ? <ActivityIndicator size="small" color={item.is_staff ? COLORS.black : COLORS.textMuted} />
                  : <Text style={[styles.staffChipText, item.is_staff && styles.staffChipTextActive]}>
                      {item.is_staff ? '✓ Staff' : 'Staff'}
                    </Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusBtn, { borderColor: STATUS_COLOR[status] }]}
                onPress={() => handleStatusPress(item)}
                disabled={isUpdating}
              >
                {isUpdating
                  ? <ActivityIndicator size="small" color={STATUS_COLOR[status]} />
                  : <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>
                      {STATUS_LABEL[status]}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  count: { fontSize: 13, color: COLORS.textMuted, paddingHorizontal: 20, paddingVertical: 8 },
  plansBtn: {
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  plansBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  list: { paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  adminBadge: { fontSize: 10, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  staffChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    minWidth: 58,
    alignItems: 'center',
  },
  staffChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  staffChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  staffChipTextActive: { color: COLORS.black },
  statusBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  statusText: { fontSize: 12, fontWeight: '700' },
});

export default AdminScreen;
