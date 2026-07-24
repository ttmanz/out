import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, StatusBar, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { getAllMembers, setMemberStatus, setStaffStatus, banMember, unbanMember } from '../../lib/admin';
import { useUser } from '../../contexts/UserContext';
import { ROUTES } from '../../constants/routes';

const STATUS_CYCLE = { active: 'restricted', restricted: 'disabled', disabled: 'active' };
const STATUS_COLOR = {
  active: '#2ecc71',
  restricted: '#f39c12',
  disabled: '#e74c3c',
  banned: '#e74c3c',
};
const STATUS_LABEL = {
  active: 'Active',
  restricted: 'Restricted',
  disabled: 'Disabled',
  banned: 'Banned',
};

const AdminScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [staffUpdating, setStaffUpdating] = useState(null);
  const [blockUpdating, setBlockUpdating] = useState(null);
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

  const handleBlockToggle = (member) => {
    if (member.id === profile?.id) {
      Alert.alert('Cannot block your own account.');
      return;
    }
    const blocking = member.status !== 'banned';
    Alert.alert(
      blocking ? 'Block Member' : 'Unblock Member',
      blocking
        ? `Block ${member.full_name ?? 'this member'}? They'll be hidden from search and locked out of the app.`
        : `Unblock ${member.full_name ?? 'this member'} and restore normal access?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: blocking ? 'destructive' : 'default',
          onPress: async () => {
            setBlockUpdating(member.id);
            await (blocking ? banMember(member.id) : unbanMember(member.id));
            setBlockUpdating(null);
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
    if (member.status === 'banned') {
      Alert.alert('This member is blocked — unblock them first to change their status.');
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
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navRow} contentContainerStyle={styles.navRowContent}>
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
        <TouchableOpacity
          style={styles.plansBtn}
          onPress={() => navigation.navigate(ROUTES.ADMIN_ADS)}
        >
          <Text style={styles.plansBtnText}>📢 Ads</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.plansBtn}
          onPress={() => navigation.navigate(ROUTES.ADMIN_ACCESS_CONTROL)}
        >
          <Text style={styles.plansBtnText}>💳 Access</Text>
        </TouchableOpacity>
      </ScrollView>
      <Text style={styles.count}>{members.length} members</Text>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const status = item.status ?? 'active';
          const isUpdating = updating === item.id;
          const isStaffUpdating = staffUpdating === item.id;
          const isBlockUpdating = blockUpdating === item.id;
          const isBanned = status === 'banned';
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
              <TouchableOpacity
                style={[styles.blockChip, isBanned && styles.blockChipActive]}
                onPress={() => handleBlockToggle(item)}
                disabled={isBlockUpdating}
              >
                {isBlockUpdating
                  ? <ActivityIndicator size="small" color={isBanned ? COLORS.black : COLORS.error} />
                  : <Text style={[styles.blockChipText, isBanned && styles.blockChipTextActive]}>
                      {isBanned ? 'Unblock' : 'Block'}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  navRow: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navRowContent: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
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
  blockChip: {
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  blockChipActive: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  blockChipText: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  blockChipTextActive: { color: COLORS.black },
});

export default AdminScreen;
