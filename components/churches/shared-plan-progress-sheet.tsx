import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ChurchProgressBar } from '@/components/churches/church-progress-bar';
import { EditableChapterReadCountGrid } from '@/components/plans/editable-chapter-read-count-grid';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { useAppSettings } from '@/contexts/app-settings';
import { useLoading } from '@/hooks/use-loading';
import type { SharedPlanMemberProgress } from '@/services/church';
import {
  BIBLE_BOOKS,
  calcGoalPercent,
  countReadChapters,
  formatReadCountBadge,
  isChapterRead,
  normalizeChapterReadCount,
  type GoalStatus,
} from '@/lib/plan';
import { getBookName } from '@/services/bible';
import { useI18n } from '@/utils/i18n';

type SharedPlanProgressSheetProps = {
  visible: boolean;
  onClose: () => void;
  memberProgress: SharedPlanMemberProgress | null;
  canEdit: boolean;
  onSave: (goalStatus: GoalStatus) => Promise<void> | void;
  onChapterLongPress?: (bookCode: string, chapter: number) => Promise<void> | void;
};

const CHAPTER_BUTTON_LONG_PRESS_MS = 400;
const BOOK_INDEX_BY_CODE = new Map(BIBLE_BOOKS.map((book, index) => [book.bookCode, index]));

export function SharedPlanProgressSheet({
  visible,
  onClose,
  memberProgress,
  canEdit,
  onSave,
  onChapterLongPress,
}: SharedPlanProgressSheetProps) {
  const { appLanguage } = useAppSettings();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'ot' | 'nt'>('ot');
  const [expandedBookCode, setExpandedBookCode] = useState<string | null>(null);
  const [localGoalStatus, setLocalGoalStatus] = useState<GoalStatus>([]);
  const { isLoading, runWithLoading } = useLoading();

  useEffect(() => {
    if (!memberProgress || !canEdit) {
      setLocalGoalStatus([]);
      return;
    }

    setLocalGoalStatus(memberProgress.plan.goalStatus.map((row) => [...row]));
  }, [canEdit, memberProgress]);

  useEffect(() => {
    if (!memberProgress) {
      setExpandedBookCode(null);
      return;
    }

    setExpandedBookCode(null);
  }, [activeTab, memberProgress]);

  const selectedBookCodeSet = useMemo(
    () => new Set(memberProgress?.plan.selectedBookCodes ?? []),
    [memberProgress?.plan.selectedBookCodes],
  );

  const goalStatus = useMemo(() => {
    if (!memberProgress) return [];
    if (!canEdit || localGoalStatus.length === 0) {
      return memberProgress.plan.goalStatus;
    }
    return localGoalStatus;
  }, [canEdit, localGoalStatus, memberProgress]);

  const booksToRender = useMemo(() => {
    if (!memberProgress) return [];
    return BIBLE_BOOKS.filter((book) => {
      if (!selectedBookCodeSet.has(book.bookCode)) return false;
      return activeTab === 'ot' ? book.bookSeq <= 39 : book.bookSeq >= 40;
    }).map((book) => {
      const bookIndex = BOOK_INDEX_BY_CODE.get(book.bookCode) ?? -1;
      const chapterRow = goalStatus[bookIndex] ?? [];
      const readCount = countReadChapters(chapterRow);

      return {
        book,
        bookIndex,
        readCount,
        allRead: readCount === book.maxChapter,
      };
    });
  }, [activeTab, goalStatus, memberProgress, selectedBookCodeSet]);

  const localCurrentReadCount = useMemo(() => {
    if (!memberProgress) return 0;
    if (!canEdit) return memberProgress.plan.currentReadCount;

    return BIBLE_BOOKS.reduce((sum, book, bookIndex) => {
      if (!selectedBookCodeSet.has(book.bookCode)) return sum;
      return sum + countReadChapters(goalStatus[bookIndex] ?? []);
    }, 0);
  }, [canEdit, goalStatus, memberProgress, selectedBookCodeSet]);

  const localGoalPercent = useMemo(() => {
    if (!memberProgress) return 0;
    if (!canEdit) return memberProgress.plan.goalPercent;
    return calcGoalPercent(memberProgress.plan.totalReadCount, localCurrentReadCount);
  }, [canEdit, localCurrentReadCount, memberProgress]);

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        if (isLoading) return;
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
                    {localGoalPercent.toFixed(2)}%
                  </Text>
                </View>
                <View>
                  <Text className="text-right text-sm text-gray-500 dark:text-gray-400">
                    {localCurrentReadCount} / {memberProgress.plan.totalReadCount}
                  </Text>
                  <Text className="mt-1 text-right text-sm text-gray-500 dark:text-gray-400">
                    {memberProgress.plan.restDay} {t('mypage.planDaysRemaining')}
                  </Text>
                </View>
              </View>
              <ChurchProgressBar
                value={localGoalPercent}
                size="md"
                tone={canEdit ? 'emerald' : 'primary'}
                className="mt-4"
              />
            </View>

            <View className="mb-4 rounded-3xl border border-primary-100 bg-primary-50 px-5 py-4 dark:border-primary-900/60 dark:bg-primary-950/30">
              <Text className="text-sm leading-6 text-primary-700 dark:text-primary-200">
                {t('mypage.planChapterLongPressGuide')}
              </Text>
            </View>

            <View className="mb-4 flex-row rounded-2xl bg-gray-200 p-1 dark:bg-gray-800">
              {(['ot', 'nt'] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Button
                    key={tab}
                    disabled={isLoading}
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
              booksToRender.map(({ book, bookIndex, readCount, allRead }) => {
                const isExpanded = expandedBookCode === book.bookCode;
                const chapterRow = goalStatus[bookIndex] ?? [];
                const chapters = isExpanded
                  ? Array.from(
                      { length: book.maxChapter },
                      (_entry, chapterIndex) =>
                        normalizeChapterReadCount(chapterRow[chapterIndex]),
                    )
                  : null;

                const updateChapterCount = (
                  chapterIndex: number,
                  updater: (current: number) => number,
                ) => {
                  setLocalGoalStatus((previous) =>
                    (() => {
                      const next = previous.slice();
                      const currentRow = next[bookIndex] ?? [];
                      const nextRow = Array.from(
                        { length: book.maxChapter },
                        (_entry, rowIndex) => normalizeChapterReadCount(currentRow[rowIndex]),
                      );
                      nextRow[chapterIndex] = Math.max(
                        0,
                        normalizeChapterReadCount(updater(nextRow[chapterIndex] ?? 0)),
                      );
                      next[bookIndex] = nextRow;
                      return next;
                    })(),
                  );
                };

                return (
                  <View
                    key={book.bookCode}
                    className="mb-4 rounded-3xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <Pressable
                        onPress={() =>
                          setExpandedBookCode((current) =>
                            current === book.bookCode ? null : book.bookCode,
                          )
                        }
                        className="flex-1 flex-row items-center justify-between"
                      >
                        <View>
                          <Text className="text-base font-semibold text-gray-900 dark:text-white">
                            {getBookName(book.bookCode, appLanguage)}
                          </Text>
                          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {readCount}/{book.maxChapter}
                          </Text>
                        </View>
                        <View className="ml-3 h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          <Text className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                            {isExpanded ? '-' : '+'}
                          </Text>
                        </View>
                      </Pressable>
                      {canEdit && isExpanded ? (
                        <Button
                          disabled={isLoading}
                          onPress={() =>
                            setLocalGoalStatus((previous) =>
                              (() => {
                                const next = previous.slice();
                                const currentRow = next[bookIndex] ?? [];
                                next[bookIndex] = Array.from(
                                  { length: book.maxChapter },
                                  (_entry, chapterIndex) => {
                                    const current = normalizeChapterReadCount(
                                      currentRow[chapterIndex],
                                    );
                                    if (allRead) return 0;
                                    return isChapterRead(current) ? current : 1;
                                  },
                                );
                                return next;
                              })(),
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

                    {isExpanded ? (
                      <View className="mt-3">
                        {canEdit && chapters ? (
                          <EditableChapterReadCountGrid
                            maxChapter={book.maxChapter}
                            chapters={chapters}
                            disabled={isLoading}
                            onIncrement={(chapterIndex) =>
                              updateChapterCount(chapterIndex, (current) => current + 1)
                            }
                            onDecrement={(chapterIndex) =>
                              updateChapterCount(chapterIndex, (current) => current - 1)
                            }
                            onChapterLongPress={(chapter) =>
                              onChapterLongPress?.(book.bookCode, chapter)
                            }
                          />
                        ) : (
                          <View className="flex-row flex-wrap gap-2">
                            {Array.from({ length: book.maxChapter }, (_entry, chapterIndex) => {
                              const chapterReadCount = normalizeChapterReadCount(
                                chapterRow[chapterIndex],
                              );
                              const read = isChapterRead(chapterReadCount);
                              return (
                                <Pressable
                                  key={`${book.bookCode}-${chapterIndex}`}
                                  onLongPress={() =>
                                    onChapterLongPress?.(book.bookCode, chapterIndex + 1)
                                  }
                                  delayLongPress={CHAPTER_BUTTON_LONG_PRESS_MS}
                                  className={`relative h-10 w-10 items-center justify-center rounded-2xl border ${
                                    read
                                      ? 'border-emerald-500 bg-emerald-500'
                                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                                  }`}
                                >
                                  <Text
                                    className={`text-sm font-semibold ${
                                      read ? 'text-white' : 'text-gray-900 dark:text-white'
                                    }`}
                                  >
                                    {chapterIndex + 1}
                                  </Text>
                                  {chapterReadCount > 0 ? (
                                    <View className="absolute -right-1 -top-1 min-w-[18px] items-center rounded-full bg-primary-500 px-1 py-0.5">
                                      <Text className="text-[10px] font-bold text-white">
                                        {formatReadCountBadge(chapterReadCount)}
                                      </Text>
                                    </View>
                                  ) : null}
                                </Pressable>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>

          {canEdit ? (
            <View className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Button
                disabled={isLoading}
                onPress={async () => {
                  await runWithLoading(async () => {
                    await onSave(goalStatus);
                    onClose();
                  });
                }}
                className={`h-auto rounded-2xl px-4 py-4 ${
                  isLoading ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
                }`}
              >
                {isLoading ? <ButtonSpinner color="#ffffff" /> : null}
                <ButtonText className="font-semibold text-white">{t('mypage.savePlan')}</ButtonText>
              </Button>
            </View>
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
}
