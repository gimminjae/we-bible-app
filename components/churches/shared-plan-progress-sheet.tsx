import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { useAppSettings } from '@/contexts/app-settings';
import type { SharedPlanMemberProgress } from '@/lib/church';
import { BIBLE_BOOKS, type GoalStatus } from '@/lib/plan';
import { getBookName } from '@/services/bible';
import { useI18n } from '@/utils/i18n';

type SharedPlanProgressSheetProps = {
  visible: boolean;
  onClose: () => void;
  memberProgress: SharedPlanMemberProgress | null;
  canEdit: boolean;
  onSave: (goalStatus: GoalStatus) => Promise<void> | void;
};

export function SharedPlanProgressSheet({
  visible,
  onClose,
  memberProgress,
  canEdit,
  onSave,
}: SharedPlanProgressSheetProps) {
  const { appLanguage } = useAppSettings();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'ot' | 'nt'>('ot');
  const [localGoalStatus, setLocalGoalStatus] = useState<GoalStatus>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!memberProgress) {
      setLocalGoalStatus([]);
      return;
    }

    setLocalGoalStatus(memberProgress.plan.goalStatus.map((row) => [...row]));
  }, [memberProgress]);

  const booksToRender = useMemo(() => {
    if (!memberProgress) return [];
    const selectedBookCodes = memberProgress.plan.selectedBookCodes;
    return BIBLE_BOOKS.filter(
      (book) =>
        selectedBookCodes.includes(book.bookCode) &&
        (activeTab === 'ot' ? book.bookSeq <= 39 : book.bookSeq >= 40),
    );
  }, [activeTab, memberProgress]);

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        if (isSaving) return;
        onClose();
      }}
      heightFraction={0.88}
    >
      {memberProgress ? (
        <View className="flex-1">
          <View className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {memberProgress.profile.displayName}
            </Text>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
            <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {t('mypage.planProgress')}
                  </Text>
                  <Text className="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {memberProgress.plan.goalPercent.toFixed(2)}%
                  </Text>
                </View>
                <View>
                  <Text className="text-right text-sm text-gray-500 dark:text-gray-400">
                    {memberProgress.plan.currentReadCount} / {memberProgress.plan.totalReadCount}
                  </Text>
                  <Text className="mt-1 text-right text-sm text-gray-500 dark:text-gray-400">
                    {memberProgress.plan.restDay} {t('mypage.planDaysRemaining')}
                  </Text>
                </View>
              </View>
              <View className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <View
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${Math.min(100, memberProgress.plan.goalPercent)}%` }}
                />
              </View>
            </View>

            <View className="mb-4 flex-row rounded-2xl bg-gray-200 p-1 dark:bg-gray-800">
              {(['ot', 'nt'] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Button
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    action={isActive ? 'primary' : 'secondary'}
                    variant={isActive ? 'solid' : 'outline'}
                    className={`h-auto flex-1 rounded-2xl border-0 px-4 py-3 ${
                      isActive ? 'bg-white dark:bg-gray-900' : 'bg-transparent'
                    }`}
                  >
                    <ButtonText
                      className={`text-center text-sm font-semibold ${
                        isActive
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {tab === 'ot' ? t('bibleDrawer.oldTestament') : t('bibleDrawer.newTestament')}
                    </ButtonText>
                  </Button>
                );
              })}
            </View>

            {booksToRender.length === 0 ? (
              <View className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-900">
                <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('mypage.planNoSelectedBooks')}
                </Text>
              </View>
            ) : (
              booksToRender.map((book) => {
                const bookIndex = BIBLE_BOOKS.findIndex((item) => item.bookCode === book.bookCode);
                const chapters = localGoalStatus[bookIndex] ?? [];
                const readCount = chapters.filter((value) => value === 1).length;

                return (
                  <View
                    key={book.bookCode}
                    className="mb-4 rounded-3xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <View className="mb-3 flex-row items-center justify-between">
                      <View>
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {getBookName(book.bookCode, appLanguage)}
                        </Text>
                        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {readCount}/{book.maxChapter}
                        </Text>
                      </View>
                      {canEdit ? (
                        <Button
                          onPress={() =>
                            setLocalGoalStatus((previous) =>
                              previous.map((row, index) =>
                                index === bookIndex
                                  ? row.map(() => (row.every((chapter) => chapter === 1) ? 0 : 1))
                                  : row,
                              ),
                            )
                          }
                          action="secondary"
                          variant="outline"
                          className="h-auto rounded-2xl border-gray-200 bg-gray-100 px-3 py-2 dark:border-gray-800 dark:bg-gray-800"
                        >
                          <ButtonText className="text-sm font-semibold text-gray-900 dark:text-white">
                            {t('mypage.checkAll')}
                          </ButtonText>
                        </Button>
                      ) : null}
                    </View>

                    <View className="flex-row flex-wrap gap-2">
                      {Array.from({ length: book.maxChapter }, (_entry, chapterIndex) => {
                        const read = chapters[chapterIndex] === 1;
                        return (
                          <Button
                            key={`${book.bookCode}-${chapterIndex}`}
                            disabled={!canEdit}
                            onPress={() =>
                              canEdit
                                ? setLocalGoalStatus((previous) =>
                                    previous.map((row, index) =>
                                      index === bookIndex
                                        ? row.map((value, rowIndex) =>
                                            rowIndex === chapterIndex ? (value === 1 ? 0 : 1) : value,
                                          )
                                        : row,
                                    ),
                                  )
                                : undefined
                            }
                            action={read ? 'positive' : 'secondary'}
                            variant={read ? 'solid' : 'outline'}
                            className={`h-10 w-10 rounded-2xl px-0 border ${
                              read
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                            } ${!canEdit ? 'opacity-70' : ''}`}
                          >
                            <ButtonText className={`text-sm font-semibold ${read ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                              {chapterIndex + 1}
                            </ButtonText>
                          </Button>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {canEdit ? (
            <View className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Button
                disabled={isSaving}
                onPress={async () => {
                  setIsSaving(true);
                  try {
                    await onSave(localGoalStatus);
                    onClose();
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className={`h-auto rounded-2xl px-4 py-4 ${
                  isSaving ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
                }`}
              >
                <ButtonText className="font-semibold text-white">{t('mypage.savePlan')}</ButtonText>
              </Button>
            </View>
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
}
