import { type ReactNode, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AppIcon } from "@/components/ui/feature";
export {
  MetadataButton as CommunityButton,
  metadataInputClass as inputClass,
  MetadataNotice as CommunityNotice,
} from "@/components/churches/metadata-ui";

export function CommunityShell(
  { title, onBack, children, right }: {
    title: string;
    onBack: () => void;
    children: ReactNode;
    right?: ReactNode;
  },
) {
  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "bottom", "left", "right"]}
    >
      <ScreenHeader title={title} onBack={onBack} right={right} icon="chatbubbles-outline" tone="community" />
      <View className="w-full max-w-3xl flex-1 self-center">{children}</View>
    </SafeAreaView>
  );
}
export function Label({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
      {children}
    </Text>
  );
}
export function Choice(
  { label, value, options, onChange, disabled = false }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    disabled?: boolean;
  },
) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => setVisible(true)}
        className={`flex-row items-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <Text className="flex-1 text-base text-gray-900 dark:text-white">
          {options.find((option) => option.value === value)?.label ?? label}
        </Text>
        <AppIcon name="chevron-down" tone="community" size={18} />
      </Pressable>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <CommunityShell
          title={label}
          onBack={() => {
            setVisible(false);
            setSearch("");
          }}
        >
          <TextInput
            accessibilityLabel="목록 검색"
            placeholder="검색"
            value={search}
            onChangeText={setSearch}
            className="m-4 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 dark:text-white"
          />
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={options.filter((option) =>
              option.label.toLowerCase().includes(search.toLowerCase())
            )}
            keyExtractor={(option) => option.value}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.value === value }}
                onPress={() => {
                  onChange(item.value);
                  setVisible(false);
                  setSearch("");
                }}
                className={`mx-3 mb-2 flex-row items-center gap-3 rounded-2xl px-5 py-4 ${item.value === value ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
              >
                <Text className="flex-1 text-base text-gray-900 dark:text-white">
                  {item.label}
                </Text>
                {item.value === value ? <AppIcon name="checkmark-circle" tone="community" /> : null}
              </Pressable>
            )}
          />
        </CommunityShell>
      </Modal>
    </>
  );
}
export async function confirmCommunity(message: string): Promise<boolean> {
  if (Platform.OS === "web") return window.confirm(message);
  return new Promise((resolve) =>
    Alert.alert("확인", message, [{
      text: "취소",
      style: "cancel",
      onPress: () => resolve(false),
    }, { text: "확인", style: "destructive", onPress: () => resolve(true) }], {
      cancelable: true,
      onDismiss: () => resolve(false),
    })
  );
}
