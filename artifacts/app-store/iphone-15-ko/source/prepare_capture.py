"""Prepare an isolated, offline screenshot app from the current UI sources."""
from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[4]
CAPTURE = Path('/private/tmp/we-bible-iphone15-capture-ko')
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
const router = {push(path){window.__captureNavigation=path;},back(){},replace(){},navigate(){},setParams(){}};
export const useRouter = () => router;
export const useNavigation = () => ({dispatch(){}});
export const useLocalSearchParams = () => ({id:'1',userId:'sample-member'});
export const useFocusEffect = (callback) => useEffect(callback,[callback]);
export const usePreventRemove = () => {};
export const Link = ({children}) => children;
""")
write('capture/sqlite.js', "const db = {}; export const useSQLiteContext=()=>db;")
write('contexts/app-settings.tsx', """
const settings={theme:'light',appLanguage:'ko',isReady:true};
export const useAppSettings=()=>settings;
export const useOptionalAppSettings=()=>settings;
export const AppSettingsProvider=({children})=>children;
""")
write('contexts/auth-context.tsx', """
const auth={currentUser:{id:'sample-admin',user_metadata:{display_name:'하늘'}},dataUserId:'sample-admin',isConfigured:true,isLoadingSession:false,isSyncingData:false};
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
export const prayer={id:1,isMyPrayer:true,requester:'나',relation:'나 자신',target:'매일의 삶과 믿음',contents:[
 {id:3,content:'오늘 만나는 이웃에게 먼저 따뜻한 말을 건네게 해 주세요. 작은 친절로 사랑을 실천하겠습니다.',registeredAt:'2026-10-20 07:00:00'},
 {id:2,content:'바쁜 하루에도 말씀을 읽고 기도하는 시간을 지키게 해 주세요. 조급함 대신 감사로 하루를 시작합니다.',registeredAt:'2026-10-19 07:00:00'},
 {id:1,content:'새로운 한 주를 주님께 맡깁니다. 맡겨진 자리에서 성실하게 섬기고, 함께하는 사람들을 사랑하게 해 주세요.',registeredAt:'2026-10-18 07:00:00'}]};
export const memo={id:1,title:'작은 일에 담긴 큰 사랑',verseText:'고린도전서 13:4–7',content:'사랑은 오래 참고 사랑은 온유하며\n\n오늘의 묵상\n사랑은 마음에만 머무는 것이 아니라, 상대를 기다려 주는 작은 행동에서 시작됩니다.\n\n오늘의 실천\n가족의 이야기를 끝까지 듣고, 고마운 마음을 말로 전하겠습니다.\n\n나의 기도\n주님, 오늘도 온유한 마음으로 이웃을 사랑하게 해 주세요.',createdAt:'2026-10-20 07:30:00'};
export const plan={id:1,planName:'매일 말씀 읽기',planDescription:'',startDate:'2026-09-01',endDate:'2026-11-30',restDay:61,totalReadCount:90,currentReadCount:32,goalPercent:35.56,readCountPerDay:0.95,selectedBookCodes:['genesis','exodus'],goalStatus:BIBLE_BOOKS.map((b,i)=>Array.from({length:b.maxChapter},(_,j)=>i===0&&j<32?1:0))};
export const members=['김하늘','이은혜','박소망','정기쁨','최사랑','윤믿음'].map((name,i)=>({churchId:'1',userId:i===1?'sample-member':i===0?'sample-admin':`sample-${i}`,role:i===0?'super_admin':i===1?'deputy_admin':'member',teamId:'team-1',teamName:'청년부',joinedAt:'2026-01-01',updatedAt:'2026-10-20',profile:{userId:`sample-${i}`,displayName:name,email:null,showEmail:false,avatarUrl:null}}));
export const churchDetail={church:{id:'1',name:'함께하는 공동체',description:'말씀을 읽고, 서로를 위해 기도하며\n함께 믿음을 키워 가는 우리 공동체',imageUrl:null,memberCount:6,myRole:'super_admin',myTeamName:'청년부',myTeamId:'team-1',isSuperAdmin:true,isDeputyAdmin:false,canManageMembers:true,canManagePlans:true,canManageTeams:true,sharedPlanRankingPublic:true,sharedPlanProgressPublic:true},members,pendingJoinRequests:[],prayers:[],teams:[{id:'team-1',name:'청년부',leaderName:'이은혜',memberCount:6,plans:[]}],plans:[{id:'p1',planName:'함께 읽는 신약 90일',planDescription:'하루 한 걸음, 함께 완주해요.',startDate:'2026-09-01',endDate:'2026-11-30',scope:'church',createdByName:'김하늘',memberCount:6,averageGoalPercent:42.8,myGoalPercent:48.1},{id:'p2',planName:'시편으로 여는 아침',planDescription:'매일 아침, 시편으로 드리는 기도',startDate:'2026-09-01',endDate:'2026-10-31',scope:'church',createdByName:'이은혜',memberCount:6,averageGoalPercent:68.4,myGoalPercent:71.0}]};
export const fields=[['birth_date','생년월일','date','1998-05-12'],['email','이메일','email','grace@example.com'],['gender','성별','binary','option_2'],['phone','연락처','phone','010-0000-0000'],['address','주소','text','서울시 · 예시 주소'],['baptism','세례일','date','2016-04-03'],['service','섬김','text','찬양팀 · 새가족 환영']].map(([systemKey,label,dataType,value],i)=>({id:String(i),churchId:'1',systemKey:i<5?systemKey:null,label,dataType,value,options:dataType==='binary'?[{value:'option_1',label:'남성'},{value:'option_2',label:'여성'}]:null,isActive:true,isCopyable:true,editPolicy:'self_and_admins',sortOrder:i,version:1,canEdit:true}));
export const metadata={role:'super_admin',version:1,fields};
export const grass={};
for(let i=0;i<293;i++){const d=new Date(2026,0,1+i);const date=`2026-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; if(i%11!==0||i>264) grass[date]={date,fillYn:false,data:[{bookCode:'psalms',readChapter:Array.from({length:1+(i*7)%5},(_,j)=>j+1)}]};}
export const themeVerse={id:1,year:2026,bookCode:'psalms',chapter:119,verseNumbers:[105],verseText:'주의 말씀은 내 발에 등이요 내 길에 빛이니이다',memo:'매일 말씀을 따라 걷는 한 해'};
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
