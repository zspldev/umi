import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { LANGUAGES } from "@workspace/languages";

export function getLangLabel(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.native ?? code;
}

interface LanguagePickerProps {
  value: string;
  onChange: (code: string) => void;
  inverted?: boolean;
}

export function LanguagePicker({ value, onChange, inverted = false }: LanguagePickerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selected = LANGUAGES.find((l) => l.code === value);

  const styles = StyleSheet.create({
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    triggerText: {
      fontSize: 13,
      fontFamily: "PlusJakartaSans_600SemiBold",
      color: colors.foreground,
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: insets.bottom + 16,
      maxHeight: 480,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 8,
    },
    sheetTitle: {
      fontSize: 15,
      fontFamily: "PlusJakartaSans_700Bold",
      color: colors.foreground,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    itemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    itemLabel: {
      fontSize: 15,
      fontFamily: "PlusJakartaSans_500Medium",
      color: colors.foreground,
    },
    itemNative: {
      fontSize: 13,
      fontFamily: "PlusJakartaSans_400Regular",
      color: colors.mutedForeground,
    },
  });

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          inverted && { transform: [{ rotate: "180deg" }] },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>{selected?.native ?? value}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              Platform.OS === "web" && { paddingBottom: 34 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Language</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemNative}>{item.native}</Text>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </View>
                  {item.code === value && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              scrollEnabled
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
