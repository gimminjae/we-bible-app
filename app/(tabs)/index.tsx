import { BibleContent } from '@/components/bible/bible-content';
import { BibleHeader } from '@/components/bible/bible-header';
import { BookChapterDrawer } from '@/components/bible/book-chapter-drawer';
import { ChapterNav } from '@/components/bible/chapter-nav';
import { LanguageDrawer } from '@/components/bible/language-drawer';
import { SettingsDrawer } from '@/components/bible/settings-drawer';
import type { BibleLang } from '@/components/bible/types';
import { useBibleReader } from '@/components/bible/use-bible-reader';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  useEffect(() => {
    scheduleNavHide();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [scheduleNavHide]);

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
          onSwipePrev={bible.goPrevChapter}
          onSwipeNext={bible.goNextChapter}
          onScroll={handleScroll}
        />

        <ChapterNav
          visible={navVisible}
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
          onBackToBookList={() => bible.setPickerStep('book')}
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
          onSecondaryLangChange={(val: string) =>
            bible.setSecondaryLang(val as BibleLang)
          }
          showSecondarySelector={bible.showSecondarySelector}
          onToggleSecondarySelector={() =>
            bible.setShowSecondarySelector((prev) => !prev)
          }
          onCloseSecondarySelector={() => bible.setShowSecondarySelector(false)}
          fontScale={bible.fontScale}
          onFontScaleChange={bible.setFontScale}
          fontSteps={bible.FONT_STEPS}
        />
      </View>
    </SafeAreaView>
  );
}
