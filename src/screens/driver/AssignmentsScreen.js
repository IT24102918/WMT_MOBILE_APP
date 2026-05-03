import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Badge, EmptyState, LoadingScreen } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/theme';

export default function AssignmentsScreen() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);

  const fetchData = () => {
    fetch(`${API_BASE}/api/transport/assignments`)
      .then(r => r.json()).then(setAssignments).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id, status) => {
    await fetch(`${API_BASE}/api/transport/assignments/${id}/status?status=${status}`, { method: 'PUT' });
    fetchData();
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={styles.header}><Text style={styles.title}>My Assignments</Text></View>
      <FlatList
        data={assignments}
        keyExtractor={i => i._id || String(i.id)}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🚗" title="No assignments yet" />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.assignId}>Assignment #{(item._id || item.id)?.slice(-6)}</Text>
              <Badge status={item.taskStatus} label={item.taskStatus} />
            </View>
            <Text style={styles.detail}>📍 {item.destinationAddress}</Text>
            <Text style={styles.detail}>🚗 {item.vehicle?.licensePlate || 'Vehicle TBD'}</Text>
            <Text style={styles.detail}>🕐 {item.departureTime ? new Date(item.departureTime).toLocaleString() : 'Time TBD'}</Text>
            {item.transportCost ? <Text style={styles.detail}>💰 Rs. {item.transportCost}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {item.taskStatus === 'PENDING' && (
                <TouchableOpacity onPress={() => updateStatus(item._id || item.id, 'IN_TRANSIT')}
                  style={[styles.actionBtn, { backgroundColor: COLORS.amberLight }]}>
                  <Text style={[styles.actionText, { color: COLORS.amber }]}>Start Trip</Text>
                </TouchableOpacity>
              )}
              {item.taskStatus === 'IN_TRANSIT' && (
                <TouchableOpacity onPress={() => updateStatus(item._id || item.id, 'COMPLETED')}
                  style={[styles.actionBtn, { backgroundColor: COLORS.greenLight }]}>
                  <Text style={[styles.actionText, { color: COLORS.green }]}>Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { backgroundColor: COLORS.maroon, padding: SPACING.md, paddingTop: SPACING.xl },
  title:      { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  row:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  assignId:   { fontSize: 15, ...FONTS.semibold, color: COLORS.dark },
  detail:     { fontSize: 13, color: COLORS.gray600, marginBottom: 2 },
  actionBtn:  { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center' },
  actionText: { fontSize: 13, ...FONTS.semibold },
});
