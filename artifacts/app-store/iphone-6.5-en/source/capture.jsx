import React from 'react';
import { registerRootComponent } from 'expo';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ToastProvider } from '@/contexts/toast-context';
import { BibleHeader } from '@/components/bible/bible-header';
import { BibleContent } from '@/components/bible/bible-content';
import { ChapterNav } from '@/components/bible/chapter-nav';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Prayer from '@/app/(tabs)/mypage/prayer/[id]';
import Memo from '@/app/(tabs)/mypage/memo/[id]';
import Grass from '@/app/(tabs)/mypage';
import Plan from '@/app/(tabs)/mypage/plan/[id]';
import Church from '@/app/(tabs)/churches/[id]';
import Metadata from '@/app/(tabs)/churches/[id]/members/[userId]/metadata';
import '@/global.css';

const feature = new URLSearchParams(window.location.search).get('feature') || 'bible';
const noop=()=>{};
const verses=["The LORD is my shepherd; I shall not want.", "He maketh me to lie down in green pastures: he leadeth me beside the still waters.", "He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.", "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.", "Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.", "Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever."].map((primary,i)=>({verse:i+1,primary,secondary:""}));
function Bible(){return <View className="flex-1 bg-white"><BibleHeader bookName="Psalms" chapter={23} langLabel="English" isInitialLocationReady onOpenBookPicker={noop} onOpenLangPicker={noop} onOpenSettings={noop}/><BibleContent loading={false} error={null} verses={verses} dualLang={false} fontScale={1} favoriteVerseNumbers={[1]} memoVerseNumbers={[3]}/><ChapterNav onPrev={noop} onNext={noop}/></View>}
const screens={bible:Bible,prayer:Prayer,memo:Memo,grass:Grass,plan:Plan,church:Church,metadata:Metadata};
const Screen=screens[feature]||Bible;
const activeTab=feature==='bible'?'bible':['church','metadata'].includes(feature)?'church':'mypage';
function App(){return <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:414,height:896},insets:{top:0,bottom:0,left:0,right:0}}}><GluestackUIProvider mode="light"><ToastProvider><View style={{height:'100%',backgroundColor:'#f9fafb'}}>
  <View style={{height:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:27,backgroundColor:'#fff'}}><Text style={{fontSize:15,fontWeight:'600'}}>9:41</Text><View style={{flexDirection:'row',gap:5,alignItems:'center'}}><Svg width={18} height={13} viewBox="0 0 18 13">{[4,7,10,13].map((h,i)=><Rect key={i} x={i*4.5} y={13-h} width={3.3} height={h} rx={.6} fill="#1f2937"/>)}</Svg><Svg width={16} height={13} viewBox="0 0 18 14"><Path d="M1 3.5 Q9 -2 17 3.5 M3.8 6.5 Q9 2.8 14.2 6.5 M6.5 9.5 Q9 7.7 11.5 9.5" fill="none" stroke="#1f2937" strokeWidth={1.8} strokeLinecap="round"/><Circle cx={9} cy={12} r={1.2} fill="#1f2937"/></Svg><View style={{width:23,height:11,borderWidth:1,borderRadius:3,padding:1.5,borderColor:'#1f2937'}}><View style={{flex:1,backgroundColor:'#1f2937',borderRadius:1}}/></View></View></View>
  <View style={{flex:1,overflow:'hidden'}}><Screen/></View>
  <View style={{height:53,flexDirection:'row',borderTopWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff'}}>{[['menu-book','Bible','bible'],['groups','Community','church'],['account-circle','My Page','mypage'],['settings','Settings','settings']].map(([name,label,key])=><View key={key} style={{flex:1,alignItems:'center',justifyContent:'center',gap:3}}><MaterialIcons name={name} size={28} color={key===activeTab?'#0a7ea4':'#8e8e93'}/><Text style={{fontSize:11,color:key===activeTab?'#0a7ea4':'#8e8e93'}}>{label}</Text></View>)}</View>
  <View style={{height:26,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'}}><View style={{width:132,height:5,borderRadius:4,backgroundColor:'#141823'}}/></View>
  </View></ToastProvider></GluestackUIProvider></SafeAreaProvider></GestureHandlerRootView>}
registerRootComponent(App);
