import { Text, TextInput, View } from "react-native";
import { COMMUNITY_BOOKS, rangeLabel } from "@/domain/community/validation";
import type { ReadingRange } from "@/domain/community/types";
import { Choice, CommunityButton, inputClass } from "./ui";

export function ReadingRanges(
  { value, onChange, locked = false }: {
    value: ReadingRange[];
    onChange: (value: ReadingRange[]) => void;
    locked?: boolean;
  },
) {
  const set = (index: number, patch: Partial<ReadingRange>) =>
    onChange(
      value.map((range, i) => i === index ? { ...range, ...patch } : range),
    );
  return (
    <View className="gap-3">
      {locked
        ? (
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            묵상 댓글이 등록되어 읽을 범위가 고정되었습니다.
          </Text>
        )
        : (
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            한 장은 시작·끝을 같게, 떨어진 구간은 범위를 추가해 주세요.
          </Text>
        )}
      {value.map((range, index) => (
        <View
          key={index}
          className="gap-2 rounded-xl bg-gray-100 p-3 dark:bg-gray-800"
        >
          {locked
            ? (
              <Text className="text-gray-900 dark:text-white">
                {rangeLabel(range)}
              </Text>
            )
            : (
              <>
                <Choice
                  label="성경 선택"
                  value={range.book_code}
                  options={COMMUNITY_BOOKS.map((book) => ({
                    value: book.bookCode,
                    label: book.bookName.ko,
                  }))}
                  onChange={(book_code) =>
                    set(index, { book_code, chapter_start: 1, chapter_end: 1 })}
                />
                <View className="flex-row items-center gap-2">
                  <TextInput
                    accessibilityLabel={`${index + 1}번째 범위 시작 장`}
                    keyboardType="number-pad"
                    value={String(range.chapter_start || "")}
                    onChangeText={(text) =>
                      set(index, { chapter_start: Number(text) })}
                    className={`${inputClass} flex-1`}
                  />
                  <Text className="text-gray-600 dark:text-gray-300">
                    장부터
                  </Text>
                  <TextInput
                    accessibilityLabel={`${index + 1}번째 범위 끝 장`}
                    keyboardType="number-pad"
                    value={String(range.chapter_end || "")}
                    onChangeText={(text) =>
                      set(index, { chapter_end: Number(text) })}
                    className={`${inputClass} flex-1`}
                  />
                  <Text className="text-gray-600 dark:text-gray-300">장</Text>
                </View>
                <CommunityButton
                  icon="trash-outline"
                  secondary
                  onPress={() => onChange(value.filter((_, i) => i !== index))}
                >
                  범위 삭제
                </CommunityButton>
              </>
            )}
        </View>
      ))}
      {!locked
        ? (
          <CommunityButton
            icon="add-circle-outline"
            tone="bible"
            secondary
            disabled={value.length >= 20}
            onPress={() =>
              onChange([...value, {
                book_code: "genesis",
                chapter_start: 1,
                chapter_end: 1,
              }])}
          >
            읽을 범위 추가
          </CommunityButton>
        )
        : null}
    </View>
  );
}
