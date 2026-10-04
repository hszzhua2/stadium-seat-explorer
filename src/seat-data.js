import { CAMP_NOU, CAMP_NOU_STANDS, CAMP_NOU_SECTIONS, getCampNouPosition } from './camp-nou-data.js';
import { BERNABEU, BERNABEU_STANDS, BERNABEU_SECTIONS, getBernabeuPosition } from './bernabeu-data.js';
import { ALLIANZ, ALLIANZ_STANDS, ALLIANZ_SECTIONS, getAllianzPosition } from './allianz-data.js';
import { OLD_TRAFFORD, OLD_TRAFFORD_STANDS, OLD_TRAFFORD_SECTIONS, getOldTraffordPosition } from './old-trafford-data.js';
// All geometry is an explicitly estimated reconstruction, not surveyed seat data.
const ANFIELD = {id:'anfield',name:'Anfield',nameZh:'安菲尔德',pitchWidth:68,pitchLength:101,units:'metres',version:1,defaultSection:'L5'};
const ANFIELD_STANDS = [
  {id:'main',name:'主看台',english:'Main Stand',color:'#b84448'},
  {id:'kenny',name:'肯尼·达格利什看台',english:'Sir Kenny Dalglish Stand',color:'#bd7958'},
  {id:'kop',name:'Kop 看台',english:'The Kop',color:'#bc353e'},
  {id:'road',name:'安菲尔德路看台',english:'Anfield Road Stand',color:'#8a668c'}
];
export const TYPE_LABELS = {seat:'普通座席',standing:'安全站席',accessible:'无障碍位',suite:'包厢视点',dugout:'教练席'};
const sections = [];
function band(side, ids, options) {
  const length = options.length ?? (['main','kenny'].includes(side)?110:84);
  const reverse = options.reverse ?? false;
  ids.forEach((id,index)=>{
    const i=reverse?ids.length-index-1:index;
    const start=-length/2+i*length/ids.length+.55, end=-length/2+(i+1)*length/ids.length-.55;
    sections.push({id,stand:side,side,start,end,label:id,type:'seat',rows:20,tier:'lower',rowDepth:.78,rowRise:.46,frontDistance:40,baseHeight:2,seatsPerRow:Math.max(8,Math.floor((end-start)/.51)),...options});
  });
}
band('main',Array.from({length:10},(_,i)=>`L${i+1}`),{tier:'lower',tierLabel:'下层 · 前段',rows:25,frontDistance:39,baseHeight:2,rowRise:.43});
band('main',Array.from({length:6},(_,i)=>`L${i+11}`),{tier:'lower-rear',tierLabel:'下层 · 后段',rows:12,frontDistance:59,baseHeight:13.2,rowRise:.48});
band('main',Array.from({length:9},(_,i)=>`M${i+1}`),{tier:'middle',tierLabel:'中层 · Hospitality',rows:12,frontDistance:62,baseHeight:22,rowRise:.54,hospitality:true});
band('main',Array.from({length:9},(_,i)=>`U${i+1}`),{tier:'upper',tierLabel:'上层',rows:26,frontDistance:72,baseHeight:32,rowRise:.61});
band('kenny',['KG','KH','KJ','KK','KL','KM','KN','KP'],{tier:'lower',tierLabel:'下层',rows:25,frontDistance:39,baseHeight:2,rowRise:.43});
band('kenny',Array.from({length:9},(_,i)=>`CE${i+1}`),{tier:'upper',tierLabel:'上层',rows:23,frontDistance:61,baseHeight:20,rowRise:.56});
band('kop',Array.from({length:8},(_,i)=>`${i+102}`),{tier:'front',tierLabel:'单层 · 前段',rows:22,frontDistance:56,baseHeight:1.8,rowDepth:.72,rowRise:.43,type:'standing'});
band('kop',Array.from({length:7},(_,i)=>`${i+202}`),{tier:'middle',tierLabel:'单层 · 中段',rows:27,frontDistance:71.84,baseHeight:11.26,rowDepth:.72,rowRise:.43,type:'standing'});
band('kop',['304','305','306'],{tier:'rear',tierLabel:'单层 · 后段',rows:12,frontDistance:91.28,baseHeight:22.87,rowDepth:.72,rowRise:.43,type:'standing'});
band('road',Array.from({length:9},(_,i)=>`AL${i+1}`),{tier:'lower',tierLabel:'下层',reverse:true,rows:25,frontDistance:56,baseHeight:1.8,rowDepth:.75,rowRise:.44,rail:true});
band('road',Array.from({length:8},(_,i)=>`AM${i+1}`),{tier:'upper-front',tierLabel:'上层 · 前段',reverse:true,rows:16,frontDistance:74,baseHeight:17.6,rowDepth:.8,rowRise:.47});
band('road',Array.from({length:8},(_,i)=>`AU${i+1}`),{tier:'upper-rear',tierLabel:'上层 · 后段',reverse:true,rows:18,frontDistance:87,baseHeight:25.12,rowDepth:.8,rowRise:.47});
// Boxes are indicative viewpoints, not official box IDs or actual booking inventory.
band('kenny',['BOX-K1','BOX-K2','BOX-K3','BOX-K4','BOX-K5','BOX-K6'],{type:'suite',tier:'boxes',tierLabel:'Executive boxes · 示意',rows:2,frontDistance:59,baseHeight:16.1,rowDepth:.8,rowRise:.1,seatsPerRow:8,label:'包厢'});
band('main',['BOX-M1','BOX-M2','BOX-M3'],{type:'suite',tier:'boxes',tierLabel:'包厢视点 · 示意',length:45,rows:2,frontDistance:62,baseHeight:19,rowDepth:.8,rowRise:.1,seatsPerRow:8,label:'包厢'});
sections.push(
  {id:'WC-M',stand:'main',side:'main',type:'accessible',tier:'accessible',tierLabel:'无障碍平台 · 示意',label:'主看台无障碍',rows:1,seatsPerRow:12,start:29,end:44,frontDistance:58,baseHeight:12.8,rowDepth:1,rowRise:0},
  {id:'WC-KD',stand:'kenny',side:'kenny',type:'accessible',tier:'accessible',tierLabel:'无障碍平台 · 示意',label:'肯尼看台无障碍',rows:1,seatsPerRow:10,start:30,end:43,frontDistance:58,baseHeight:13,rowDepth:1,rowRise:0},
  {id:'WC-KOP',stand:'kop',side:'kop',type:'accessible',tier:'accessible',tierLabel:'无障碍平台 · 示意',label:'Kop 无障碍',rows:1,seatsPerRow:10,start:-37,end:-24,frontDistance:55,baseHeight:1.7,rowDepth:1,rowRise:0},
  {id:'WC-AR',stand:'road',side:'road',type:'accessible',tier:'accessible',tierLabel:'无障碍平台 · 示意',label:'路看台无障碍',rows:1,seatsPerRow:10,start:24,end:37,frontDistance:55,baseHeight:1.7,rowDepth:1,rowRise:0},
  {id:'DUG-H',stand:'main',side:'main',type:'dugout',tier:'pitchside',tierLabel:'场边 · 主队示意',label:'主队教练席',rows:2,seatsPerRow:10,start:3,end:14,frontDistance:36.8,baseHeight:.05,rowDepth:.9,rowRise:.18},
  {id:'DUG-A',stand:'main',side:'main',type:'dugout',tier:'pitchside',tierLabel:'场边 · 客队示意',label:'客队教练席',rows:2,seatsPerRow:10,start:-14,end:-3,frontDistance:36.8,baseHeight:.05,rowDepth:.9,rowRise:.18}
);
export const VENUES = [ANFIELD, CAMP_NOU, BERNABEU, ALLIANZ, OLD_TRAFFORD];
const venueData = {
  anfield: { stands: ANFIELD_STANDS, sections },
  'camp-nou': { stands: CAMP_NOU_STANDS, sections: CAMP_NOU_SECTIONS, position: getCampNouPosition },
  bernabeu: { stands: BERNABEU_STANDS, sections: BERNABEU_SECTIONS, position: getBernabeuPosition },
  'allianz-arena': { stands: ALLIANZ_STANDS, sections: ALLIANZ_SECTIONS, position: getAllianzPosition },
  'old-trafford': { stands: OLD_TRAFFORD_STANDS, sections: OLD_TRAFFORD_SECTIONS, position: getOldTraffordPosition },
};
export let VENUE=ANFIELD;
export let STANDS=ANFIELD_STANDS;
export let SECTIONS=sections;
export let SECTION_BY_ID = new Map(SECTIONS.map(s=>[s.id,s]));
const exactCoordinates = new Map();
export function setActiveVenue(id='anfield') {
  const next=VENUES.find(venue=>venue.id===id);
  if(!next)throw new Error(`未知球场：${id}`);
  if(next.id!==VENUE.id)exactCoordinates.clear();
  VENUE=next;STANDS=venueData[id].stands;
  SECTIONS=venueData[id].sections;
  SECTION_BY_ID=new Map(SECTIONS.map(section=>[section.id,section]));
  return VENUE;
}
export function getRowSeatCount(section,row=1) {
  if(!section || !Number.isInteger(row)||row<1||row>section.rows) throw new RangeError('排号超出此分区范围');
  return section.rowSeatCounts?.[row-1] ?? section.seatsPerRow;
}
function validateSelection(section,row,seat) {
  if(!section || SECTION_BY_ID.get(section.id)!==section)throw new RangeError('分区不属于当前球场');
  if(!Number.isInteger(seat)||seat<1||seat>getRowSeatCount(section,row)) throw new RangeError('座号超出此排范围');
}
export function getPosition(section,row,seat,eyeHeight=0) {
  validateSelection(section,row,seat);
  if(!Number.isFinite(eyeHeight)||eyeHeight<0||eyeHeight>3) throw new RangeError('眼高必须在 0–3 米之间');
  const exact=exactCoordinates.get(`${section.id}:${row}:${seat}`);
  if(exact) return {x:exact.x,y:exact.y+eyeHeight,z:exact.z,exact:true};
  if(venueData[VENUE.id].position)return venueData[VENUE.id].position(section,row,seat,eyeHeight);
  const along=section.start+(section.end-section.start)*(seat-.5)/getRowSeatCount(section,row);
  const distance=section.frontDistance+(row-1)*section.rowDepth;
  const y=section.baseHeight+(row-1)*section.rowRise+eyeHeight;
  return ['main','kenny'].includes(section.side)
    ? {x:section.side==='main'?-distance:distance,y,z:along,exact:false}
    : {x:along,y,z:section.side==='kop'?distance:-distance,exact:false};
}
export function importCoordinates(data) {
  if(!data || data.version!==1 || !Array.isArray(data.seats) || !data.seats.length || data.seats.length>150000) throw new Error('需使用 version:1 的 seats 数组（1–150000 个位置）');
  if(data.venueId!==undefined&&data.venueId!==VENUE.id)throw new Error('坐标文件的 venueId 与当前球场不一致');
  const next = new Map();
  for(const record of data.seats){
    const section=SECTION_BY_ID.get(record.sectionId);
    if(!section) throw new Error(`未知分区：${record.sectionId}`);
    validateSelection(section,record.row,record.seat);
    if(!['x','y','z'].every(k=>typeof record[k]==='number'&&Number.isFinite(record[k]))) throw new Error('x、y、z 必须为有限数值');
    if(Math.abs(record.x)>1000||Math.abs(record.z)>1000||record.y< -10||record.y>200) throw new Error('坐标超出球场合理范围，请检查米制坐标');
    const key=`${record.sectionId}:${record.row}:${record.seat}`;
    if(next.has(key)) throw new Error(`重复位置：${key}`);
    next.set(key,{x:record.x,y:record.y,z:record.z});
  }
  exactCoordinates.clear(); next.forEach((value,key)=>exactCoordinates.set(key,value));
  return next.size;
}
export function clearCoordinates(){exactCoordinates.clear();}
export function getImportedCount(){return exactCoordinates.size;}
export function defaultEyeHeight(type,posture='auto') {
  if(posture==='standing')return 1.68;
  if(posture==='seated')return 1.15;
  return type==='standing'?1.68:type==='accessible'?1.15:1.15;
}
