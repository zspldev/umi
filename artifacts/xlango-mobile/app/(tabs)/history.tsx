import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Session, useApp } from "@/context/AppContext";
import { getLangLabel } from "@/components/LanguagePicker";
import { useColors } from "@/hooks/useColors";

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionRow({ session, onDelete }: { session: Session; onDelete: () => void }) {
  const colors = useColors();
  const langPair = `${getLangLabel(session.speaker1.lang)} ↔ ${getLangLabel(session.speaker2.lang)}`;
  const duration = session.endedAt
    ? Math.round((session.endedAt - session.startedAt) / 1000 / 60)
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={{
        backgroundColor: colors.card,
        borderRadius: colors.radius + 2,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "PlusJakartaSans_700Bold",
              color: colors.foreground,
            }}
            numberOfLines={1}
          >
            {session.title || `${session.speaker1.name} & ${session.speaker2.name}`}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "PlusJakartaSans_500Medium",
              color: colors.mutedForeground,
            }}
          >
            {langPair}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4 }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="chatbubbles-outline" size={12} color={colors.mutedForeground} />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "PlusJakartaSans_400Regular",
              color: colors.mutedForeground,
            }}
          >
            {session.turns.length} turns
          </Text>
        </View>
        {duration !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "PlusJakartaSans_400Regular",
                color: colors.mutedForeground,
              }}
            >
              {duration < 1 ? "< 1" : duration} min
            </Text>
          </View>
        )}
        <Text
          style={{
            fontSize: 12,
            fontFamily: "PlusJakartaSans_400Regular",
            color: colors.mutedForeground,
            marginLeft: "auto" as any,
          }}
        >
          {formatDate(session.startedAt)}
        </Text>
      </View>

      {session.turns.length > 0 && (
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            fontFamily: "PlusJakartaSans_400Regular",
            color: `${colors.foreground}80`,
            fontStyle: "italic",
          }}
        >
          "{session.turns[session.turns.length - 1].translated}"
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, deleteSession, clearHistory } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleDelete = (id: string) => {
    Alert.alert("Delete session?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSession(id) },
    ]);
  };

  const handleClearAll = () => {
    if (history.length === 0) return;
    Alert.alert("Clear all history?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear All", style: "destructive", onPress: clearHistory },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: topPad + 8,
          paddingBottom: 12,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginRight: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 20,
            fontFamily: "PlusJakartaSans_700Bold",
            color: colors.foreground,
          }}
        >
          History
        </Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "PlusJakartaSans_500Medium",
                color: colors.destructive,
              }}
            >
              Clear All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: botPad + 20,
          flexGrow: 1,
        }}
        scrollEnabled={!!history.length}
        renderItem={({ item }) => (
          <SessionRow session={item} onDelete={() => handleDelete(item.id)} />
        )}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
              gap: 12,
            }}
          >
            <Ionicons name="time-outline" size={48} color={colors.border} />
            <Text
              style={{
                fontSize: 16,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: colors.mutedForeground,
              }}
            >
              No sessions yet
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "PlusJakartaSans_400Regular",
                color: colors.mutedForeground,
                textAlign: "center",
              }}
            >
              Completed sessions will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}
