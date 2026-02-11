import { Pressable, Text, View } from 'react-native';

type ChapterNavProps = {
  onPrev: () => void;
  onNext: () => void;
};

export function ChapterNav({ onPrev, onNext }: ChapterNavProps) {
  return (
    <View className="absolute bottom-6 left-0 right-0 flex-row justify-center gap-5">
      <Pressable
        onPress={onPrev}
        className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg active:opacity-90"
      >
        <Text className="text-white text-xl font-medium">←</Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg active:opacity-90"
      >
        <Text className="text-white text-xl font-medium">→</Text>
      </Pressable>
    </View>
  );
}
