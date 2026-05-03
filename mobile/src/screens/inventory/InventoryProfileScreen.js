import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Button, Card } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

export default function InventoryProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={styles.hero}>
        <View style={styles.avatar}><Text style={styles.avText}>{user?.name?.[0] || 'I'}</Text></View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>Inventory Manager</Text>
      </View>
      <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
        <Card>
          {[['Name', user?.name], ['Email', user?.email], ['Phone', user?.phone]].map(([k, v]) =>
            v ? (
              <View key={k} style={styles.row}>
                <Text style={styles.key}>{k}</Text>
                <Text style={styles.val}>{v}</Text>
              </View>
            ) : null
          )}
        </Card>
        <Button title="Open AI Assistant" onPress={() => navigation.navigate('Assistant')} />
        <Button title="Sign Out" variant="outline" onPress={logout} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero:   { backgroundColor: COLORS.maroon, alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.xl, gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.gold + '30', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.gold },
  avText: { fontSize: 30, ...FONTS.bold, color: COLORS.gold },
  name:   { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  role:   { fontSize: 14, color: COLORS.lightGold },
  row:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  key:    { fontSize: 14, color: COLORS.gray600 },
  val:    { fontSize: 14, ...FONTS.medium, color: COLORS.dark },
});
