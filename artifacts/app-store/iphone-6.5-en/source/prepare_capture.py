"""Prepare an isolated, offline screenshot app from the current UI sources."""
from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[4]
CAPTURE = Path('/private/tmp/we-bible-app-store-capture-en')
CAPTURE.mkdir(parents=True, exist_ok=True)
for folder in ['components', 'contexts', 'hooks', 'lib', 'utils', 'services', 'domain', 'constants', 'assets', 'app']:
    shutil.copytree(ROOT / folder, CAPTURE / folder, dirs_exist_ok=True)
for file in ['babel.config.js', 'tailwind.config.js', 'global.css', 'tsconfig.json']:
    shutil.copy2(ROOT / file, CAPTURE / file)
if not (CAPTURE / 'node_modules').exists():
    (CAPTURE / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
package = json.loads((ROOT / 'package.json').read_text())
package['main'] = './capture.jsx'
(CAPTURE / 'package.json').write_text(json.dumps(package, indent=2))
(CAPTURE / 'app.json').write_text(json.dumps({'expo': {'name':'We Bible Screenshots', 'slug':'we-bible-screenshots', 'web':{'bundler':'metro','output':'single'}}}))

def write(path, content):
    (CAPTURE / path).parent.mkdir(parents=True, exist_ok=True)
    (CAPTURE / path).write_text(content)

write('metro.config.js', """
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, 'node_modules')];
config.resolver.resolveRequest = (context, name, platform) => {
  if (name === 'expo-sqlite') return {filePath:path.join(__dirname,'capture/sqlite.js'),type:'sourceFile'};
  if (name === 'expo-router' || name === 'expo-router/react-navigation') return {filePath:path.join(__dirname,'capture/router.js'),type:'sourceFile'};
  if (name === '@tanstack/react-query') return {filePath:path.resolve(__dirname,'node_modules/@tanstack/react-query/build/legacy/index.cjs'),type:'sourceFile'};
  return context.resolveRequest(context,name,platform);
};
module.exports = withNativeWind(config,{input:'./global.css'});
""")
write('capture/router.js', """
import {useEffect} from 'react';
const router = {push(){},back(){},replace(){},navigate(){}};
export const useRouter = () => router;
export const useNavigation = () => ({dispatch(){}});
export const useLocalSearchParams = () => ({id:'1',userId:'sample-member'});
export const useFocusEffect = (callback) => useEffect(callback,[callback]);
export const usePreventRemove = () => {};
export const Link = ({children}) => children;
""")
write('capture/sqlite.js', "const db = {}; export const useSQLiteContext=()=>db;")
write('contexts/app-settings.tsx', """
const settings={theme:'light',appLanguage:'en',isReady:true};
export const useAppSettings=()=>settings;
export const useOptionalAppSettings=()=>settings;
export const AppSettingsProvider=({children})=>children;
""")
write('contexts/auth-context.tsx', """
const auth={currentUser:{id:'sample-admin',user_metadata:{display_name:'Daniel'}},dataUserId:'sample-admin',isConfigured:true,isLoadingSession:false,isSyncingData:false};
export const useAuth=()=>auth;
export const AuthProvider=({children})=>children;
""")
write('lib/image-storage.ts', 'export const uploadImageAndSave=async()=>{};')
write('lib/church-metadata.ts', "export * from '@/domain/church/metadata'; export const saveMemberMetadata=async()=>{}; export const metadataErrorMessage=(e,t)=>t('metadata.errors.'+e.message);")
for file in ['components/ads/ad-native-card.tsx','components/ads/ad-banner.tsx']:
    name = 'AdNativeCard' if 'native-card' in file else 'AdBanner'
    write(file, f'export const {name}=()=>null;')

write('capture/fixtures.js', r"""
import {BIBLE_BOOKS} from '@/lib/plan';
export const prayer={id:1,isMyPrayer:true,requester:'Me',relation:'Myself',target:'daily life and faith',contents:[
 {id:3,content:'Help me speak with kindness today. Let small acts of care show Your love to the people I meet.',registeredAt:'2026-09-30 07:00:00'},
 {id:2,content:'Help me make time for Scripture and prayer, even on busy days. Let me begin with gratitude instead of worry.',registeredAt:'2026-09-29 07:00:00'},
 {id:1,content:'Lord, I entrust this week to You. Help me serve faithfully and love the people You place beside me.',registeredAt:'2026-09-28 07:00:00'}]};
export const memo={id:1,title:'Love in the little things',verseText:'1 Corinthians 13:4–7',content:'Love is patient. Love is kind.\n\nToday’s reflection\nLove begins with small acts of patience. Today, I can give others time, attention, and grace.\n\nPut it into practice\nListen to my family without interrupting, and tell them why I am grateful for them.\n\nMy prayer\nLord, help me love others with a gentle heart today.',createdAt:'2026-09-30 07:30:00'};
export const plan={id:1,planName:'Daily reading',planDescription:'',startDate:'2026-09-01',endDate:'2026-11-30',restDay:61,totalReadCount:90,currentReadCount:32,goalPercent:35.56,readCountPerDay:0.95,selectedBookCodes:['genesis','exodus'],goalStatus:BIBLE_BOOKS.map((b,i)=>Array.from({length:b.maxChapter},(_,j)=>i===0&&j<32?1:0))};
export const members=['Daniel','Grace','Hope','Joy','Anna','Faith'].map((name,i)=>({churchId:'1',userId:i===1?'sample-member':i===0?'sample-admin':`sample-${i}`,role:i===0?'super_admin':i===1?'deputy_admin':'member',teamId:'team-1',teamName:'Young Adults',joinedAt:'2026-01-01',updatedAt:'2026-09-30',profile:{userId:`sample-${i}`,displayName:name,email:null,showEmail:false,avatarUrl:null}}));
export const churchDetail={church:{id:'1',name:'Grace Community',description:'Reading Scripture, praying for one another,\nand growing in faith together.',imageUrl:null,memberCount:6,myRole:'super_admin',myTeamName:'Young Adults',myTeamId:'team-1',isSuperAdmin:true,isDeputyAdmin:false,canManageMembers:true,canManagePlans:true,canManageTeams:true,sharedPlanRankingPublic:true,sharedPlanProgressPublic:true},members,pendingJoinRequests:[],prayers:[],teams:[{id:'team-1',name:'Young Adults',leaderName:'Grace',memberCount:6,plans:[]}],plans:[{id:'p1',planName:'New Testament in 90 days',planDescription:'One day at a time, together.',startDate:'2026-09-01',endDate:'2026-11-30',scope:'church',createdByName:'Daniel',memberCount:6,averageGoalPercent:42.8,myGoalPercent:48.1},{id:'p2',planName:'Mornings in the Psalms',planDescription:'Begin each morning with a psalm.',startDate:'2026-09-01',endDate:'2026-10-31',scope:'church',createdByName:'Grace',memberCount:6,averageGoalPercent:68.4,myGoalPercent:71.0}]};
export const fields=[['birth_date','Date of birth','date','1998-05-12'],['email','Email','email','grace@example.com'],['gender','Gender','binary','option_2'],['phone','Phone','phone','+1 202-555-0148'],['address','Address','text','Sample City'],['baptism','Baptism date','date','2016-04-03'],['service','Ministry','text','Worship team · Welcome team']].map(([systemKey,label,dataType,value],i)=>({id:String(i),churchId:'1',systemKey:i<5?systemKey:null,label,dataType,value,options:dataType==='binary'?[{value:'option_1',label:'Male'},{value:'option_2',label:'Female'}]:null,isActive:true,isCopyable:true,editPolicy:'self_and_admins',sortOrder:i,version:1,canEdit:true}));
export const metadata={role:'super_admin',version:1,fields};
export const grass={};
for(let i=0;i<273;i++){const d=new Date(2026,0,1+i);const date=`2026-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; if(i%11!==0||i>244) grass[date]={date,fillYn:false,data:[{bookCode:'psalms',readChapter:Array.from({length:1+(i*7)%5},(_,j)=>j+1)}]};}
export const themeVerse={id:1,year:2026,bookCode:'psalms',chapter:119,verseNumbers:[105],verseText:'Thy word is a lamp unto my feet, and a light unto my path.',memo:'Walking in the light of Your Word'};
""")

def stub_functions(file, prefix, overrides, extra=''):
    source=(ROOT/file).read_text()
    names=re.findall(r'^export (?:async )?function (\w+)',source,re.M)
    write(file, prefix+'\n'+extra+'\n'+'\n'.join(f'export const {n} = {overrides.get(n,"async()=>{}")} ;' for n in names))

stub_functions('utils/prayer-db.ts',"import {prayer} from '@/capture/fixtures';",{'getPrayerById':'async()=>prayer','getAllPrayers':'async()=>[]'})
stub_functions('utils/memo-db.ts',"import {memo} from '@/capture/fixtures';",{'getMemoById':'async()=>memo','getAllMemos':'async()=>[memo]'})
stub_functions('utils/plan-db.ts',"import {plan} from '@/capture/fixtures';",{'getPlanById':'async()=>plan','getAllPlans':'async()=>[plan]'},"export {BIBLE_BOOKS} from '@/lib/plan';")
stub_functions('utils/grass-db.ts',"import {grass} from '@/capture/fixtures';",{'getGrassData':'async()=>grass','getChapterCountForDate':'(data,date)=>(data[date]?.data??[]).reduce((sum,v)=>sum+v.readChapter.length,0)','getStreakUpToYesterday':'()=>({streak:29,includesYesterday:true})'})
stub_functions('utils/bible-storage.ts','',{'getGrassColorThemeFromDb':"async()=>'green'"})
stub_functions('utils/theme-verse-db.ts',"import {themeVerse} from '@/capture/fixtures';",{'getCurrentThemeVerseYear':'()=>2026','getThemeVerseByYear':'async()=>themeVerse','formatThemeVerseNumbers':"v=>v.join(', ')"})
write('hooks/use-churches.ts',"""
import {churchDetail} from '@/capture/fixtures';
export const useChurchDetail=()=>({churchDetail,isLoading:false,error:null});
export const useChurchActions=()=>({});
""")
write('hooks/use-church-metadata.ts',"""
import {metadata,fields} from '@/capture/fixtures';
export const useMemberMetadata=()=>({data:metadata,isError:false,isUnavailable:false,refetch:async()=>{}});
export const useResetMetadata=()=>async()=>{};
const definitions={role:'super_admin',fields};
export const useMetadataDefinitions=()=>({data:definitions,isError:false,refetch:async()=>{}});
export const useMetadataSearch=()=>({data:null,isFetching:false,isError:false});
""")

shutil.copy2(Path(__file__).with_name('capture.jsx'), CAPTURE/'capture.jsx')
print(CAPTURE)

# English-only presentation adjustments in the isolated copy; product sources stay untouched.
plan_path = CAPTURE / 'app/(tabs)/mypage/plan/[id].tsx'
plan_path.write_text(plan_path.read_text().replace('{plan.selectedBookCodes.length}권, 총 {plan.totalReadCount}장', '{plan.selectedBookCodes.length} books, {plan.totalReadCount} chapters'))
grass_path = CAPTURE / 'components/bible-grass.tsx'
grass_path.write_text(grass_path.read_text().replace('`${name} ${chStr}장`', '`${name} ${chStr}`'))
