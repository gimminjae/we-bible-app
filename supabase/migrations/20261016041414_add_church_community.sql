-- Private, member-only community. All application access goes through the RPC below.
begin;
create schema if not exists church_community_private;
revoke all on schema church_community_private from public, anon;
grant usage on schema church_community_private to authenticated, service_role;

-- BEGIN STATIC BIBLE VALIDATORS
-- Generated from domain/community/{books,bible-catalog}.json.
-- Static function constants only: no reference tables or seed INSERTs.
create or replace function church_community_private.bible_book(p_book text)
returns integer[] language sql immutable set search_path='' as $$
  select case p_book
    when 'genesis' then array[1,50]
    when 'exodus' then array[2,40]
    when 'leviticus' then array[3,27]
    when 'numbers' then array[4,36]
    when 'deuteronomy' then array[5,34]
    when 'joshua' then array[6,24]
    when 'judges' then array[7,21]
    when 'ruth' then array[8,4]
    when '1samuel' then array[9,31]
    when '2samuel' then array[10,24]
    when '1kings' then array[11,22]
    when '2kings' then array[12,25]
    when '1chronicles' then array[13,29]
    when '2chronicles' then array[14,36]
    when 'ezra' then array[15,10]
    when 'nehemiah' then array[16,13]
    when 'esther' then array[17,10]
    when 'job' then array[18,42]
    when 'psalms' then array[19,150]
    when 'proverbs' then array[20,31]
    when 'ecclesiastes' then array[21,12]
    when 'songofsolomon' then array[22,8]
    when 'isaiah' then array[23,66]
    when 'jeremiah' then array[24,52]
    when 'lamentations' then array[25,5]
    when 'ezekiel' then array[26,48]
    when 'daniel' then array[27,12]
    when 'hosea' then array[28,14]
    when 'joel' then array[29,3]
    when 'amos' then array[30,9]
    when 'obadiah' then array[31,1]
    when 'jonah' then array[32,4]
    when 'micah' then array[33,7]
    when 'nahum' then array[34,3]
    when 'habakkuk' then array[35,3]
    when 'zephaniah' then array[36,3]
    when 'haggai' then array[37,2]
    when 'zechariah' then array[38,14]
    when 'malachi' then array[39,4]
    when 'matthew' then array[40,28]
    when 'mark' then array[41,16]
    when 'luke' then array[42,24]
    when 'john' then array[43,21]
    when 'acts' then array[44,28]
    when 'romans' then array[45,16]
    when '1corinthians' then array[46,16]
    when '2corinthians' then array[47,13]
    when 'galatians' then array[48,6]
    when 'ephesians' then array[49,6]
    when 'philippians' then array[50,4]
    when 'colossians' then array[51,4]
    when '1thessalonians' then array[52,5]
    when '2thessalonians' then array[53,3]
    when '1timothy' then array[54,6]
    when '2timothy' then array[55,4]
    when 'titus' then array[56,3]
    when 'philemon' then array[57,1]
    when 'hebrews' then array[58,13]
    when 'james' then array[59,5]
    when '1peter' then array[60,5]
    when '2peter' then array[61,3]
    when '1john' then array[62,5]
    when '2john' then array[63,1]
    when '3john' then array[64,1]
    when 'jude' then array[65,1]
    when 'revelation' then array[66,22]
    else null::integer[] end
$$;

create or replace function church_community_private.bible_verse_ids(p_version text,p_book text,p_chapter integer)
returns integer[] language plpgsql immutable set search_path='' as $$
declare chapter_data jsonb;
begin
  if p_chapter is null or p_chapter < 1 then return '{}'::integer[]; end if;
  chapter_data := (case p_version
when 'ko-krv' then $catalog${
  "genesis":[31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
  "exodus":[22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
  "leviticus":[17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
  "numbers":[54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
  "deuteronomy":[46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
  "joshua":[18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
  "judges":[36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
  "ruth":[22,23,18,22],
  "1samuel":[28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,30,13],
  "2samuel":[27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
  "1kings":[53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
  "2kings":[18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
  "1chronicles":[54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
  "2chronicles":[17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
  "ezra":[11,70,13,24,17,22,28,36,15,44],
  "nehemiah":[11,20,32,23,19,19,73,18,38,39,36,47,31],
  "esther":[22,23,15,17,14,14,10,17,32,3],
  "job":[22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],
  "psalms":[6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],
  "proverbs":[33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
  "ecclesiastes":[18,26,22,16,20,12,29,17,18,20,10,14],
  "songofsolomon":[17,17,11,16,16,14,13,14],
  "isaiah":[31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
  "jeremiah":[19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
  "lamentations":[22,22,66,22,22],
  "ezekiel":[28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
  "daniel":[21,49,30,37,31,28,28,27,27,21,45,13],
  "hosea":[11,23,5,19,15,11,16,14,17,15,12,14,16,9],
  "joel":[20,32,21],
  "amos":[15,16,15,13,27,14,17,14,15],
  "obadiah":[21],
  "jonah":[17,10,10,11],
  "micah":[16,13,12,13,15,16,20],
  "nahum":[15,13,19],
  "habakkuk":[17,20,19],
  "zephaniah":[18,15,20],
  "haggai":[15,23],
  "zechariah":[21,13,10,14,11,15,14,23,17,12,17,14,9,21],
  "malachi":[14,17,18,6],
  "matthew":[25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
  "mark":[45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
  "luke":[80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
  "john":[51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
  "acts":[26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
  "romans":[32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],
  "1corinthians":[31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
  "2corinthians":[24,17,18,18,21,18,16,24,15,18,33,21,13],
  "galatians":[24,21,29,31,26,18],
  "ephesians":[23,22,21,32,33,24],
  "philippians":[30,30,21,23],
  "colossians":[29,23,25,18],
  "1thessalonians":[10,20,13,18,28],
  "2thessalonians":[12,17,18],
  "1timothy":[20,15,16,16,25,21],
  "2timothy":[18,26,17,22],
  "titus":[16,15,15],
  "philemon":[25],
  "hebrews":[14,18,19,16,14,20,28,13,28,39,40,29,25],
  "james":[27,26,18,17,20],
  "1peter":[25,25,22,19,14],
  "2peter":[21,22,18],
  "1john":[10,29,24,21,21],
  "2john":[13],
  "3john":[15],
  "jude":[25],
  "revelation":[20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21]
}$catalog$::jsonb
when 'en-kjv' then $catalog${
  "genesis":[31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
  "exodus":[22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
  "leviticus":[17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
  "numbers":[54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
  "deuteronomy":[46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
  "joshua":[18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
  "judges":[36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
  "ruth":[22,23,18,22],
  "1samuel":[28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13],
  "2samuel":[27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
  "1kings":[53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
  "2kings":[18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
  "1chronicles":[54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
  "2chronicles":[17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
  "ezra":[11,70,13,24,17,22,28,36,15,44],
  "nehemiah":[11,20,32,23,19,19,73,18,38,39,36,47,31],
  "esther":[22,23,15,17,14,14,10,17,32,3],
  "job":[22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],
  "psalms":[6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],
  "proverbs":[33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
  "ecclesiastes":[18,26,22,16,20,12,29,17,18,20,10,14],
  "songofsolomon":[17,17,11,16,16,13,13,14],
  "isaiah":[31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
  "jeremiah":[19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
  "lamentations":[22,22,66,22,22],
  "ezekiel":[28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
  "daniel":[21,49,30,37,31,28,28,27,27,21,45,13],
  "hosea":[11,23,5,19,15,11,16,14,17,15,12,14,16,9],
  "joel":[20,32,21],
  "amos":[15,16,15,13,27,14,17,14,15],
  "obadiah":[21],
  "jonah":[17,10,10,11],
  "micah":[16,13,12,13,15,16,20],
  "nahum":[15,13,19],
  "habakkuk":[17,20,19],
  "zephaniah":[18,15,20],
  "haggai":[15,23],
  "zechariah":[21,13,10,14,11,15,14,23,17,12,17,14,9,21],
  "malachi":[14,17,18,6],
  "matthew":[25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
  "mark":[45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
  "luke":[80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
  "john":[51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
  "acts":[26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
  "romans":[32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],
  "1corinthians":[31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
  "2corinthians":[24,17,18,18,21,18,16,24,15,18,33,21,14],
  "galatians":[24,21,29,31,26,18],
  "ephesians":[23,22,21,32,33,24],
  "philippians":[30,30,21,23],
  "colossians":[29,23,25,18],
  "1thessalonians":[10,20,13,18,28],
  "2thessalonians":[12,17,18],
  "1timothy":[20,15,16,16,25,21],
  "2timothy":[18,26,17,22],
  "titus":[16,15,15],
  "philemon":[25],
  "hebrews":[14,18,19,16,14,20,28,13,28,39,40,29,25],
  "james":[27,26,18,17,20],
  "1peter":[25,25,22,19,14],
  "2peter":[21,22,18],
  "1john":[10,29,24,21,21],
  "2john":[13],
  "3john":[14],
  "jude":[25],
  "revelation":[20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21]
}$catalog$::jsonb
when 'de-luther1912' then $catalog${
  "genesis":[31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
  "exodus":[22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
  "leviticus":[17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
  "numbers":[54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
  "deuteronomy":[46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
  "joshua":[18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
  "judges":[36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
  "ruth":[22,23,18,22],
  "1samuel":[28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13],
  "2samuel":[27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
  "1kings":[53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
  "2kings":[18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
  "1chronicles":[54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
  "2chronicles":[17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
  "ezra":[11,70,13,24,17,22,28,36,15,44],
  "nehemiah":[11,20,32,23,19,19,73,18,38,39,36,47,31],
  "esther":[22,23,15,17,14,14,10,17,32,3],
  "job":[22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],
  "psalms":[6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],
  "proverbs":[33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
  "ecclesiastes":[18,26,22,16,20,12,29,17,18,20,10,14],
  "songofsolomon":[17,17,11,16,16,13,13,14],
  "isaiah":[31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
  "jeremiah":[19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
  "lamentations":[22,22,66,22,22],
  "ezekiel":[28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
  "daniel":[21,49,30,37,31,28,28,27,27,21,45,13],
  "hosea":[11,23,5,19,15,11,16,14,17,15,12,14,16,9],
  "joel":[20,32,21],
  "amos":[15,16,15,13,27,14,17,14,15],
  "obadiah":[21],
  "jonah":[17,10,10,11],
  "micah":[16,13,12,13,15,16,20],
  "nahum":[15,13,19],
  "habakkuk":[17,20,19],
  "zephaniah":[18,15,20],
  "haggai":[15,23],
  "zechariah":[21,13,10,14,11,15,14,23,17,12,17,14,9,21],
  "malachi":[14,17,18,6],
  "matthew":[25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
  "mark":[45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
  "luke":[80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
  "john":[51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
  "acts":[26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
  "romans":[32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],
  "1corinthians":[31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
  "2corinthians":[24,17,18,18,21,18,16,24,15,18,33,21,14],
  "galatians":[24,21,29,31,26,18],
  "ephesians":[23,22,21,32,33,24],
  "philippians":[30,30,21,23],
  "colossians":[29,23,25,18],
  "1thessalonians":[10,20,13,18,28],
  "2thessalonians":[12,17,18],
  "1timothy":[20,15,16,16,25,21],
  "2timothy":[18,26,17,22],
  "titus":[16,15,15],
  "philemon":[25],
  "hebrews":[14,18,19,16,14,20,28,13,28,39,40,29,25],
  "james":[27,26,18,17,20],
  "1peter":[25,25,22,19,14],
  "2peter":[21,22,18],
  "1john":[10,29,24,21,21],
  "2john":[13],
  "3john":[14],
  "jude":[25],
  "revelation":[20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21]
}$catalog$::jsonb
    else '{}'::jsonb end)->p_book->(p_chapter-1);
  if jsonb_typeof(chapter_data)='number' then
    return array(select generate_series(1,chapter_data::integer));
  elsif jsonb_typeof(chapter_data)='array' then
    return array(select value::integer from jsonb_array_elements_text(chapter_data));
  end if;
  return '{}'::integer[];
end $$;

create or replace function church_community_private.bible_valid_verse(p_version text,p_book text,p_chapter integer,p_verse integer)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(p_verse=any(church_community_private.bible_verse_ids(p_version,p_book,p_chapter)),false)
$$;
-- END STATIC BIBLE VALIDATORS
create table public.church_posts (
  id bigint generated always as identity primary key,
  church_id bigint not null references public.churches on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  title text not null check(char_length(btrim(title)) between 1 and 100),
  body jsonb not null, preview text not null,
  post_type text not null check(post_type in ('general','bible_reading')),
  version integer not null default 1, reading_version integer not null default 1,
  reading_locked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(church_id,id)
);
create index church_posts_feed on public.church_posts(church_id,created_at desc,id desc);
create index church_posts_author on public.church_posts(author_id);
create table public.church_post_reading_ranges (
  church_id bigint not null, post_id bigint not null,
  book_code text not null,
  chapter_start integer not null check(chapter_start>0),
  chapter_end integer not null check(chapter_end>=chapter_start),
  constraint church_reading_range_reference
    check(chapter_end<=coalesce((church_community_private.bible_book(book_code))[2],0)),
  primary key(post_id,book_code,chapter_start),
  foreign key(church_id,post_id) references public.church_posts(church_id,id) on delete cascade
);
create table public.church_comments (
  id bigint generated always as identity primary key,
  church_id bigint not null, post_id bigint not null,
  author_id uuid not null references auth.users on delete cascade,
  comment_kind text not null check(comment_kind in ('text','meditation')),
  content text,
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(church_id,post_id,id),
  check((comment_kind='text' and content is not null and char_length(btrim(content)) between 1 and 2000)
    or (comment_kind='meditation' and content is null)),
  foreign key(church_id,post_id) references public.church_posts(church_id,id) on delete cascade
);
create index church_comments_feed on public.church_comments(church_id,post_id,created_at,id);
create index church_comments_author on public.church_comments(author_id);
create table public.church_comment_meditations (
  comment_id bigint primary key, church_id bigint not null, post_id bigint not null,
  bible_version text not null check(bible_version in ('ko-krv','en-kjv','de-luther1912')),
  meditation_content text not null check(char_length(btrim(meditation_content)) between 1 and 5000),
  unique(church_id,post_id,comment_id,bible_version),
  foreign key(church_id,post_id,comment_id) references public.church_comments(church_id,post_id,id) on delete cascade
);
create table public.church_comment_meditation_verses (
  comment_id bigint not null, church_id bigint not null, post_id bigint not null,
  bible_version text not null, book_code text not null, chapter integer not null, verse integer not null,
  primary key(comment_id,book_code,chapter,verse),
  foreign key(church_id,post_id,comment_id,bible_version)
    references public.church_comment_meditations(church_id,post_id,comment_id,bible_version) on delete cascade,
  constraint church_meditation_verse_reference_check
    check(church_community_private.bible_valid_verse(bible_version,book_code,chapter,verse))
);
create index church_meditation_verse_reference on public.church_comment_meditation_verses(bible_version,book_code,chapter,verse);
create table public.church_post_likes (
  church_id bigint not null, post_id bigint not null, user_id uuid not null,
  primary key(post_id,user_id),
  foreign key(church_id,post_id) references public.church_posts(church_id,id) on delete cascade,
  foreign key(church_id,user_id) references public.church_memberships on delete cascade
);
create index church_post_likes_member on public.church_post_likes(church_id,user_id);
create table public.church_comment_likes (
  church_id bigint not null, post_id bigint not null, comment_id bigint not null, user_id uuid not null,
  primary key(comment_id,user_id),
  foreign key(church_id,post_id,comment_id) references public.church_comments(church_id,post_id,id) on delete cascade,
  foreign key(church_id,user_id) references public.church_memberships on delete cascade
);
create index church_comment_likes_member on public.church_comment_likes(church_id,user_id);
create table public.church_tags (
  church_id bigint not null references public.churches on delete cascade,
  name text not null check(char_length(name) between 1 and 20), primary key(church_id,name)
);
create table public.church_post_tags (
  church_id bigint not null, post_id bigint not null, name text not null,
  primary key(post_id,name),
  foreign key(church_id,name) references public.church_tags on delete cascade,
  foreign key(church_id,post_id) references public.church_posts(church_id,id) on delete cascade
);
create index church_post_tags_filter on public.church_post_tags(church_id,name,post_id);
create table public.church_post_attachments (
  id uuid primary key default gen_random_uuid(),
  church_id bigint not null references public.churches on delete cascade,
  uploader_id uuid not null references auth.users on delete cascade,
  draft_id uuid not null, post_id bigint,
  name text not null check(char_length(name) between 1 and 240), mime text not null,
  kind text not null check(kind in ('image','file')),
  size integer not null check(size>0 and size<=20971520),
  state text not null default 'pending' check(state in ('pending','ready','attached','delete_pending')),
  staging_key text not null unique, object_key text not null unique,
  created_at timestamptz not null default now(),
  foreign key(church_id,post_id) references public.church_posts(church_id,id) on delete cascade
);
create index church_attachments_post on public.church_post_attachments(church_id,post_id);
create index church_attachments_uploader on public.church_post_attachments(uploader_id,draft_id,state);
create index church_attachments_expiry on public.church_post_attachments(created_at) where state in ('pending','ready');
create table church_community_private.attachment_cleanup_jobs (
  object_key text primary key, created_at timestamptz not null default now(),
  attempts integer not null default 0, last_error text, generation integer not null default 1
);
create table church_community_private.requests (
  church_id bigint not null references public.churches on delete cascade,
  actor uuid not null references auth.users on delete cascade,
  request_id uuid not null, action text not null, payload_hash bytea not null, result jsonb not null,
  primary key(church_id,actor,request_id)
);

create function church_community_private.queue_attachment_delete() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into church_community_private.attachment_cleanup_jobs(object_key)
  values(old.staging_key),(old.object_key) on conflict(object_key) do update
    set generation=attachment_cleanup_jobs.generation+1;
  return old;
end $$;
create trigger community_attachment_delete before delete on public.church_post_attachments
for each row execute function church_community_private.queue_attachment_delete();

-- Deferred cross-table subtype/cardinality constraint, also enforced on privileged writes.
create function church_community_private.check_comment_kind() returns trigger
language plpgsql security definer set search_path='' as $$
declare cid bigint; c public.church_comments; n integer;
begin
  if tg_table_name='church_comments' then cid:=coalesce(new.id,old.id);
  else cid:=coalesce(new.comment_id,old.comment_id); end if;
  select * into c from public.church_comments where id=cid;
  if not found then return null; end if;
  select count(*) into n from public.church_comment_meditations where comment_id=cid;
  if (c.comment_kind='text' and n<>0) or (c.comment_kind='meditation' and n<>1) then
    raise exception 'INVALID_INPUT: comment subtype'; end if;
  if c.comment_kind='meditation' then
    select count(*) into n from public.church_comment_meditation_verses where comment_id=cid;
    if n<1 or n>50 or not exists(select 1 from public.church_posts where id=c.post_id and post_type='bible_reading')
      then raise exception 'INVALID_VERSE'; end if;
    if exists(select 1 from public.church_comment_meditation_verses v where v.comment_id=cid and not exists(
      select 1 from public.church_post_reading_ranges r where r.post_id=c.post_id and r.book_code=v.book_code
        and v.chapter between r.chapter_start and r.chapter_end)) then raise exception 'INVALID_VERSE'; end if;
  end if;
  return null;
end $$;
create constraint trigger community_comment_kind after insert or update or delete on public.church_comments
deferrable initially deferred for each row execute function church_community_private.check_comment_kind();
create constraint trigger community_meditation_kind after insert or update or delete on public.church_comment_meditations
deferrable initially deferred for each row execute function church_community_private.check_comment_kind();
create constraint trigger community_verses_kind after insert or update or delete on public.church_comment_meditation_verses
deferrable initially deferred for each row execute function church_community_private.check_comment_kind();

create function church_community_private.validate_body(doc jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare node jsonb; mark jsonb; entry record; txt text:=''; images jsonb:='[]'; count_nodes integer:=0;
begin
  if doc is null or doc->>'type' is distinct from 'doc' or octet_length(doc::text)>262144 then raise exception 'INVALID_INPUT: body'; end if;
  for entry in with recursive nodes(n,depth,parent) as (
    select doc,0,''::text union all select child,nodes.depth+1,nodes.n->>'type'
    from nodes cross join lateral jsonb_array_elements(coalesce(nodes.n->'content','[]')) child where nodes.depth<17
  ) select * from nodes loop
    node:=entry.n; count_nodes:=count_nodes+1;
    if entry.depth>16 or count_nodes>3000 or jsonb_typeof(node)<>'object'
      or not (coalesce(node->>'type','')=any(array['doc','paragraph','text','hardBreak','heading','bulletList','orderedList','listItem','blockquote','communityImage']))
      or (node-'type'-'attrs'-'content'-'marks'-'text')<>'{}'::jsonb then raise exception 'INVALID_INPUT: node'; end if;
    if node ? 'attrs' and jsonb_typeof(node->'attrs')<>'object' then raise exception 'INVALID_INPUT: attrs'; end if;
    if node ? 'text' and (node->>'type'<>'text' or jsonb_typeof(node->'text')<>'string') then raise exception 'INVALID_INPUT: text'; end if;
    if node->>'type'='text' then
      if char_length(coalesce(node->>'text',''))=0 or node ? 'content' then raise exception 'INVALID_INPUT: text'; end if;
      txt:=txt||(node->>'text');
    end if;
    if node->>'type'='heading' and (coalesce((node->'attrs')->>'level','') not in ('2','3') or ((node->'attrs')-'level')<>'{}'::jsonb) then raise exception 'INVALID_INPUT: heading'; end if;
    if node->>'type'='communityImage' then
      if entry.parent<>'doc' or node ? 'content' or node ? 'marks'
        or coalesce((node->'attrs')->>'attachmentId','') !~ '^[0-9a-fA-F-]{36}$'
        or char_length(coalesce((node->'attrs')->>'alt',''))>200
        or ((node->'attrs')-'attachmentId'-'alt')<>'{}'::jsonb then raise exception 'INVALID_INPUT: image'; end if;
      images:=images||jsonb_build_array(((node->'attrs')->>'attachmentId')::uuid);
    elsif node->>'type' not in ('heading','orderedList') and coalesce(node->'attrs','{}')<>'{}'::jsonb then raise exception 'INVALID_INPUT: attrs'; end if;
    if node->>'type'='orderedList' and ((coalesce(node->'attrs','{}')-'start'-'type')<>'{}'::jsonb
      or coalesce(node->'attrs'->>'type','1') not in ('1','a','A','i','I')
      or coalesce((node->'attrs'->>'start')::integer,1) not between 1 and 1000000) then raise exception 'INVALID_INPUT: list'; end if;
    if entry.depth>0 and ((entry.parent='doc' and node->>'type' not in ('paragraph','heading','bulletList','orderedList','blockquote','communityImage'))
      or (entry.parent in ('paragraph','heading') and node->>'type' not in ('text','hardBreak'))
      or (entry.parent in ('bulletList','orderedList') and node->>'type'<>'listItem')
      or (entry.parent in ('listItem','blockquote') and node->>'type' not in ('paragraph','heading','bulletList','orderedList','blockquote'))
      or entry.parent in ('text','hardBreak','communityImage')) then raise exception 'INVALID_INPUT: structure'; end if;
    for mark in select value from jsonb_array_elements(coalesce(node->'marks','[]')) loop
      if jsonb_typeof(mark)<>'object' or (mark-'type'-'attrs')<>'{}'::jsonb or node->>'type' not in ('text','hardBreak') or coalesce(mark->>'type','') not in ('bold','italic','underline','strike','link') then raise exception 'INVALID_INPUT: mark'; end if;
      if mark->>'type'='link' then
        if coalesce(mark->'attrs'->>'href','') !~ '^https?://[^[:space:]]+$'
          or (coalesce(mark->'attrs','{}')-'href'-'target'-'rel'-'class')<>'{}'::jsonb then raise exception 'INVALID_INPUT: link'; end if;
      elsif coalesce(mark->'attrs','{}')<>'{}'::jsonb then raise exception 'INVALID_INPUT: mark attrs'; end if;
    end loop;
  end loop;
  if char_length(txt)>20000 or jsonb_array_length(images)>10 then raise exception 'INVALID_INPUT: body limit'; end if;
  return jsonb_build_object('text',txt,'images',images);
end $$;

create function church_community_private.post_json(p public.church_posts, actor uuid, member_role text, full_body boolean default true)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',p.id::text,'church_id',p.church_id::text,'author_id',p.author_id,
    'author_name',case when exists(select 1 from public.church_memberships m where m.church_id=p.church_id and m.user_id=p.author_id)
      then coalesce((select nullif(display_name,'') from public.user_profiles where user_id=p.author_id),'회원') else '탈퇴한 회원' end,
    'title',p.title,'body',case when full_body then p.body else null end,'preview',left(p.preview,180),
    'post_type',p.post_type,'version',p.version,'reading_version',p.reading_version,'reading_locked_at',p.reading_locked_at,
    'created_at',p.created_at,'updated_at',p.updated_at,'can_edit',p.author_id=actor,
    'can_delete',p.author_id=actor or member_role in ('super_admin','deputy_admin'),
    'tags',coalesce((select jsonb_agg(name order by name) from public.church_post_tags where post_id=p.id),'[]'),
    'ranges',coalesce((select jsonb_agg(jsonb_build_object('book_code',r.book_code,'chapter_start',r.chapter_start,'chapter_end',r.chapter_end) order by (church_community_private.bible_book(r.book_code))[1],r.chapter_start)
      from public.church_post_reading_ranges r where r.post_id=p.id),'[]'),
    'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'mime',a.mime,'size',a.size,'kind',a.kind) order by a.created_at,a.id)
      from public.church_post_attachments a where a.post_id=p.id and a.state='attached'),'[]'),
    'like_count',(select count(*) from public.church_post_likes where post_id=p.id),
    'comment_count',(select count(*) from public.church_comments where post_id=p.id),
    'liked',exists(select 1 from public.church_post_likes where post_id=p.id and user_id=actor))
$$;
create function church_community_private.comment_json(c public.church_comments, actor uuid, member_role text)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',c.id::text,'post_id',c.post_id::text,'author_id',c.author_id,
    'author_name',case when exists(select 1 from public.church_memberships m where m.church_id=c.church_id and m.user_id=c.author_id)
      then coalesce((select nullif(display_name,'') from public.user_profiles where user_id=c.author_id),'회원') else '탈퇴한 회원' end,
    'content',c.content,'comment_kind',c.comment_kind,'version',c.version,'created_at',c.created_at,
    'can_edit',c.author_id=actor,'can_delete',c.author_id=actor or member_role in ('super_admin','deputy_admin'),
    'like_count',(select count(*) from public.church_comment_likes where comment_id=c.id),
    'liked',exists(select 1 from public.church_comment_likes where comment_id=c.id and user_id=actor),
    'meditation',(select jsonb_build_object('bible_version',m.bible_version,'meditation_content',m.meditation_content,'verses',
      (select jsonb_agg(jsonb_build_object('book_code',v.book_code,'chapter',v.chapter,'verse',v.verse) order by (church_community_private.bible_book(v.book_code))[1],v.chapter,v.verse)
       from public.church_comment_meditation_verses v where v.comment_id=c.id))
      from public.church_comment_meditations m where m.comment_id=c.id))
$$;

create function church_community_private.api(p_church_id bigint, p_action text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid(); member_role text; p public.church_posts; c public.church_comments;
  result jsonb; checked jsonb; ids uuid[]; tags text[]; ranges jsonb; old_ranges jsonb;
  item jsonb; n integer; total_size bigint; pid bigint; cid bigint;
  req uuid; prior church_community_private.requests; kind text; lim integer; next_cursor jsonb;
begin
  if v_actor is null then raise exception 'PERMISSION_DENIED'; end if;
  select role into member_role from public.church_memberships
    where church_id=p_church_id and user_id=v_actor for key share;
  if not found then raise exception 'PERMISSION_DENIED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>400000 then raise exception 'INVALID_INPUT'; end if;
  if p_action in ('save_post','save_comment') then
    req:=(p_payload->>'request_id')::uuid;
    if req is null then raise exception 'INVALID_INPUT: request_id'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text||':'||p_church_id::text,0));
    select * into prior from church_community_private.requests r where r.church_id=p_church_id and r.actor=v_actor and r.request_id=req;
    if found then
      if prior.action<>p_action or prior.payload_hash<>sha256(convert_to(p_payload::text,'UTF8')) then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
      if p_action='save_post' then
        select * into p from public.church_posts where church_id=p_church_id and id=(prior.result->>'post_id')::bigint;
        if not found then raise exception 'NOT_FOUND'; end if;
        return church_community_private.post_json(p,v_actor,member_role);
      else
        select * into c from public.church_comments where church_id=p_church_id and id=(prior.result->>'comment_id')::bigint;
        if not found then raise exception 'NOT_FOUND'; end if;
        return church_community_private.comment_json(c,v_actor,member_role);
      end if;
    end if;
  end if;
  if p_action='list_posts' then
    lim:=least(greatest(coalesce((p_payload->>'limit')::integer,20),1),50);
    with page as (
      select post.* from public.church_posts post where church_id=p_church_id
        and (p_payload->>'tag' is null or exists(select 1 from public.church_post_tags t where t.post_id=post.id and t.name=p_payload->>'tag'))
        and (p_payload->'cursor'->>'id' is null or (post.created_at,post.id)<((p_payload->'cursor'->>'created_at')::timestamptz,(p_payload->'cursor'->>'id')::bigint))
      order by created_at desc,id desc limit lim+1
    ), shown as (select * from page order by created_at desc,id desc limit lim)
    select jsonb_build_object('items',coalesce((select jsonb_agg(church_community_private.post_json(shown,v_actor,member_role,false) order by created_at desc,id desc) from shown),'[]'),
      'next',case when (select count(*) from page)>lim then (select jsonb_build_object('id',id::text,'created_at',created_at) from shown order by created_at,id limit 1) else null end) into result;
    return result;
  elsif p_action='suggest_tags' then
    select coalesce(jsonb_agg(name order by name),'[]') into result from (
      select distinct name from public.church_post_tags where church_id=p_church_id
        and starts_with(name,lower(normalize(coalesce(p_payload->>'query',''),NFKC))) order by name limit 20) q;
    return result;
  elsif p_action='verse_ids' then
    -- Compatibility for older app releases; current clients read bundled JSON.
    return to_jsonb(church_community_private.bible_verse_ids(
      p_payload->>'bible_version',p_payload->>'book_code',(p_payload->>'chapter')::integer));
  end if;

  pid:=nullif(p_payload->>'post_id','')::bigint;
  if pid is not null then
    select * into p from public.church_posts where church_id=p_church_id and id=pid for update;
    if not found then raise exception 'NOT_FOUND'; end if;
  elsif p_action<>'save_post' then raise exception 'INVALID_INPUT: post_id'; end if;
  if p_action='get_post' then return church_community_private.post_json(p,v_actor,member_role); end if;

  if p_action='save_post' then
    if pid is not null and p.author_id<>v_actor then raise exception 'PERMISSION_DENIED'; end if;
    if pid is not null and p.version is distinct from (p_payload->>'expected_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
    if pid is not null and p.post_type is distinct from p_payload->>'post_type' then raise exception 'INVALID_INPUT: immutable type'; end if;
    checked:=church_community_private.validate_body(p_payload->'body');
    if jsonb_typeof(p_payload->'attachment_ids') is distinct from 'array' or jsonb_array_length(p_payload->'attachment_ids')>10 then raise exception 'INVALID_INPUT: files'; end if;
    select coalesce(array_agg(distinct value::uuid),'{}') into ids from jsonb_array_elements_text(p_payload->'attachment_ids');
    if exists(select 1 from jsonb_array_elements_text(checked->'images') x where not (x.value::uuid=any(ids))) then raise exception 'INVALID_INPUT: image manifest'; end if;
    perform 1 from public.church_post_attachments where id=any(ids) order by id for update;
    select count(*),coalesce(sum(size),0) into n,total_size from public.church_post_attachments a where a.id=any(ids) and a.church_id=p_church_id
      and a.uploader_id=v_actor and ((a.state='ready' and a.post_id is null) or (pid is not null and a.state='attached' and a.post_id=pid));
    if n<>cardinality(ids) or total_size>52428800 then raise exception 'ATTACHMENT_NOT_READY'; end if;
    if exists(select 1 from jsonb_array_elements_text(checked->'images') x join public.church_post_attachments a on a.id=x.value::uuid where a.kind<>'image') then raise exception 'INVALID_INPUT: image kind'; end if;
    if char_length(btrim(checked->>'text'))=0 and cardinality(ids)=0 then raise exception 'INVALID_INPUT: empty body'; end if;
    if jsonb_typeof(p_payload->'tags') is distinct from 'array' or jsonb_array_length(p_payload->'tags')>5 then raise exception 'INVALID_INPUT: tags'; end if;
    if exists(select 1 from jsonb_array_elements(p_payload->'tags') tag where jsonb_typeof(tag)<>'string') then raise exception 'INVALID_INPUT: tag type'; end if;
    select coalesce(array_agg(distinct lower(btrim(regexp_replace(btrim(normalize(value,NFKC)),'^#+','')))),'{}') into tags from jsonb_array_elements_text(p_payload->'tags');
    if exists(select 1 from unnest(tags) tag where char_length(tag) not between 1 and 20 or tag ~ '[[:space:],#]') then raise exception 'INVALID_INPUT: tags'; end if;
    if p_payload->>'post_type'='bible_reading' then
      if jsonb_typeof(p_payload->'ranges') is distinct from 'array' or jsonb_array_length(p_payload->'ranges') not between 1 and 20 then raise exception 'INVALID_INPUT: ranges'; end if;
      for item in select value from jsonb_array_elements(p_payload->'ranges') loop
        if not coalesce((item->>'chapter_start')::integer>=1
          and (item->>'chapter_end')::integer between (item->>'chapter_start')::integer
            and (church_community_private.bible_book(item->>'book_code'))[2],false)
          then raise exception 'INVALID_INPUT: ranges'; end if;
      end loop;
      with chapters as (
        select distinct x->>'book_code' book_code,generate_series((x->>'chapter_start')::integer,(x->>'chapter_end')::integer) ch from jsonb_array_elements(p_payload->'ranges') x
      ), islands as (select *,ch-row_number() over(partition by book_code order by ch) grp from chapters),
      merged as (select book_code,min(ch) chapter_start,max(ch) chapter_end from islands group by book_code,grp)
      select jsonb_agg(jsonb_build_object('book_code',m.book_code,'chapter_start',chapter_start,'chapter_end',chapter_end) order by (church_community_private.bible_book(m.book_code))[1],chapter_start)
        into ranges from merged m;
    elsif p_payload->>'post_type'='general' then ranges:='[]';
    else raise exception 'INVALID_INPUT: type'; end if;
    if pid is null then
      insert into public.church_posts(church_id,author_id,title,body,preview,post_type)
      values(p_church_id,v_actor,btrim(p_payload->>'title'),p_payload->'body',checked->>'text',p_payload->>'post_type') returning * into p;
      pid:=p.id;
    else
      old_ranges:=church_community_private.post_json(p,v_actor,member_role)->'ranges';
      if old_ranges<>ranges and p.reading_locked_at is not null then raise exception 'READING_LOCKED'; end if;
      update public.church_posts set title=btrim(p_payload->>'title'),body=p_payload->'body',preview=checked->>'text',
        version=version+1,reading_version=reading_version+case when old_ranges<>ranges then 1 else 0 end,updated_at=now()
        where id=pid returning * into p;
    end if;
    delete from public.church_post_reading_ranges where post_id=pid;
    insert into public.church_post_reading_ranges(church_id,post_id,book_code,chapter_start,chapter_end)
      select p_church_id,pid,x->>'book_code',(x->>'chapter_start')::integer,(x->>'chapter_end')::integer from jsonb_array_elements(ranges) x;
    delete from public.church_post_tags where post_id=pid;
    insert into public.church_tags(church_id,name) select p_church_id,unnest(tags) on conflict do nothing;
    insert into public.church_post_tags(church_id,post_id,name) select p_church_id,pid,unnest(tags);
    delete from public.church_post_attachments where post_id=pid and not(id=any(ids));
    update public.church_post_attachments set state='attached',post_id=pid where id=any(ids);
    result:=church_community_private.post_json(p,v_actor,member_role);
  elsif p_action='delete_post' then
    if p.author_id<>v_actor and member_role not in ('super_admin','deputy_admin') then raise exception 'PERMISSION_DENIED'; end if;
    if p.version is distinct from (p_payload->>'expected_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
    delete from public.church_posts where id=pid;
    return '{}'::jsonb;
  elsif p_action='like_post' then
    if jsonb_typeof(p_payload->'liked') is distinct from 'boolean' then raise exception 'INVALID_INPUT'; end if;
    if (p_payload->>'liked')::boolean then insert into public.church_post_likes values(p_church_id,pid,v_actor) on conflict do nothing;
    else delete from public.church_post_likes where post_id=pid and user_id=v_actor; end if;
    return church_community_private.post_json(p,v_actor,member_role);
  elsif p_action='list_comments' then
    lim:=least(greatest(coalesce((p_payload->>'limit')::integer,30),1),50);
    with page as (
      select comment.* from public.church_comments comment where church_id=p_church_id and post_id=pid
        and (p_payload->'cursor'->>'id' is null or (comment.created_at,comment.id)>((p_payload->'cursor'->>'created_at')::timestamptz,(p_payload->'cursor'->>'id')::bigint))
      order by created_at,id limit lim+1
    ), shown as (select * from page order by created_at,id limit lim)
    select jsonb_build_object('items',coalesce((select jsonb_agg(church_community_private.comment_json(shown,v_actor,member_role) order by created_at,id) from shown),'[]'),
      'next',case when (select count(*) from page)>lim then (select jsonb_build_object('id',id::text,'created_at',created_at) from shown order by created_at desc,id desc limit 1) else null end) into result;
    return result;
  elsif p_action in ('save_comment','delete_comment','like_comment') then
    cid:=nullif(p_payload->>'comment_id','')::bigint;
    if cid is not null then
      select * into c from public.church_comments where church_id=p_church_id and post_id=pid and id=cid for update;
      if not found then raise exception 'NOT_FOUND'; end if;
    elsif p_action<>'save_comment' then raise exception 'INVALID_INPUT'; end if;
    if p_action='like_comment' then
      if jsonb_typeof(p_payload->'liked') is distinct from 'boolean' then raise exception 'INVALID_INPUT'; end if;
      if (p_payload->>'liked')::boolean then insert into public.church_comment_likes values(p_church_id,pid,cid,v_actor) on conflict do nothing;
      else delete from public.church_comment_likes where comment_id=cid and user_id=v_actor; end if;
      return church_community_private.comment_json(c,v_actor,member_role);
    end if;
    if cid is not null then
      if c.author_id<>v_actor and not (p_action='delete_comment' and member_role in ('super_admin','deputy_admin')) then raise exception 'PERMISSION_DENIED'; end if;
      if c.version is distinct from (p_payload->>'expected_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
    end if;
    if p_action='delete_comment' then delete from public.church_comments where id=cid; return '{}'::jsonb; end if;
    kind:=p_payload->>'comment_kind';
    if cid is not null and c.comment_kind is distinct from kind then raise exception 'INVALID_INPUT: immutable kind'; end if;
    if kind='meditation' then
      if p.post_type<>'bible_reading' then raise exception 'INVALID_INPUT: post type'; end if;
      if p.reading_version is distinct from (p_payload->>'expected_reading_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
      if jsonb_typeof(p_payload->'meditation'->'verses') is distinct from 'array'
        or jsonb_array_length(p_payload->'meditation'->'verses') not between 1 and 50 then raise exception 'INVALID_VERSE'; end if;
      for item in select value from jsonb_array_elements(p_payload->'meditation'->'verses') loop
        if not exists(select 1 from public.church_post_reading_ranges r where r.post_id=pid and r.book_code=item->>'book_code'
          and (item->>'chapter')::integer between r.chapter_start and r.chapter_end)
          or not church_community_private.bible_valid_verse(p_payload->'meditation'->>'bible_version',
            item->>'book_code',(item->>'chapter')::integer,(item->>'verse')::integer) then raise exception 'INVALID_VERSE'; end if;
      end loop;
      update public.church_posts set reading_locked_at=coalesce(reading_locked_at,now()) where id=pid;
    elsif kind is distinct from 'text' then raise exception 'INVALID_INPUT: kind'; end if;
    if cid is null then
      insert into public.church_comments(church_id,post_id,author_id,comment_kind,content)
        values(p_church_id,pid,v_actor,kind,case when kind='text' then btrim(p_payload->>'content') else null end) returning * into c;
      cid:=c.id;
    else
      update public.church_comments set content=case when kind='text' then btrim(p_payload->>'content') else null end,version=version+1,updated_at=now()
        where id=cid returning * into c;
      delete from public.church_comment_meditations where comment_id=cid;
    end if;
    if kind='meditation' then
      insert into public.church_comment_meditations values(cid,p_church_id,pid,p_payload->'meditation'->>'bible_version',btrim(p_payload->'meditation'->>'meditation_content'));
      insert into public.church_comment_meditation_verses
        select distinct cid,p_church_id,pid,p_payload->'meditation'->>'bible_version',x->>'book_code',(x->>'chapter')::integer,(x->>'verse')::integer
        from jsonb_array_elements(p_payload->'meditation'->'verses') x;
    end if;
    result:=church_community_private.comment_json(c,v_actor,member_role);
  else raise exception 'INVALID_INPUT: action'; end if;
  if req is not null then
    insert into church_community_private.requests values(p_church_id,v_actor,req,p_action,sha256(convert_to(p_payload::text,'UTF8')),jsonb_build_object('post_id',pid::text,'comment_id',cid::text));
  end if;
  return result;
end $$;

create function public.church_community(p_church_id bigint,p_action text,p_payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$
  select church_community_private.api(p_church_id,p_action,p_payload)
$$;

-- Called only by authenticated Edge Functions using the server's service-role key.
create function church_community_private.storage_api(p_action text,p_actor uuid,p_church_id bigint,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.church_post_attachments; aid uuid; result jsonb; n integer; bytes bigint;
begin
  if p_action='cleanup' then
    delete from public.church_post_attachments where state in ('pending','ready') and created_at<now()-interval '24 hours';
    select coalesce(jsonb_agg(to_jsonb(j)),'[]') into result from (
      select * from church_community_private.attachment_cleanup_jobs order by created_at limit 100 for update skip locked) j;
    return result;
  elsif p_action='cleanup_done' then
    delete from church_community_private.attachment_cleanup_jobs where object_key=p_payload->>'key'
      and generation=(p_payload->>'generation')::integer; return '{}';
  elsif p_action='cleanup_failed' then
    update church_community_private.attachment_cleanup_jobs set attempts=attempts+1,last_error=left(p_payload->>'error',200) where object_key=p_payload->>'key'; return '{}';
  elsif p_action='queue' then
    insert into church_community_private.attachment_cleanup_jobs(object_key) values(p_payload->>'key')
      on conflict(object_key) do update set generation=attachment_cleanup_jobs.generation+1; return '{}';
  end if;
  if p_actor is null or not exists(select 1 from auth.users where id=p_actor) then raise exception 'PERMISSION_DENIED'; end if;
  perform 1 from public.church_memberships where church_id=p_church_id and user_id=p_actor for key share;
  if not found then raise exception 'PERMISSION_DENIED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':'||p_church_id::text,0));
  aid:=(p_payload->>'id')::uuid;
  if p_action='reserve' then
    select * into a from public.church_post_attachments where id=aid for update;
    if found then
      if a.uploader_id<>p_actor or a.church_id<>p_church_id or a.draft_id<>(p_payload->>'draft_id')::uuid
        or a.name<>p_payload->>'name' or a.mime<>p_payload->>'mime' or a.size<>(p_payload->>'size')::integer
        or a.state not in ('pending','ready') then raise exception 'INVALID_INPUT'; end if;
      return to_jsonb(a);
    end if;
    select count(*),coalesce(sum(size),0) into n,bytes from public.church_post_attachments
      where uploader_id=p_actor and church_id=p_church_id and draft_id=(p_payload->>'draft_id')::uuid and state in ('pending','ready');
    if n>=10 or bytes+(p_payload->>'size')::integer>52428800 or
      (p_payload->>'kind'='image' and (p_payload->>'size')::integer>10485760) then raise exception 'INVALID_INPUT: upload quota'; end if;
    if (select count(*) from public.church_post_attachments where uploader_id=p_actor and state in ('pending','ready'))>=30 then raise exception 'INVALID_INPUT: pending quota'; end if;
    insert into public.church_post_attachments(id,church_id,uploader_id,draft_id,name,mime,kind,size,staging_key,object_key)
      values(aid,p_church_id,p_actor,(p_payload->>'draft_id')::uuid,p_payload->>'name',p_payload->>'mime',p_payload->>'kind',(p_payload->>'size')::integer,
        'staging/'||p_church_id||'/'||aid||'/'||gen_random_uuid(),'attachments/'||p_church_id||'/'||aid||'/'||gen_random_uuid()) returning * into a;
    return to_jsonb(a);
  elsif p_action='resolve' then
    if jsonb_array_length(p_payload->'ids')>10 then raise exception 'INVALID_INPUT'; end if;
    select coalesce(jsonb_agg(to_jsonb(f)),'[]') into result from public.church_post_attachments f
    where f.id in (select value::uuid from jsonb_array_elements_text(p_payload->'ids')) and f.church_id=p_church_id
      and ((f.state='attached' and exists(select 1 from public.church_posts where id=f.post_id and church_id=p_church_id))
        or (f.state='ready' and f.uploader_id=p_actor and f.post_id is null));
    return result;
  end if;
  select * into a from public.church_post_attachments where id=aid and church_id=p_church_id and uploader_id=p_actor for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_action='meta' then
    if a.state not in ('pending','ready') or a.post_id is not null then raise exception 'INVALID_INPUT'; end if;
    return to_jsonb(a);
  elsif p_action='finish' then
    if a.state not in ('pending','ready') or a.post_id is not null then raise exception 'INVALID_INPUT'; end if;
    update public.church_post_attachments set state='ready' where id=aid returning * into a;
    return to_jsonb(a);
  elsif p_action='cancel' then
    if a.post_id is not null then raise exception 'PERMISSION_DENIED'; end if;
    delete from public.church_post_attachments where id=aid; return '{}';
  end if;
  raise exception 'INVALID_INPUT';
end $$;
create function public.church_community_storage(p_action text,p_actor uuid default null,p_church_id bigint default null,p_payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$
  select church_community_private.storage_api(p_action,p_actor,p_church_id,p_payload)
$$;

-- No direct Data API table access, including read access. Private helpers cannot be called by clients.
do $$ declare t text; begin
  foreach t in array array['church_posts','church_post_reading_ranges','church_comments','church_comment_meditations',
    'church_comment_meditation_verses','church_post_likes','church_comment_likes','church_tags','church_post_tags','church_post_attachments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
  end loop;
  foreach t in array array['attachment_cleanup_jobs','requests'] loop
    execute format('alter table church_community_private.%I enable row level security',t);
  end loop;
end $$;
revoke all on all tables in schema church_community_private from public,anon,authenticated;
revoke all on all functions in schema church_community_private from public,anon,authenticated;
revoke all on function public.church_community(bigint,text,jsonb) from public,anon;
revoke all on function public.church_community_storage(text,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.church_community(bigint,text,jsonb) to authenticated;
grant execute on function church_community_private.api(bigint,text,jsonb) to authenticated;
grant execute on function public.church_community_storage(text,uuid,bigint,jsonb) to service_role;
grant execute on function church_community_private.storage_api(text,uuid,bigint,jsonb) to service_role;
commit;
