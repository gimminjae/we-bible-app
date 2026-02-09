import { BibleInfo } from "../domain/bible/bible"
import { api } from "./api"

export const bibleInfos = [
  {
    bookCode: "zeroIndex",
    bookSeq: 0,
    bookName: {
      en: "ZeroIndex",
      ko: "",
      de: "",
    },
    maxChapter: 0,
    bookCodeByLang: {
      de: "",
    },
  },
  {
    bookCode: "genesis",
    bookSeq: 1,
    bookName: {
      en: "Genesis",
      ko: "창세기",
      de: "1.Mose",
    },
    maxChapter: 50,
    bookCodeByLang: {
      de: "1.mose",
    },
  },
  {
    bookCode: "exodus",
    bookSeq: 2,
    bookName: {
      en: "Exodus",
      ko: "출애굽기",
      de: "2.Mose",
    },
    maxChapter: 40,
    bookCodeByLang: {
      de: "2.mose",
    },
  },
  {
    bookCode: "leviticus",
    bookSeq: 3,
    bookName: {
      en: "Leviticus",
      ko: "레위기",
      de: "3.Mose",
    },
    maxChapter: 27,
    bookCodeByLang: {
      de: "3.mose",
    },
  },
  {
    bookCode: "numbers",
    bookSeq: 4,
    bookName: {
      en: "Numbers",
      ko: "민수기",
      de: "4.Mose",
    },
    maxChapter: 36,
    bookCodeByLang: {
      de: "4.mose",
    },
  },
  {
    bookCode: "deuteronomy",
    bookSeq: 5,
    bookName: {
      en: "Deuteronomy",
      ko: "신명기",
      de: "5.Mose",
    },
    maxChapter: 34,
    bookCodeByLang: {
      de: "5.mose",
    },
  },
  {
    bookCode: "joshua",
    bookSeq: 6,
    bookName: {
      en: "Joshua",
      ko: "여호수아",
      de: "Josua",
    },
    maxChapter: 24,
    bookCodeByLang: {
      de: "josua",
    },
  },
  {
    bookCode: "judges",
    bookSeq: 7,
    bookName: {
      en: "Judges",
      ko: "사사기",
      de: "Richter",
    },
    maxChapter: 21,
    bookCodeByLang: {
      de: "richter",
    },
  },
  {
    bookCode: "ruth",
    bookSeq: 8,
    bookName: {
      en: "Ruth",
      ko: "룻기",
      de: "Ruth",
    },
    maxChapter: 4,
    bookCodeByLang: {
      de: "ruth",
    },
  },
  {
    bookCode: "1samuel",
    bookSeq: 9,
    bookName: {
      en: "1 Samuel",
      ko: "사무엘상",
      de: "1.Samuel",
    },
    maxChapter: 31,
    bookCodeByLang: {
      de: "1.samuel",
    },
  },
  {
    bookCode: "2samuel",
    bookSeq: 10,
    bookName: {
      en: "2 Samuel",
      ko: "사무엘하",
      de: "2.Samuel",
    },
    maxChapter: 24,
    bookCodeByLang: {
      de: "2.samuel",
    },
  },
  {
    bookCode: "1kings",
    bookSeq: 11,
    bookName: {
      en: "1 Kings",
      ko: "열왕기상",
      de: "1.Könige",
    },
    maxChapter: 22,
    bookCodeByLang: {
      de: "1.könige",
    },
  },
  {
    bookCode: "2kings",
    bookSeq: 12,
    bookName: {
      en: "2 Kings",
      ko: "열왕기하",
      de: "2.Könige",
    },
    maxChapter: 25,
    bookCodeByLang: {
      de: "2.könige",
    },
  },
  {
    bookCode: "1chronicles",
    bookSeq: 13,
    bookName: {
      en: "1 Chronicles",
      ko: "역대상",
      de: "1.Chronik",
    },
    maxChapter: 29,
    bookCodeByLang: {
      de: "1.chronik",
    },
  },
  {
    bookCode: "2chronicles",
    bookSeq: 14,
    bookName: {
      en: "2 Chronicles",
      ko: "역대하",
      de: "2.Chronik",
    },
    maxChapter: 36,
    bookCodeByLang: {
      de: "2.chronik",
    },
  },
  {
    bookCode: "ezra",
    bookSeq: 15,
    bookName: {
      en: "Ezra",
      ko: "에스라",
      de: "Esra",
    },
    maxChapter: 10,
    bookCodeByLang: {
      de: "esra",
    },
  },
  {
    bookCode: "nehemiah",
    bookSeq: 16,
    bookName: {
      en: "Nehemiah",
      ko: "느헤미야",
      de: "Nehemia",
    },
    maxChapter: 13,
    bookCodeByLang: {
      de: "nehemia",
    },
  },
  {
    bookCode: "esther",
    bookSeq: 17,
    bookName: {
      en: "Esther",
      ko: "에스더",
      de: "Esther",
    },
    maxChapter: 10,
    bookCodeByLang: {
      de: "esther",
    },
  },
  {
    bookCode: "job",
    bookSeq: 18,
    bookName: {
      en: "Job",
      ko: "욥기",
      de: "Hiob",
    },
    maxChapter: 42,
    bookCodeByLang: {
      de: "hiob",
    },
  },
  {
    bookCode: "psalms",
    bookSeq: 19,
    bookName: {
      en: "Psalms",
      ko: "시편",
      de: "Psalmen",
    },
    maxChapter: 150,
    bookCodeByLang: {
      de: "psalmen",
    },
  },
  {
    bookCode: "proverbs",
    bookSeq: 20,
    bookName: {
      en: "Proverbs",
      ko: "잠언",
      de: "Sprüche",
    },
    maxChapter: 31,
    bookCodeByLang: {
      de: "sprüche",
    },
  },
  {
    bookCode: "ecclesiastes",
    bookSeq: 21,
    bookName: {
      en: "Ecclesiastes",
      ko: "전도서",
      de: "Prediger",
    },
    maxChapter: 12,
    bookCodeByLang: {
      de: "prediger",
    },
  },
  {
    bookCode: "songofsolomon",
    bookSeq: 22,
    bookName: {
      en: "Song of Songs",
      ko: "아가",
      de: "Hohelied",
    },
    maxChapter: 8,
    bookCodeByLang: {
      de: "hohelied",
    },
  },
  {
    bookCode: "isaiah",
    bookSeq: 23,
    bookName: {
      en: "Isaiah",
      ko: "이사야",
      de: "Jesaja",
    },
    maxChapter: 66,
    bookCodeByLang: {
      de: "jesaja",
    },
  },
  {
    bookCode: "jeremiah",
    bookSeq: 24,
    bookName: {
      en: "Jeremiah",
      ko: "예레미야",
      de: "Jeremia",
    },
    maxChapter: 52,
    bookCodeByLang: {
      de: "jeremia",
    },
  },
  {
    bookCode: "lamentations",
    bookSeq: 25,
    bookName: {
      en: "Lamentations",
      ko: "예레미야애가",
      de: "Klagelieder",
    },
    maxChapter: 5,
    bookCodeByLang: {
      de: "klagelieder",
    },
  },
  {
    bookCode: "ezekiel",
    bookSeq: 26,
    bookName: {
      en: "Ezekiel",
      ko: "에스겔",
      de: "Hesekiel",
    },
    maxChapter: 48,
    bookCodeByLang: {
      de: "hesekiel",
    },
  },
  {
    bookCode: "daniel",
    bookSeq: 27,
    bookName: {
      en: "Daniel",
      ko: "다니엘",
      de: "Daniel",
    },
    maxChapter: 12,
    bookCodeByLang: {
      de: "daniel",
    },
  },
  {
    bookCode: "hosea",
    bookSeq: 28,
    bookName: {
      en: "Hosea",
      ko: "호세아",
      de: "Hosea",
    },
    maxChapter: 14,
    bookCodeByLang: {
      de: "hosea",
    },
  },
  {
    bookCode: "joel",
    bookSeq: 29,
    bookName: {
      en: "Joel",
      ko: "요엘",
      de: "Joel",
    },
    maxChapter: 3,
    bookCodeByLang: {
      de: "joel",
    },
  },
  {
    bookCode: "amos",
    bookSeq: 30,
    bookName: {
      en: "Amos",
      ko: "아모스",
      de: "Amos",
    },
    maxChapter: 9,
    bookCodeByLang: {
      de: "amos",
    },
  },
  {
    bookCode: "obadiah",
    bookSeq: 31,
    bookName: {
      en: "Obadiah",
      ko: "오바댜",
      de: "Obadja",
    },
    maxChapter: 1,
    bookCodeByLang: {
      de: "obadja",
    },
  },
  {
    bookCode: "jonah",
    bookSeq: 32,
    bookName: {
      en: "Jonah",
      ko: "요나",
      de: "Jona",
    },
    maxChapter: 4,
    bookCodeByLang: {
      de: "jona",
    },
  },
  {
    bookCode: "micah",
    bookSeq: 33,
    bookName: {
      en: "Micah",
      ko: "미가",
      de: "Micha",
    },
    maxChapter: 7,
    bookCodeByLang: {
      de: "micha",
    },
  },
  {
    bookCode: "nahum",
    bookSeq: 34,
    bookName: {
      en: "Nahum",
      ko: "나훔",
      de: "Nahum",
    },
    maxChapter: 3,
    bookCodeByLang: {
      de: "nahum",
    },
  },
  {
    bookCode: "habakkuk",
    bookSeq: 35,
    bookName: {
      en: "Habakkuk",
      ko: "하박국",
      de: "Habakuk",
    },
    maxChapter: 3,
    bookCodeByLang: {
      de: "habakuk",
    },
  },
  {
    bookCode: "zephaniah",
    bookSeq: 36,
    bookName: {
      en: "Zephaniah",
      ko: "스바냐",
      de: "Zephanja",
    },
    maxChapter: 3,
    bookCodeByLang: {
      de: "zephanja",
    },
  },
  {
    bookCode: "haggai",
    bookSeq: 37,
    bookName: {
      en: "Haggai",
      ko: "학개",
      de: "Haggai",
    },
    maxChapter: 2,
    bookCodeByLang: {
      de: "haggai",
    },
  },
  {
    bookCode: "zechariah",
    bookSeq: 38,
    bookName: {
      en: "Zechariah",
      ko: "스가랴",
      de: "Sacharja",
    },
    maxChapter: 14,
    bookCodeByLang: {
      de: "sacharja",
    },
  },
  {
    bookCode: "malachi",
    bookSeq: 39,
    bookName: {
      en: "Malachi",
      ko: "말라기",
      de: "Maleachi",
    },
    maxChapter: 4,
    bookCodeByLang: {
      de: "maleachi",
    },
  },
  {
    bookCode: "matthew",
    bookSeq: 40,
    bookName: {
      en: "Matthew",
      ko: "마태복음",
      de: "Matthäus",
    },
    maxChapter: 28,
    bookCodeByLang: {
      de: "matthäus",
    },
  },
  {
    bookCode: "mark",
    bookSeq: 41,
    bookName: {
      en: "Mark",
      ko: "마가복음",
      de: "Markus",
    },
    maxChapter: 16,
    bookCodeByLang: {
      de: "markus",
    },
  },
  {
    bookCode: "luke",
    bookSeq: 42,
    bookName: {
      en: "Luke",
      ko: "누가복음",
      de: "Lukas",
    },
    maxChapter: 24,
    bookCodeByLang: {
      de: "lukas",
    },
  },
  {
    bookCode: "john",
    bookSeq: 43,
    bookName: {
      en: "John",
      ko: "요한복음",
      de: "Johannes",
    },
    maxChapter: 21,
    bookCodeByLang: {
      de: "johannes",
    },
  },
  {
    bookCode: "acts",
    bookSeq: 44,
    bookName: {
      en: "Acts",
      ko: "사도행전",
      de: "Apostelgeschichte",
    },
    maxChapter: 28,
    bookCodeByLang: {
      de: "apostelgeschichte",
    },
  },
  {
    bookCode: "romans",
    bookSeq: 45,
    bookName: {
      en: "Romans",
      ko: "로마서",
      de: "Römer",
    },
    maxChapter: 16,
    bookCodeByLang: {
      de: "römer",
    },
  },
  {
    bookCode: "1corinthians",
    bookSeq: 46,
    bookName: {
      en: "1 Corinthians",
      ko: "고린도전서",
      de: "1.Korinther",
    },
    maxChapter: 16,
    bookCodeByLang: {
      de: "1.korinther",
    },
  },
  {
    bookCode: "2corinthians",
    bookSeq: 47,
    bookName: {
      en: "2 Corinthians",
      ko: "고린도후서",
      de: "2.Korinther",
    },
    maxChapter: 13,
    bookCodeByLang: {
      de: "2.korinther",
    },
  },
  {
    bookCode: "galatians",
    bookSeq: 48,
    bookName: {
      en: "Galatians",
      ko: "갈라디아서",
      de: "Galater",
    },
    maxChapter: 6,
    bookCodeByLang: {
      de: "galater",
    },
  },
  {
    bookCode: "ephesians",
    bookSeq: 49,
    bookName: {
      en: "Ephesians",
      ko: "에베소서",
      de: "Epheser",
    },
    maxChapter: 6,
    bookCodeByLang: {
      de: "epheser",
    },
  },
  {
    bookCode: "philippians",
    bookSeq: 50,
    bookName: {
      en: "Philippians",
      ko: "빌립보서",
      de: "Philipper",
    },
    maxChapter: 4,
    bookCodeByLang: {
      de: "philipper",
    },
  },
  {
    bookCode: "colossians",
    bookSeq: 51,
    bookName: {
      en: "Colossians",
      ko: "골로새서",
      de: "Kolosser",
    },
    maxChapter: 4,
    bookCodeByLang: {
      de: "kolosser",
    },
  },
  {
    bookCode: "1thessalonians",
    bookSeq: 52,
    bookName: {
      en: "1 Thessalonians",
      ko: "데살로니가전서",
      de: "1.Thessalonicher",
    },
    maxChapter: 5,
    bookCodeByLang: {
      de: "1.thessalonicher",
    },
  },
  {
    bookCode: "2thessalonians",
    bookSeq: 53,
    bookName: {
      en: "2 Thessalonians",
      ko: "데살로니가후서",
      de: "2.Thessalonicher",
    },
    maxChapter: 3,
    bookCodeByLang: {
      de: "2.thessalonicher",
    },
  },
  {
    bookCode: "1timothy",
    bookSeq: 54,
    bookName: {
      en: "1 Timothy",
      ko: "디모데전서",
      de: "1.Timotheus",
    },
    maxChapter: 6,
    bookCodeByLang: {
      de: "1.timotheus",
    },
  },
  {
    bookCode: "2timothy",
    bookSeq: 55,
    bookName: {
      en: "2 Timothy",
      ko: "디모데후서",
      de: "2.Timotheus",
    },
    maxChapter: 4,
    bookCodeByLang: {
      de: "2.timotheus",
    },
  },
  {
    bookCode: "titus",
    bookSeq: 56,
    bookName: {
      en: "Titus",
      ko: "디도서",
      de: "Titus",
    },
    maxChapter: 3,
    bookCodeByLang: {
      de: "titus",
    },
  },
  {
    bookCode: "philemon",
    bookSeq: 57,
    bookName: {
      en: "Philemon",
      ko: "빌레몬서",
      de: "Philemon",
    },
    maxChapter: 1,
    bookCodeByLang: {
      de: "philemon",
    },
  },
  {
    bookCode: "hebrews",
    bookSeq: 58,
    bookName: {
      en: "Hebrews",
      ko: "히브리서",
      de: "Hebräer",
    },
    maxChapter: 13,
    bookCodeByLang: {
      de: "hebräer",
    },
  },
  {
    bookCode: "james",
    bookSeq: 59,
    bookName: {
      en: "James",
      ko: "야고보서",
      de: "Jakobus",
    },
    maxChapter: 5,
    bookCodeByLang: {
      de: "jakobus",
    },
  },
  {
    bookCode: "1peter",
    bookSeq: 60,
    bookName: {
      en: "1 Peter",
      ko: "베드로전서",
      de: "1.Petrus",
    },
    maxChapter: 5,
    bookCodeByLang: {
      de: "1.petrus",
    },
  },
  {
    bookCode: "2peter",
    bookSeq: 61,
    bookName: {
      en: "2 Peter",
      ko: "베드로후서",
      de: "2.Petrus",
    },
    maxChapter: 3,
    bookCodeByLang: {
      de: "2.petrus",
    },
  },
  {
    bookCode: "1john",
    bookSeq: 62,
    bookName: {
      en: "1 John",
      ko: "요한일서",
      de: "1.Johannes",
    },
    maxChapter: 5,
    bookCodeByLang: {
      de: "1.johannes",
    },
  },
  {
    bookCode: "2john",
    bookSeq: 63,
    bookName: {
      en: "2 John",
      ko: "요한이서",
      de: "2.Johannes",
    },
    maxChapter: 1,
    bookCodeByLang: {
      de: "2.johannes",
    },
  },
  {
    bookCode: "3john",
    bookSeq: 64,
    bookName: {
      en: "3 John",
      ko: "요한삼서",
      de: "3.Johannes",
    },
    maxChapter: 1,
    bookCodeByLang: {
      de: "3.johannes",
    },
  },
  {
    bookCode: "jude",
    bookSeq: 65,
    bookName: {
      en: "Jude",
      ko: "유다서",
      de: "Judas",
    },
    maxChapter: 1,
    bookCodeByLang: {
      de: "judas",
    },
  },
  {
    bookCode: "revelation",
    bookSeq: 66,
    bookName: {
      en: "Revelation",
      ko: "요한계시록",
      de: "Offenbarung",
    },
    maxChapter: 22,
    bookCodeByLang: {
      de: "offenbarung",
    },
  },
]

export const kjvBibleInfo = [
  { bookName: "zeroIndex", bookSeq: 0 },
  { bookName: "genesis", bookSeq: 1 },
  { bookName: "exodus", bookSeq: 2 },
  { bookName: "leviticus", bookSeq: 3 },
  { bookName: "numbers", bookSeq: 4 },
  { bookName: "deuteronomy", bookSeq: 5 },
  { bookName: "joshua", bookSeq: 6 },
  { bookName: "judges", bookSeq: 7 },
  { bookName: "ruth", bookSeq: 8 },
  { bookName: "1samuel", bookSeq: 9 },
  { bookName: "2samuel", bookSeq: 10 },
  { bookName: "1kings", bookSeq: 11 },
  { bookName: "2kings", bookSeq: 12 },
  { bookName: "1chronicles", bookSeq: 13 },
  { bookName: "2chronicles", bookSeq: 14 },
  { bookName: "ezra", bookSeq: 15 },
  { bookName: "nehemiah", bookSeq: 16 },
  { bookName: "esther", bookSeq: 17 },
  { bookName: "job", bookSeq: 18 },
  { bookName: "psalms", bookSeq: 19 },
  { bookName: "proverbs", bookSeq: 20 },
  { bookName: "ecclesiastes", bookSeq: 21 },
  { bookName: "songofsolomon", bookSeq: 22 },
  { bookName: "isaiah", bookSeq: 23 },
  { bookName: "jeremiah", bookSeq: 24 },
  { bookName: "lamentations", bookSeq: 25 },
  { bookName: "ezekiel", bookSeq: 26 },
  { bookName: "daniel", bookSeq: 27 },
  { bookName: "hosea", bookSeq: 28 },
  { bookName: "joel", bookSeq: 29 },
  { bookName: "amos", bookSeq: 30 },
  { bookName: "obadiah", bookSeq: 31 },
  { bookName: "jonah", bookSeq: 32 },
  { bookName: "micah", bookSeq: 33 },
  { bookName: "nahum", bookSeq: 34 },
  { bookName: "habakkuk", bookSeq: 35 },
  { bookName: "zephaniah", bookSeq: 36 },
  { bookName: "haggai", bookSeq: 37 },
  { bookName: "zechariah", bookSeq: 38 },
  { bookName: "malachi", bookSeq: 39 },
  { bookName: "matthew", bookSeq: 40 },
  { bookName: "mark", bookSeq: 41 },
  { bookName: "luke", bookSeq: 42 },
  { bookName: "john", bookSeq: 43 },
  { bookName: "acts", bookSeq: 44 },
  { bookName: "romans", bookSeq: 45 },
  { bookName: "1corinthians", bookSeq: 46 },
  { bookName: "2corinthians", bookSeq: 47 },
  { bookName: "galatians", bookSeq: 48 },
  { bookName: "ephesians", bookSeq: 49 },
  { bookName: "philippians", bookSeq: 50 },
  { bookName: "colossians", bookSeq: 51 },
  { bookName: "1thessalonians", bookSeq: 52 },
  { bookName: "2thessalonians", bookSeq: 53 },
  { bookName: "1timothy", bookSeq: 54 },
  { bookName: "2timothy", bookSeq: 55 },
  { bookName: "titus", bookSeq: 56 },
  { bookName: "philemon", bookSeq: 57 },
  { bookName: "hebrews", bookSeq: 58 },
  { bookName: "james", bookSeq: 59 },
  { bookName: "1peter", bookSeq: 60 },
  { bookName: "2peter", bookSeq: 61 },
  { bookName: "1john", bookSeq: 62 },
  { bookName: "2john", bookSeq: 63 },
  { bookName: "3john", bookSeq: 64 },
  { bookName: "jude", bookSeq: 65 },
  { bookName: "revelation", bookSeq: 66 },
  { bookName: "1esdras", bookSeq: 67 },
  { bookName: "2esdras", bookSeq: 68 },
  { bookName: "tobit", bookSeq: 69 },
  { bookName: "judith", bookSeq: 70 },
  { bookName: "wisdom", bookSeq: 71 },
  { bookName: "ecclesiasticus", bookSeq: 72 },
  { bookName: "baruch", bookSeq: 73 },
  { bookName: "belandthedragon", bookSeq: 74 },
  { bookName: "manasseh", bookSeq: 75 },
  { bookName: "1maccabees", bookSeq: 76 },
  { bookName: "2maccabees", bookSeq: 77 },
  { bookName: "esther(greek)", bookSeq: 78 },
  { bookName: "songofthethree", bookSeq: 79 },
  { bookName: "susanna", bookSeq: 80 },
]
export const versions = [
  { txt: "한국어", val: "ko", description: "개역한글" },
  {
    txt: "English",
    val: "en",
    description: "King James Version of the Holy Bible",
  },
  {
    txt: "German",
    val: "de",
    description: "1912 Luther Bible with Strong's numbers",
  },
]

export const getBookName = (bookCode: string, lang: string) => {
  const bible: any = bibleInfos.find((info) => info.bookCode === bookCode)
  return bible?.bookName[lang] || ""
}
const bibleService = {
  async getBible(params: BibleInfo) {
    let result = []
    if (params.lang === "ko" || params.lang === null) {
      result = await api.get(
        `https://webible.s3.ap-northeast-2.amazonaws.com/bible/${params.bookCode}/${params.chapter}.json`
      )
    } else if (params.lang === "en") {
      result =
        (
          await api.get(
            `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-kjv/books/${params.bookCode}/chapters/${params.chapter}.json`
          )
        )?.data || []
    } else if (params.lang === "de") {
      result =
        (
          await api.get(
            `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/de-luther1912/books/${
              bibleInfos.find((val) => val.bookCode === params.bookCode)
                ?.bookCodeByLang[params.lang]
            }/chapters/${params.chapter}.json`
          )
        )?.data || []
    }
    return params.lang === "ko"
      ? result
      : result.map((item: any) => ({
          ...item,
          content: item?.text,
          bookName: item?.book,
        }))
  },
  async getVersions(params: BibleInfo) {
    return api.get(
      "https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/bibles.json"
    )
  },
}

export default bibleService
