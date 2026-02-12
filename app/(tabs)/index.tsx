import { BibleContent } from '@/components/bible/bible-content';
import { BibleHeader } from '@/components/bible/bible-header';
import { BookChapterDrawer } from '@/components/bible/book-chapter-drawer';
import { ChapterNav } from '@/components/bible/chapter-nav';
import { LanguageDrawer } from '@/components/bible/language-drawer';
import { MemoDrawer } from '@/components/bible/memo-drawer';
import { SettingsDrawer } from '@/components/bible/settings-drawer';
import type { BibleLang } from '@/components/bible/types';
import { useBibleReader } from '@/components/bible/use-bible-reader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const COPY_BUTTON_FADE_DURATION = 300;

const NAV_HIDE_DELAY_MS = 3000;

export default function HomeScreen() {
  const bible = useBibleReader();
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
      <View className="flex-1">
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
          onVersePress={bible.toggleVerseSelection}
          onSwipePrev={bible.goPrevChapter}
          onSwipeNext={bible.goNextChapter}
          onScroll={handleScroll}
        />

        <Animated.View
          pointerEvents={copyButtonVisible ? 'box-none' : 'none'}
          style={copyButtonStyle}
          className="absolute bottom-6 left-0 right-0 flex-row items-center justify-center gap-3"
        >
          <Pressable
            onPress={
              bible.allSelectedAreFavorites
                ? bible.removeSelectedFromFavorites
                : bible.addSelectedToFavorites
            }
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center active:opacity-80"
          >
            <IconSymbol
              name={bible.allSelectedAreFavorites ? 'heart.fill' : 'heart'}
              size={24}
              color={bible.allSelectedAreFavorites ? '#ec4899' : '#6b7280'}
            />
          </Pressable>
          <Pressable
            onPress={bible.openMemoDrawer}
            className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 items-center justify-center active:opacity-80"
          >
            <IconSymbol name="note.text" size={24} color="#b45309" />
          </Pressable>
          <Pressable
            onPress={bible.copySelectedVerses}
            className="bg-primary-500 px-6 py-3 rounded-full shadow-lg active:opacity-90"
          >
            <Text className="text-white font-semibold">복사</Text>
          </Pressable>
        </Animated.View>

        <MemoDrawer
          isOpen={bible.showMemoDrawer}
          onClose={bible.closeMemoDrawer}
          initialVerseText={bible.memoInitialContent}
          onSave={bible.saveMemo}
        />

        <ChapterNav
          visible={navVisible && !copyButtonVisible}
          onPrev={bible.goPrevChapter}
          onNext={bible.goNextChapter}
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
