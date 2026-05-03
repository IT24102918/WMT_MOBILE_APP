import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, LoadingScreen } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { requestJson } from '../../config/api';

const LOG_ICONS = {
  STOCK_IN:          { icon: 'arrow-down-circle-outline', color: COLORS.green,  bg: COLORS.greenLight },
  STOCK_OUT:         { icon: 'arrow-up-circle-outline',   color: COLORS.red,    bg: COLORS.redLight },
  SUPPLIER_DELIVERY: { icon: 'cube-outline',              color: COLORS.blue,   bg: COLORS.blueLight },
  STOCK_UPDATE:      { icon: 'create-outline',            color: COLORS.amber,  bg: COLORS.amberLight },
  STOCK_REMOVED:     { icon: 'trash-outline',             color: COLORS.red,    bg: COLORS.redLight },
};

export default function StockLogsScreen() {
  const isFocused = useIsFocused();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFocused) return;

    requestJson('/api/stock-logs')
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isFocused]);

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={styles.header}>
        <Text style={styles.title}>Stock Logs</Text>
        <Text style={styles.sub}>{logs.length} entries</Text>
      </View>
      <FlatList
        data={logs}
        keyExtractor={i => i._id || String(i.id)}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="📋" title="No stock logs yet" />}
        renderItem={({ item }) => {
          const cfg = LOG_ICONS[item.changeType] || { icon: 'swap-horizontal-outline', color: COLORS.gray600, bg: COLORS.gray100 };
          return (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
              <View style={[styles.logIcon, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={24} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logType}>{item.changeType?.replace(/_/g, ' ')}</Text>
                <Text style={styles.logProduct}>{item.product?.name || 'Product'}</Text>
                {item.warehouseLocation ? <Text style={styles.logDate}>Warehouse: {item.warehouseLocation}</Text> : null}
                {item.stockStatus ? <Text style={styles.logDate}>Status: {item.stockStatus.replace(/_/g, ' ')}</Text> : null}
                {item.note ? <Text style={styles.logDate}>Note: {item.note}</Text> : null}
                <Text style={styles.logDate}>{item.changeDate ? new Date(item.changeDate).toLocaleString() : 'N/A'}</Text>
              </View>
              <Text style={[styles.logQty, { color: item.quantityChanged >= 0 ? COLORS.green : COLORS.red }]}>
                {item.quantityChanged >= 0 ? '+' : ''}{item.quantityChanged}
              </Text>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { backgroundColor: COLORS.maroon, padding: SPACING.md, paddingTop: SPACING.xl },
  title:      { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  sub:        { fontSize: 13, color: COLORS.lightGold, marginTop: 2 },
  logIcon:    { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logType:    { fontSize: 13, ...FONTS.semibold, color: COLORS.dark },
  logProduct: { fontSize: 14, ...FONTS.medium, color: COLORS.dark, marginTop: 1 },
  logDate:    { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  logQty:     { fontSize: 20, ...FONTS.bold, minWidth: 40, textAlign: 'right' },
});
