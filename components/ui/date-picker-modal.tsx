import { Modal, Pressable, Text, View } from 'react-native';
import { Calendar, type CalendarProps } from 'react-native-calendars';

import { useResponsive } from '@/hooks/use-responsive';

type DatePickerModalProps = {
  visible: boolean;
  title: string;
  value: string;
  initialDate?: string;
  maxDate?: string;
  markedDates?: CalendarProps['markedDates'];
  onSelect: (date: string) => void;
  onClose: () => void;
};

export function DatePickerModal({
  visible,
  title,
  value,
  initialDate,
  maxDate,
  markedDates,
  onSelect,
  onClose,
}: DatePickerModalProps) {
  const { dialogMaxWidth } = useResponsive();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center bg-black/40 px-5"
        onPress={onClose}
      >
        <Pressable
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          style={{ width: '100%', maxWidth: dialogMaxWidth, alignSelf: 'center' }}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="px-4 pb-2 pt-4">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </Text>
          </View>
          {visible ? (
            <Calendar
              current={value || initialDate}
              maxDate={maxDate}
              disableAllTouchEventsForDisabledDays
              onDayPress={({ dateString }) => {
                onSelect(dateString);
                onClose();
              }}
              markedDates={
                markedDates ?? (value ? { [value]: { selected: true } } : {})
              }
              theme={{
                selectedDayBackgroundColor: '#3b82f6',
                todayTextColor: '#2563eb',
              }}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
