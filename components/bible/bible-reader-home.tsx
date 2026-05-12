import { BibleContent } from '@/components/bible/bible-content';
import { BibleHeader } from '@/components/bible/bible-header';
import { BookChapterDrawer } from '@/components/bible/book-chapter-drawer';
import { ChapterNav } from '@/components/bible/chapter-nav';
import { LanguageDrawer } from '@/components/bible/language-drawer';
import { MemoDrawer } from '@/components/bible/memo-drawer';
import { Button, ButtonText } from '@/components/ui/button';
import { SettingsDrawer } from '@/components/bible/settings-drawer';
import type { BibleLang } from '@/components/bible/types';
import { useBibleReader } from '@/components/bible/use-bible-reader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/utils/i18n';
import {
  clearPendingBibleNavigation,
  getPendingBibleNavigation,
} from '@/utils/bible-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const COPY_BUTTON_FADE_DURATION = 300;
const NAV_HIDE_DELAY_MS = 3000;

export function BibleReaderHome() {
  const db = useSQLiteContext();
  const bible = useBibleReader();
  const { goToBookChapter } = bible;
  const { t } = useI18n();
  const { scale, moderateScale, isTablet, readingMaxWidth } = useResponsive();
  const actionCircleSize = isTablet ? 44 : scale(48);
  const floatingBottom = isTablet ? scale(20) : scale(24);
  const floatingGap = isTablet ? scale(10) : scale(12);

  useFocusEffect(
    useCallback(() => {
      getPendingBibleNavigation(db).then((nav) => {
        if (nav) {
          goToBookChapter(nav.bookCode, nav.chapter);
          clearPendingBibleNavigation(db);
        }
      });
    }, [db, goToBookChapter])
  );

  const [navVisible, setNavVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNavHide = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setNavVisible(false), NAV_HIDE_DELAY_MS);
  }, []);

  const handleScroll = useCallback(() => {
    setNavVisible(true);
    scheduleNavHide();
  }, [scheduleNavHide]);

  const scheduleNavHideOnMount = useCallback(() => {
    scheduleNavHide();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [scheduleNavHide]);

  const copyButtonVisible = bible.selectedVerseNumbers.length > 0;
  const copyButtonOpacity = useSharedValue(copyButtonVisible ? 1 : 0);
  const syncCopyButtonOpacityToVisible = useCallback(() => {
    copyButtonOpacity.value = withTiming(
      copyButtonVisible ? 1 : 0,
      { duration: COPY_BUTTON_FADE_DURATION }
    );
  }, [copyButtonVisible, copyButtonOpacity]);

  useEffect(scheduleNavHideOnMount, [scheduleNavHideOnMount]);
  useEffect(syncCopyButtonOpacityToVisible, [syncCopyButtonOpacityToVisible]);

  const handleBackToBookList = useCallback(() => {
    bible.setPickerStep('book');
  }, [bible]);

  const handleSecondaryLangChange = useCallback(
    (val: string) => {
      bible.setSecondaryLang(val as BibleLang);
    },
    [bible]
  );

  const handleToggleSecondarySelector = useCallback(() => {
    bible.setShowSecondarySelector((prev) => !prev);
  }, [bible]);

  const handleCloseSecondarySelector = useCallback(() => {
    bible.setShowSecondarySelector(false);
  }, [bible]);

  const copyButtonStyle = useAnimatedStyle(() => ({
    opacity: copyButtonOpacity.value,
  }));

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View className="flex-1 items-center">
        <View className="flex-1" style={{ width: '100%', maxWidth: readingMaxWidth }}>
          <BibleHeader
            bookName={bible.bookName}
            chapter={bible.chapter}
            langLabel={bible.langLabel}
            onOpenBookPicker={bible.openBookPicker}
            onOpenLangPicker={bible.openLangPicker}
            onOpenSettings={bible.openSettings}
          />

          <BibleContent
            loading={bible.loading}
            error={bible.error}
            verses={bible.verses}
            dualLang={bible.dualLang}
            fontScale={bible.fontScale}
            selectedVerseNumbers={bible.selectedVerseNumbers}
            favoriteVerseNumbers={bible.favoriteVerseNumbers}
            memoVerseNumbers={bible.memoVerseNumbers}
            scrollToTopTrigger={`${bible.bookCode}:${bible.chapter}`}
            onVersePress={bible.toggleVerseSelection}
            onSwipePrev={bible.goPrevChapter}
            onSwipeNext={bible.goNextChapter}
            onScroll={handleScroll}
          />

          <Animated.View
            pointerEvents={copyButtonVisible ? 'box-none' : 'none'}
            style={[
              copyButtonStyle,
              {
                position: 'absolute',
                bottom: floatingBottom,
                left: 0,
                right: 0,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: floatingGap,
              },
            ]}
          >
            <Pressable
              onPress={
                bible.allSelectedAreFavorites
                  ? bible.removeSelectedFromFavorites
                  : bible.addSelectedToFavorites
              }
              disabled={!bible.canUseAccountDataFeatures}
              className={`rounded-full items-center justify-center ${
                bible.canUseAccountDataFeatures
                  ? 'bg-gray-200 dark:bg-gray-700 active:opacity-80'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
              style={{ width: actionCircleSize, height: actionCircleSize }}
            >
              <IconSymbol
                name={bible.allSelectedAreFavorites ? 'heart.fill' : 'heart'}
                size={moderateScale(24)}
                color={
                  bible.canUseAccountDataFeatures
                    ? bible.allSelectedAreFavorites
                      ? '#ec4899'
                      : '#6b7280'
                    : '#9ca3af'
                }
              />
            </Pressable>
            <Pressable
              onPress={bible.openMemoDrawer}
              disabled={!bible.canUseAccountDataFeatures}
              className={`rounded-full items-center justify-center ${
                bible.canUseAccountDataFeatures
                  ? 'bg-amber-100 dark:bg-amber-900/40 active:opacity-80'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
              style={{ width: actionCircleSize, height: actionCircleSize }}
            >
              <IconSymbol
                name="note.text"
                size={moderateScale(24)}
                color={bible.canUseAccountDataFeatures ? '#b45309' : '#9ca3af'}
              />
            </Pressable>
            <Button
              onPress={bible.copySelectedVerses}
              className="h-auto rounded-full bg-primary-500 shadow-lg active:opacity-90"
              style={{
                paddingHorizontal: isTablet ? scale(18) : scale(24),
                paddingVertical: isTablet ? scale(10) : scale(12),
              }}
            >
              <ButtonText
                style={{ fontSize: moderateScale(16) }}
                className="text-white font-semibold dark:text-gray-900"
              >
                {t('common.copy')}
              </ButtonText>
            </Button>
          </Animated.View>

          <ChapterNav
            visible={navVisible && !copyButtonVisible}
            onPrev={bible.goPrevChapter}
            onNext={bible.goNextChapter}
          />
        </View>

        <MemoDrawer
          isOpen={bible.showMemoDrawer}
          onClose={bible.closeMemoDrawer}
          initialVerseText={bible.memoInitialContent}
          onSave={bible.saveMemo}
        />

        <BookChapterDrawer
          isOpen={bible.showBookDrawer}
          onClose={bible.closeBookDrawer}
          pickerStep={bible.pickerStep}
          bookName={bible.bookName}
          maxChapter={bible.maxChapter}
          books={bible.BOOKS}
          primaryLang={bible.primaryLang}
          getBookName={bible.getBookName}
          onSelectBook={bible.selectBook}
          onSelectChapter={bible.selectChapter}
          onBackToBookList={handleBackToBookList}
        />

        <LanguageDrawer
          isOpen={bible.showLangDrawer}
          onClose={bible.closeLangDrawer}
          options={bible.LANG_OPTIONS}
          onSelect={bible.onSelectPrimaryLang}
        />

        <SettingsDrawer
          isOpen={bible.showSettingsDrawer}
          onClose={bible.closeSettingsDrawer}
          dualLang={bible.dualLang}
          onDualLangChange={bible.setDualLang}
          secondaryLang={bible.secondaryLang}
          versions={bible.versions}
          primaryLang={bible.primaryLang}
          onSecondaryLangChange={handleSecondaryLangChange}
          showSecondarySelector={bible.showSecondarySelector}
          onToggleSecondarySelector={handleToggleSecondarySelector}
          onCloseSecondarySelector={handleCloseSecondarySelector}
          fontScale={bible.fontScale}
          onFontScaleChange={bible.setFontScale}
          fontSteps={bible.FONT_STEPS}
        />
      </View>
    </SafeAreaView>
  );
}
