import { useAppSettings } from '@/contexts/app-settings';
import type { AppLanguage } from '@/utils/app-settings-storage';

const messages = {
  ko: {
    tabs: {
      bible: '성경',
      mypage: '마이페이지',
      settings: '설정',
    },
    common: {
      back: '뒤로',
      copy: '복사',
    },
    settings: {
      title: '설정',
      systemLanguage: '시스템 언어',
      theme: '테마',
      lightMode: '라이트 모드',
      darkMode: '다크 모드',
      languageSelect: '언어 선택',
    },
    mypage: {
      title: '마이페이지',
      favoritesMenu: '관심 성경 구절 목록',
      memosMenu: '묵상 메모 목록',
      favoritesTitle: '관심 성경 구절',
      memosTitle: '묵상 메모 목록',
      emptyFavorites: '등록된 관심 구절이 없습니다.',
      emptyMemos: '등록된 메모가 없습니다.',
      memoDetailTitle: '메모 상세',
      editMemo: '수정',
      deleteMemo: '삭제',
      memoNotFound: '메모를 찾을 수 없습니다.',
      untitled: '(제목 없음)',
      verseText: '성경 구절',
      content: '내용',
      noContent: '(내용 없음)',
      deleteFavorite: '삭제',
      deleteFavoriteConfirm: '이 관심 구절을 삭제하시겠습니까?',
      goToVerse: '해당 성경으로 이동하시겠습니까?',
      goToVerseConfirm: '이동',
      goToVerseCancel: '취소',
      deleteMemoConfirm: '이 메모를 삭제하시겠습니까?',
      deleteConfirm: '삭제',
      deleteCancel: '취소',
      prayersMenu: '기도 목록',
      prayersTitle: '기도 목록',
      emptyPrayers: '등록된 기도가 없습니다.',
      addPrayer: '기도 등록',
      prayerDetailTitle: '기도 상세',
      prayerNotFound: '기도를 찾을 수 없습니다.',
      prayerRequester: '기도 부탁자',
      prayerTarget: '기도 대상자',
      prayerContent: '기도 내용',
      prayerContentPlaceholder: '기도 내용을 입력하세요',
      deletePrayerConfirm: '이 기도를 삭제하시겠습니까?',
      deletePrayerContentConfirm: '이 기도 내용을 삭제하시겠습니까?',
      editPrayer: '수정',
      deletePrayer: '삭제',
    },
    prayerDrawer: {
      addTitle: '기도 등록',
      editTitle: '기도 수정',
      save: '저장',
      cancel: '취소',
      requesterLabel: '기도 부탁자',
      requesterPlaceholder: '이름을 입력하세요',
      targetLabel: '기도 대상자',
      targetPlaceholder: '이름을 입력하세요',
      contentLabel: '기도 내용',
      contentPlaceholder: '기도 내용을 입력하세요',
      addContent: '내용 추가',
    },
    memoDrawer: {
      title: '묵상 메모',
      editTitle: '메모 수정',
      save: '저장',
      cancel: '취소',
      titleLabel: '제목',
      titlePlaceholder: '메모 제목 (선택)',
      verseTextLabel: '성경 구절',
      contentLabel: '내용',
      contentPlaceholder: '묵상 내용을 입력하세요',
    },
    bibleDrawer: {
      oldTestament: '구약',
      newTestament: '신약',
      category: {
        pentateuch: '모세오경',
        history: '역사서',
        poetry: '시가서',
        prophecy: '예언서',
        gospels: '복음서',
        epistles: '서신서',
      },
    },
  },
  en: {
    tabs: {
      bible: 'Bible',
      mypage: 'My Page',
      settings: 'Settings',
    },
    common: {
      back: 'Back',
      copy: 'Copy',
    },
    settings: {
      title: 'Settings',
      systemLanguage: 'System language',
      theme: 'Theme',
      lightMode: 'Light mode',
      darkMode: 'Dark mode',
      languageSelect: 'Select language',
    },
    mypage: {
      title: 'My Page',
      favoritesMenu: 'Favorite verses',
      memosMenu: 'Meditation memos',
      favoritesTitle: 'Favorite verses',
      memosTitle: 'Meditation memos',
      emptyFavorites: 'No favorite verses yet.',
      emptyMemos: 'No memos yet.',
      memoDetailTitle: 'Memo detail',
      editMemo: 'Edit',
      deleteMemo: 'Delete',
      memoNotFound: 'Memo not found.',
      untitled: '(Untitled)',
      verseText: 'Bible verses',
      content: 'Content',
      noContent: '(No content)',
      deleteFavorite: 'Delete',
      deleteFavoriteConfirm: 'Are you sure you want to remove this verse from favorites?',
      goToVerse: 'Would you like to go to this Bible verse?',
      goToVerseConfirm: 'Go',
      goToVerseCancel: 'Cancel',
      deleteMemoConfirm: 'Are you sure you want to delete this memo?',
      deleteConfirm: 'Delete',
      deleteCancel: 'Cancel',
      prayersMenu: 'Prayer list',
      prayersTitle: 'Prayer list',
      emptyPrayers: 'No prayers yet.',
      addPrayer: 'Add prayer',
      prayerDetailTitle: 'Prayer detail',
      prayerNotFound: 'Prayer not found.',
      prayerRequester: 'Requester',
      prayerTarget: 'Prayer target',
      prayerContent: 'Prayer content',
      prayerContentPlaceholder: 'Enter prayer content',
      deletePrayerConfirm: 'Are you sure you want to delete this prayer?',
      deletePrayerContentConfirm: 'Are you sure you want to delete this prayer content?',
      editPrayer: 'Edit',
      deletePrayer: 'Delete',
    },
    prayerDrawer: {
      addTitle: 'Add prayer',
      editTitle: 'Edit prayer',
      save: 'Save',
      cancel: 'Cancel',
      requesterLabel: 'Requester',
      requesterPlaceholder: 'Enter name',
      targetLabel: 'Prayer target',
      targetPlaceholder: 'Enter name',
      contentLabel: 'Prayer content',
      contentPlaceholder: 'Enter prayer content',
      addContent: 'Add content',
    },
    memoDrawer: {
      title: 'Meditation Memo',
      editTitle: 'Edit Memo',
      save: 'Save',
      cancel: 'Cancel',
      titleLabel: 'Title',
      titlePlaceholder: 'Memo title (optional)',
      verseTextLabel: 'Bible verses',
      contentLabel: 'Content',
      contentPlaceholder: 'Write your meditation notes',
    },
    bibleDrawer: {
      oldTestament: 'Old Testament',
      newTestament: 'New Testament',
      category: {
        pentateuch: 'Pentateuch',
        history: 'Historical Books',
        poetry: 'Poetry/Wisdom',
        prophecy: 'Prophetic Books',
        gospels: 'Gospels',
        epistles: 'Epistles',
      },
    },
  },
} as const;

function getByPath(obj: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
  return typeof value === 'string' ? value : undefined;
}

export function t(lang: AppLanguage, key: string): string {
  return getByPath(messages[lang], key) ?? getByPath(messages.ko, key) ?? key;
}

export function useI18n() {
  const { appLanguage } = useAppSettings();
  return {
    t: (key: string) => t(appLanguage, key),
  };
}

