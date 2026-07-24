import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { getAllSubscriptionPlans, updateSubscriptionPlan } from '../../lib/subscription';
import BackHeader from '../../components/common/BackHeader';

const AdminSubscriptionPlansScreen = ({ navigation }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAllSubscriptionPlans();
    if (!error && data) {
      setPlans(data);
      const initial = {};
      data.forEach((p) => { initial[p.id] = { label: p.label, price_display: p.price_display, badge: p.badge ?? '', description: p.description ?? '', stripe_price_id: p.stripe_price_id ?? '' }; });
      setDrafts(initial);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setField = (planId, field, value) =>
    setDrafts((prev) => ({ ...prev, [planId]: { ...prev[planId], [field]: value } }));

  const handleSave = async (plan) => {
    const d = drafts[plan.id];
    if (!d?.label?.trim() || !d?.price_display?.trim()) {
      Alert.alert('Error', 'Label and price are required.');
      return;
    }
    setSaving(plan.id);
    const { error } = await updateSubscriptionPlan(plan.id, {
      label: d.label.trim(),
      price_display: d.price_display.trim(),
      badge: d.badge.trim() || null,
      description: d.description.trim() || null,
      stripe_price_id: d.stripe_price_id.trim() || null,
    });
    setSaving(null);
    if (error) Alert.alert('Error', error.message);
    else load();
  };

  return (
    <KeyboardAvoidingView style={styles.safe} behavior="padding">
      <BackHeader title="Subscription Plans" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {plans.map((plan) => {
            const d = drafts[plan.id] ?? {};
            const isSaving = saving === plan.id;
            return (
              <View key={plan.id} style={styles.card}>
                <Text style={styles.planId}>{plan.id.toUpperCase()}</Text>

                <Text style={styles.fieldLabel}>Label</Text>
                <TextInput
                  style={styles.input}
                  value={d.label ?? ''}
                  onChangeText={(v) => setField(plan.id, 'label', v)}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="e.g. Monthly"
                />

                <Text style={styles.fieldLabel}>Price Display</Text>
                <TextInput
                  style={styles.input}
                  value={d.price_display ?? ''}
                  onChangeText={(v) => setField(plan.id, 'price_display', v)}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="e.g. €4.99 / month"
                />

                <Text style={styles.fieldLabel}>Badge (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={d.badge ?? ''}
                  onChangeText={(v) => setField(plan.id, 'badge', v)}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="e.g. Best Value"
                />

                <Text style={styles.fieldLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={d.description ?? ''}
                  onChangeText={(v) => setField(plan.id, 'description', v)}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Short description..."
                  multiline
                />

                <Text style={styles.fieldLabel}>Stripe Price ID (for when Stripe is set up)</Text>
                <TextInput
                  style={styles.input}
                  value={d.stripe_price_id ?? ''}
                  onChangeText={(v) => setField(plan.id, 'stripe_price_id', v)}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="price_..."
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => handleSave(plan)}
                  disabled={isSaving}
                >
                  {isSaving
                    ? <ActivityIndicator color={COLORS.black} size="small" />
                    : <Text style={styles.saveBtnText}>Save</Text>
                  }
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 48 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  planId: {
    fontSize: 11, fontWeight: '800', color: COLORS.primary,
    letterSpacing: 1.5, marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 10,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: COLORS.text, backgroundColor: COLORS.background,
  },
  inputMulti: { height: 70, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 14 },
});

export default AdminSubscriptionPlansScreen;
