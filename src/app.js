import { StadiumViewer } from './stadium.js';
import { GoogleOverview } from './google-overview.js';
import { localToGeographic, GEO_REFERENCE, CAMP_NOU_GEO_REFERENCE, BERNABEU_GEO_REFERENCE, ALLIANZ_GEO_REFERENCE, OLD_TRAFFORD_GEO_REFERENCE } from './georeference.js';
import { VENUE, VENUES, SECTIONS, STANDS, TYPE_LABELS, SECTION_BY_ID, setActiveVenue, getPosition, getRowSeatCount, defaultEyeHeight, importCoordinates, clearCoordinates } from './seat-data.js';
import { VENUE_UI } from './venue-ui.js';

const $ = id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
setActiveVenue(VENUES.some(venue=>venue.id===query.get('venue'))?query.get('venue'):'anfield');
const venueUI=VENUE_UI[VENUE.id];
const curvedMap=Boolean(venueUI);
const geoReference=({'camp-nou':CAMP_NOU_GEO_REFERENCE,bernabeu:BERNABEU_GEO_REFERENCE,'allianz-arena':ALLIANZ_GEO_REFERENCE,'old-trafford':OLD_TRAFFORD_GEO_REFERENCE})[VENUE.id]||GEO_REFERENCE;
const modelLabel=venueUI?.modelLabel||'程序重建 · 估算模型';
const initial=SECTION_BY_ID.get(query.get('section'))??SECTION_BY_ID.get(VENUE.defaultSection)??SECTIONS[0];
const positiveInt=(n,max,fallback)=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=max?Number(n):fallback;
const initialRow=positiveInt(query.get('row'),initial.rows,Math.min(12,initial.rows)),initialSeatCount=getRowSeatCount(initial,initialRow);
const state={section:initial,row:initialRow,seat:positiveInt(query.get('seat'),initialSeatCount,Math.min(10,initialSeatCount)),type:'all',mode:'seat',lighting:query.get('light')==='night'?'night':'day',posture:['seated','standing'].includes(query.get('posture'))?query.get('posture'):'auto',fov:65};
let viewer,toastTimer,sceneReady=false,googleMap,googleReady=false;
let overviewSource='local',googleLoadActive=false,googleFailure='',exteriorFocusId=null;
let importBusy=false;
function setImportBusy(value){importBusy=value;['model-file','coordinate-file','reset-data'].forEach(id=>{$(id).disabled=value;});}
const SOURCE_ITEMS=[
 {title:'Liverpool FC · 大门与检票入口图',url:'https://backend.liverpoolfc.com/sites/default/files/2026-01/LFC_Visiting_Fans_Booklet_be6a8654d01a9d32e6362c4ee2d2bd30.pdf',tag:'官方 · 2025/26 访问指南第 5 页',text:'核对 Shankly、Paisley 与四看台入口组的位置关系；具体门栏坐标与尺寸为估算。'},
 {title:'Paisley Gateway · 公开照片参考',url:'https://commons.wikimedia.org/wiki/File:Paisley_Gateway,_Anfield.jpg',tag:'Phil Nash · 2018 · CC BY-SA 4.0',text:'用于观察铁门、砖柱、三只欧洲杯与盾徽的外观，没有将照片内置为贴图。'},
 {title:'Liverpool FC · 扩建后官方航拍',url:'https://www.liverpoolfc.com/news/anfield-crowned-uks-best-landmark-remarkable-venue-awards-2024',tag:'官方 · 建筑外观参考',text:'本地屋顶、外墙及桁架依据航拍形态改进；尺寸与街区仍为近似重建。'},
 {title:'Google Maps · 真实三维地图',url:'https://developers.google.com/maps/documentation/javascript/3d/overview',tag:'官方 API · 本机配置 key 后加载',text:'使用 Google 在线三维地图；实际覆盖与影像年份由 Google 提供。标记来自本应用的估算位置。'},
 {title:'3D Digital Venue · 外部座位视野',url:'https://map.3ddigitalvenue.com/liverpool',tag:'分区与逐座渲染视野 · 外部服务',text:'可对照真实分区与观赛视野。未发现可再分发的原始模型或逐座 XYZ 导出。'},
 {title:'扩建后安菲尔德分区图',url:'https://www.eventmasters.co.uk/event-guides/football-hospitality/liverpool-hospitality/anfield-seating-plan.pdf',tag:'Eventmasters · 平面分区依据',text:'用于核对 L、M、U、CE、AL、AM、AU 与 Kop 分区排列。'},
 {title:'Anfield · PeeJaa 2024 三维模型',url:'https://sketchfab.com/3d-models/anfield-stadium-337f6ba6199a4a13b69bbacca53572fd',tag:'Sketchfab · 有正规下载选项',text:'页面标有 Free Standard / NoAI 条件；未下载或内置。版本与座位对应关系仍需校准。'},
 {title:'Anfield · Ihnder 摄影测量模型',url:'https://sketchfab.com/3d-models/anfield-stadium-liverpool-fc-195492f2612e404281d6dfae7f382a2d',tag:'Sketchfab · 2021 旧版候选',text:'作者提供 Blender 模型信息，需另行确认文件和许可；早于新安菲尔德路扩建。'},
 {title:'Liverpool FC · 安全护栏座席',url:'https://www.liverpoolfc.com/news/rail-seating-be-installed-remainder-kop',tag:'官方 · Kop rail seating',text:'Kop 全面安装护栏座席；本原型站姿仍绑定单个位置。'},
 {title:'Liverpool FC · Main Executive Boxes',url:'https://events.liverpoolfc.com/event-spaces/main-stand/main-stand-executive-boxes',tag:'官方 · 独立包厢资料',text:'官方确认面向球场的玻璃立面；本站包厢内部位置及编号为示意。'},
 {title:'Liverpool FC · Kenny Executive Boxes',url:'https://events.liverpoolfc.com/event-spaces/sir-kenny-dalglish-stand/sir-kenny-dalglish-stand-executive-boxes',tag:'官方 · 独立包厢资料',text:'Kenny 看台的独立包厢，与 hospitality 酒廊套餐区别建模。'},
 {title:'Liverpool FC · 主看台教练席',url:'https://www.liverpoolfc.com/news/announcements/231108-reds-to-open-main-stand-for-stadium-tours',tag:'官方 · managerial dugout',text:'主看台场边教练席为官方游览位置；主客两边与座椅数量为估算。'}
];
const ANFIELD_DESCRIPTIONS={
 main:['在主看台，感受比赛的全貌。','Main Stand 是球场边线一侧的高大看台，在这个坐标系中位于 −X。下、中、上三层带来不同俯角，中层包含 hospitality 座区，场边中央附近是教练与替补席。'],
 kenny:['从肯尼看台，望向安菲尔德的主舞台。','Sir Kenny Dalglish Stand 位于主看台对面，包含上下两层和中间的独立包厢。边线视角适合观察队形和攻防移动。包厢位置在本原型中为示意。'],
 kop:['走进 Kop，面向整片球场。','Kop 是连续的单层斜面，100、200、300 分区代表前、中、后段。护栏座席允许在对应位置坐或站；改变眼高可体验两种姿态。'],
 road:['从安菲尔德路端，看向传奇的 Kop。','Anfield Road Stand 是扩建后的两层看台。AL 为下层，AM 与 AU 为上方连续看台的不同排带；AM 在官方票务资料中称 Middle Tier（中区）。下层护栏站席区域未逐排核实，因此本原型仅提供示意的坐、站姿视点。']
};
const DESCRIPTIONS=venueUI?.descriptions||ANFIELD_DESCRIPTIONS;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3300);}
function setDetail(panel,scroll=false){document.querySelectorAll('.details-tabs button').forEach(b=>{const active=b.dataset.panel===panel;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});['about','sources','import'].forEach(id=>$(id+'-panel').classList.toggle('hidden',id!==panel));if(scroll)document.querySelector('.details-section').scrollIntoView({behavior:'smooth',block:'start'});}
function options(select,values,selected){select.replaceChildren(...values.map(({value,label})=>{const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=value===selected;return option;}));}
function standName(section){return STANDS.find(s=>s.id===section.stand);}
function allowed(section){return state.type==='all'||section.type===state.type;}
const SVG_NS='http://www.w3.org/2000/svg';
function svg(tag,attrs={},text){const node=document.createElementNS(SVG_NS,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));if(text!==undefined)node.textContent=text;return node;}
const mapScale=curvedMap?1.5:1.75,mapX=240,mapY=253;
const mapLabels=venueUI?.mapLabels||['ANFIELD ROAD','THE KOP','MAIN STAND','SIR KENNY DALGLISH'];
function project(p){return {x:mapX+p.x*mapScale,y:mapY+p.z*mapScale};}
function drawMap(){
 const map=$('stadium-map');map.replaceChildren();
 const p={x:mapX-VENUE.pitchWidth/2*mapScale,y:mapY-VENUE.pitchLength/2*mapScale,w:VENUE.pitchWidth*mapScale,h:VENUE.pitchLength*mapScale};
 map.append(svg('rect',{x:46,y:45,width:388,height:419,rx:60,fill:'var(--map-surface)'}));
 map.append(svg('text',{x:240,y:39,class:'stand-label'},mapLabels[0]));
 map.append(svg('text',{x:240,y:475,class:'stand-label'},mapLabels[1]));
 map.append(svg('text',{x:28,y:252,class:'stand-label',transform:'rotate(-90 28 252)'},mapLabels[2]));
 map.append(svg('text',{x:450,y:252,class:'stand-label',transform:'rotate(90 450 252)'},mapLabels[3]));
 map.append(svg('rect',{x:p.x-9,y:p.y-9,width:p.w+18,height:p.h+18,rx:5,fill:'var(--map-border)'}));
 map.append(svg('rect',{x:p.x,y:p.y,width:p.w,height:p.h,class:'map-pitch'}));
 for(let i=0;i<12;i+=2)map.append(svg('rect',{x:p.x,y:p.y+p.h*i/12,width:p.w,height:p.h/12,fill:'var(--map-stripe)',opacity:.28}));
 map.append(svg('rect',{x:p.x+3,y:p.y+3,width:p.w-6,height:p.h-6,class:'map-line'}));
 map.append(svg('line',{x1:p.x,y1:mapY,x2:p.x+p.w,y2:mapY,class:'map-line'}));
 map.append(svg('circle',{cx:mapX,cy:mapY,r:9.15*mapScale,class:'map-line'}));
 for(const end of [-1,1]){
   const edge=end<0?p.y:p.y+p.h;
   map.append(svg('rect',{x:mapX-20.16*mapScale,y:end<0?edge:edge-16.5*mapScale,width:40.32*mapScale,height:16.5*mapScale,class:'map-line'}));
   map.append(svg('rect',{x:mapX-9.16*mapScale,y:end<0?edge:edge-5.5*mapScale,width:18.32*mapScale,height:5.5*mapScale,class:'map-line'}));
 }
 map.append(svg('text',{x:mapX,y:mapY+34,fill:'#fff','font-size':8,'text-anchor':'middle','letter-spacing':1.8},`${VENUE.pitchLength} × ${VENUE.pitchWidth} m`));
 const groups=[];
 for(const section of SECTIONS){
   const vertical=['main','kenny'].includes(section.side),depth=Math.max(section.rows*section.rowDepth,section.type==='accessible'?2.2:section.type==='dugout'?3.4:1.5);
   const corner=vertical?{x:section.side==='main'?-(section.frontDistance+depth):section.frontDistance,y:0,z:section.start}:{x:section.start,y:0,z:section.side==='road'?-(section.frontDistance+depth):section.frontDistance};
   const xy=project(corner),width=(vertical?depth:section.end-section.start)*mapScale,height=(vertical?section.end-section.start:depth)*mapScale;
   const color=section.type==='dugout'?'var(--map-dugout)':section.type==='suite'?'var(--map-suite)':section.type==='accessible'?'var(--map-accessible)':`var(--map-${section.side})`;
   const g=svg('g',{'tabindex':allowed(section)?0:-1,'role':'button','aria-label':`${standName(section).name} ${section.label} ${TYPE_LABELS[section.type]}`});
   const appearance={fill:color,class:`section${section.id===state.section.id?' selected':''}${!allowed(section)?' dimmed':''}`,'data-section':section.id};
   let rect,labelPoint={x:xy.x+width/2,y:xy.y+height/2};
   if(curvedMap){
     const points=[];
     for(const [row,outward] of [[1,-.5],[section.rows,.5]]){
       const edge=[],count=getRowSeatCount(section,row);
       for(let i=0;i<=8;i++){
         const seat=1+Math.round((count-1)*i/8),base=getPosition(section,row,seat,0),radius=Math.hypot(base.x,base.z)||1;
         edge.push(project({x:base.x+base.x/radius*outward,z:base.z+base.z/radius*outward}));
       }
       points.push(...(outward>0?edge.reverse():edge));
     }
     rect=svg('polygon',{points:points.map(point=>`${point.x},${point.y}`).join(' '),...appearance});
     const middleRow=Math.ceil(section.rows/2);
     labelPoint=project(getPosition(section,middleRow,Math.ceil(getRowSeatCount(section,middleRow)/2),0));
   }else rect=svg('rect',{x:xy.x,y:xy.y,width,height,rx:section.type==='dugout'?2:1,...appearance});
   g.append(rect,svg('title',{},`${section.id} · ${section.tierLabel} · ${TYPE_LABELS[section.type]}`));
  if(curvedMap||width>6&&height>7){
   let label=section.mapLabel||(section.type==='suite'?'BOX':section.type==='accessible'?'W':section.type==='dugout'?(section.id.endsWith('-H')?'H':'A'):curvedMap?section.id.replace('-','·'):section.id);
   const attrs={x:labelPoint.x,y:labelPoint.y,class:'section-label',opacity:allowed(section)?1:.25};
   if(['bernabeu','allianz-arena','old-trafford'].includes(VENUE.id)&&['seat','standing'].includes(section.type)){
    // Short labels follow the curved rows; full IDs remain in controls.
    const shortId=VENUE.id==='old-trafford'&&section.layout==='corner'?section.id.replace(/^OT-/,''):section.id.replace(/^(?:OT-[NSEW]|A[WENS]|[OENS])/,'');
    label=section.mapLabel||shortId.replace('-','·');
    const middleRow=Math.ceil(section.rows/2),a=getPosition(section,middleRow,1),b=getPosition(section,middleRow,getRowSeatCount(section,middleRow));
    let angle=Math.atan2(b.z-a.z,b.x-a.x)*180/Math.PI;
    if(angle>90)angle-=180;if(angle< -90)angle+=180;
    attrs.transform=`rotate(${angle} ${labelPoint.x} ${labelPoint.y})`;
   }
   attrs.style=`font-size:${label.length>3?6:7}px`;
   g.append(svg('text',attrs,label));
  }
   const action=()=>{if(allowed(section))selectSection(section);};g.addEventListener('click',action);g.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();action();}});
   groups.push(g);
 }
 groups.forEach(g=>map.append(g));
 const selected=project(getPosition(state.section,state.row,state.seat,0));
 if(selected.x>=0&&selected.x<=480&&selected.y>=0&&selected.y<=490){map.append(svg('circle',{cx:selected.x,cy:selected.y,r:5,fill:'#fff',stroke:'var(--red)','stroke-width':2,'pointer-events':'none'}));map.append(svg('circle',{cx:selected.x,cy:selected.y,r:1.6,fill:'var(--red)','pointer-events':'none'}));}
}
function drawGrid(){
 const grid=$('seat-grid');grid.replaceChildren();
 for(let row=1;row<=state.section.rows;row++){
  const line=document.createElement('div');line.className='grid-row';
  const label=document.createElement('span');label.textContent=String(row).padStart(2,'0');line.append(label);
  for(let seat=1;seat<=getRowSeatCount(state.section,row);seat++){
   const button=document.createElement('button');button.title=`示意排 ${row} · 位置 ${seat}`;button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(row===state.row&&seat===state.seat));if(row===state.row&&seat===state.seat)button.className='selected';
   button.addEventListener('click',()=>{state.row=row;state.seat=seat;update();});line.append(button);
  }grid.append(line);
 }
}
function syncUrl(){const q=new URLSearchParams({venue:VENUE.id,section:state.section.id,row:state.row,seat:state.seat});if(state.lighting==='night')q.set('light','night');if(state.posture!=='auto')q.set('posture',state.posture);history.replaceState(null,'',`${location.pathname}?${q}`);}
function selectSection(section){state.section=section;state.row=Math.min(state.row,section.rows);state.seat=Math.min(state.seat,getRowSeatCount(section,state.row));state.mode=overviewSource==='google'?'overview':'seat';update();}
function update(move=true){
 if(move||state.mode!=='overview'||overviewSource==='google')exteriorFocusId=null;
 const section=state.section,stand=standName(section),eyeHeight=defaultEyeHeight(section.type,state.posture),position=getPosition(section,state.row,state.seat,eyeHeight);
 options($('stand-select'),STANDS.map(s=>({value:s.id,label:s.name})),stand.id);
 options($('section-select'),SECTIONS.filter(s=>s.stand===stand.id&&allowed(s)).map(s=>({value:s.id,label:`${s.id} · ${s.type==='suite'?'示意包厢':s.type==='dugout'?s.label:s.tierLabel}`})),section.id);
 $('row-input').max=section.rows;$('row-input').value=state.row;$('seat-input').max=getRowSeatCount(section,state.row);$('seat-input').value=state.seat;
 $('row-input').setAttribute('aria-label',`示意排，1 至 ${section.rows}`);$('seat-input').setAttribute('aria-label',`示意位置，1 至 ${getRowSeatCount(section,state.row)}`);
 $('view-title').textContent=`${stand.english} · ${section.id}`;$('view-type').textContent=TYPE_LABELS[section.type];$('summary-type').textContent=TYPE_LABELS[section.type];$('summary-tier').textContent=`${stand.name} · ${section.tierLabel}`;
 $('summary-coordinate').textContent=`X ${position.x.toFixed(2)} / Y ${position.y.toFixed(2)} / Z ${position.z.toFixed(2)}`;
 $('coordinate-status').textContent=position.exact?'已导入坐标 · 精度以文件为准':'程序估算 · 球场中心为原点';
 $('overlay-seat').textContent=`${section.id} · 示意排 ${state.row} · 位置 ${state.seat}`;
 $('posture').value=state.posture;$('eye-height-label').textContent=`眼高 ${eyeHeight.toFixed(2)} m · 相对地面/基座`;
 const notes={suite:'包厢为示意编号；此视点在面向球场的阳台/前缘。',dugout:venueUI?.dugoutNote||'主、客队教练席方向与椅数为估算，不属于可售观众票位。',standing:'安全站席对应单个位置。默认站姿，亦可切换坐姿。',accessible:'无障碍平台位置为示意，不作为实际无障碍设施导航。',seat:'分区内排座为局部示意编号，可导入坐标替换对应视点。'};
 $('selection-note').textContent=notes[section.type]+(curvedMap?' 分区代码与排座编号均为示意。':'');
 $('about-heading').textContent=DESCRIPTIONS[stand.id][0];$('about-description').textContent=DESCRIPTIONS[stand.id][1];
 $('seat-mode').classList.toggle('active',state.mode==='seat');$('overview-mode').classList.toggle('active',state.mode==='overview');$('interaction-hint').textContent=state.mode==='seat'?'拖动环视 · 滚轮调整视野':'拖动旋转 · 滚轮缩放球场';$('exterior-focus').value=exteriorFocusId||'overview';$('cutaway-toggle').disabled=overviewSource==='google'||Boolean(exteriorFocusId);if(exteriorFocusId){$('overlay-seat').textContent=$('exterior-focus').selectedOptions[0].textContent;$('interaction-hint').textContent='拖动查看入口 · 滚轮缩放';}
 drawMap();drawGrid();syncUrl();
 if(viewer&&move){viewer.setPosition(position,{animate:true});viewer.setOverview(state.mode==='overview');}
 if(googleReady)googleMap.setPosition(localToGeographic(position,geoReference),`${VENUE.nameZh} · ${section.id} · 排 ${state.row} · 位置 ${state.seat}（估算）`);
}
function setMode(mode){exteriorFocusId=null;if(mode==='seat')useLocalView();state.mode=mode;update(false);viewer?.setOverview(mode==='overview');}
function syncOverviewUI(){
 const google=overviewSource==='google';
 $('scene').classList.toggle('hidden',google);$('google-scene').classList.toggle('hidden',!google);$('google-info').classList.toggle('hidden',!google);
 $('exterior-controls').classList.toggle('hidden',google);
 $('local-overview').classList.toggle('active',!google);$('google-overview').classList.toggle('active',google);
 document.querySelectorAll('.view-label,.view-tools,.view-bottom-overlay').forEach(el=>el.classList.toggle('hidden',google));
 ['day-mode','night-mode','crowd-toggle','fov','cutaway-toggle'].forEach(id=>$(id).disabled=google);
 $('cutaway-toggle').disabled=google||Boolean(exteriorFocusId);
 googleMap?.setVisible(google);
}
function useLocalView(){overviewSource='local';googleLoadActive=false;$('google-config').classList.add('hidden');syncOverviewUI();}
function showGoogleView(){
 googleLoadActive=true;exteriorFocusId=null;state.mode='overview';update(false);viewer?.setOverview(true);
 if(!googleReady||googleFailure){$('google-config').classList.remove('hidden');if(googleFailure)$('google-status').textContent=googleFailure;$('google-key').focus();return;}
 overviewSource='google';$('google-config').classList.add('hidden');syncOverviewUI();update(false);
}
googleMap=new GoogleOverview($('google-scene'),{venue:{name:VENUE.nameZh,center:{lat:geoReference.lat,lng:geoReference.lng,altitude:0},heading:315,range:curvedMap?750:650,tilt:62},onStatus:message=>{$('google-status').textContent=message;},onError:message=>{googleFailure=message;$('google-status').textContent=message;if(googleLoadActive||overviewSource==='google'){$('google-config').classList.remove('hidden');toast(message);}}});
$('local-overview').addEventListener('click',()=>{useLocalView();setMode('overview');});
$('google-overview').addEventListener('click',showGoogleView);
$('map-settings').addEventListener('click',()=>{googleLoadActive=true;$('google-config').classList.remove('hidden');$('google-key').focus();});
$('cancel-google').addEventListener('click',useLocalView);
$('cutaway-toggle').addEventListener('change',()=>viewer?.setCutaway($('cutaway-toggle').checked));
$('exterior-focus').addEventListener('change',()=>{const id=$('exterior-focus').value,label=$('exterior-focus').selectedOptions[0].textContent;exteriorFocusId=null;useLocalView();state.mode='overview';update(false);if(id==='overview'){viewer?.setOverview(true);return;}if(!viewer?.focusExterior?.(id)){viewer?.setOverview(true);toast('该入口近览仅适用于本地建筑模型');return;}exteriorFocusId=id;$('exterior-focus').value=id;$('cutaway-toggle').disabled=true;$('overlay-seat').textContent=label;$('interaction-hint').textContent='拖动查看入口 · 滚轮缩放';});
$('load-google').addEventListener('click',async()=>{
 const key=$('google-key').value.trim();if(!key){$('google-status').textContent='请在本机输入 API key；也可以使用下方无需密钥的 Google Earth 参考。';return;}
 $('load-google').disabled=true;googleLoadActive=true;googleFailure='';
 try{await googleMap.load(key);googleReady=true;$('google-key').value='';if(googleLoadActive){showGoogleView();toast('Google 3D 组件已初始化，影像由 Google 继续加载');}else googleMap.setVisible(false);}
 catch(error){$('google-status').textContent=error.message;}
 finally{$('load-google').disabled=false;}
});
function setLighting(light){state.lighting=light;$('day-mode').classList.toggle('active',light==='day');$('night-mode').classList.toggle('active',light==='night');$('lighting-label').textContent=light==='day'?'DAYLIGHT':'MATCH NIGHT';viewer?.setLighting(light);syncUrl();}
function setMapTab(tab){const grid=tab==='seats';$('map-wrap').classList.toggle('hidden',grid);$('seat-grid-wrap').classList.toggle('hidden',!grid);$('map-tab').classList.toggle('active',!grid);$('seats-tab').classList.toggle('active',grid);$('map-caption').textContent=grid?'点击单个位置进入视野':'点击分区切换视点';}
$('type-filters').addEventListener('click',event=>{const button=event.target.closest('[data-type]');if(!button)return;state.type=button.dataset.type;document.querySelectorAll('#type-filters button').forEach(b=>b.classList.toggle('active',b===button));if(!allowed(state.section))selectSection(SECTIONS.find(s=>s.stand===state.section.stand&&allowed(s))??SECTIONS.find(allowed));else update(false);});
$('stand-select').addEventListener('change',()=>{const section=SECTIONS.find(s=>s.stand===$('stand-select').value&&allowed(s));if(section)selectSection(section);else{state.type='all';document.querySelectorAll('#type-filters button').forEach(b=>b.classList.toggle('active',b.dataset.type==='all'));selectSection(SECTIONS.find(s=>s.stand===$('stand-select').value));toast('该看台没有此类示意视点，已显示全部类型');}});
$('section-select').addEventListener('change',()=>selectSection(SECTION_BY_ID.get($('section-select').value)));
function applyNumbers(){const row=Number($('row-input').value),seat=Number($('seat-input').value);if(!Number.isInteger(row)||row<1||row>state.section.rows){toast(`排号需为 1–${state.section.rows} 的整数`);update(false);return;}const max=getRowSeatCount(state.section,row);if(!Number.isInteger(seat)||seat<1||seat>max){toast(`位置需为 1–${max} 的整数`);update(false);return;}useLocalView();state.row=row;state.seat=seat;state.mode='seat';update();}
$('enter-seat').addEventListener('click',applyNumbers);
function applyRowChange(){const row=Number($('row-input').value);if(Number.isInteger(row)&&row>=1&&row<=state.section.rows)$('seat-input').value=Math.min(Number($('seat-input').value),getRowSeatCount(state.section,row));applyNumbers();}
$('row-input').addEventListener('change',applyRowChange);
$('seat-input').addEventListener('change',applyNumbers);
['row-input','seat-input'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter')(id==='row-input'?applyRowChange:applyNumbers)();}));
$('map-tab').addEventListener('click',()=>setMapTab('map'));$('seats-tab').addEventListener('click',()=>setMapTab('seats'));
$('seat-mode').addEventListener('click',()=>setMode('seat'));$('overview-mode').addEventListener('click',()=>setMode('overview'));
$('day-mode').addEventListener('click',()=>setLighting('day'));$('night-mode').addEventListener('click',()=>setLighting('night'));
$('crowd-toggle').addEventListener('change',()=>viewer?.setCrowd($('crowd-toggle').checked));
$('posture').addEventListener('change',()=>{state.posture=$('posture').value;update();});
$('fov').addEventListener('input',()=>{state.fov=Number($('fov').value);$('fov-value').textContent=`${state.fov}°`;viewer?.setFov(state.fov);});
$('reset-view').addEventListener('click',()=>{if(overviewSource==='google')googleMap?.resetView();else{viewer?.resetView();exteriorFocusId=null;update(false);}toast('视线已回到球场中央');});
$('capture-view').addEventListener('click',()=>{try{if(!viewer)throw new Error('三维视图尚未就绪');const dataUrl=viewer.screenshot();$('capture-download')?.remove();const link=document.createElement('a');link.id='capture-download';link.href=dataUrl;link.download=`${VENUE.id}-${state.section.id}-r${state.row}-s${state.seat}.png`;link.textContent='下载 PNG';const preview=document.createElement('img');preview.src=dataUrl;preview.alt='刚刚生成的视野截图';link.prepend(preview);link.title='下载刚刚生成的视野截图';document.querySelector('.view-tools').append(link);link.click();toast('视野截图已生成，可点击右上方下载 PNG');}catch(error){toast(`截图失败：${error.message}`);}});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewport').requestFullscreen();}catch{toast('当前浏览器不支持全屏，请在普通浏览器打开');}});
$('share-position').addEventListener('click',async()=>{syncUrl();try{await navigator.clipboard.writeText(location.href);toast('位置链接已复制；导入文件需在对方本机重新加载');}catch{const input=document.createElement('textarea');input.value=location.href;document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();toast(ok?'位置链接已复制':'复制失败，可复制浏览器地址栏中的位置链接');}});
document.querySelectorAll('.details-tabs button').forEach(b=>b.addEventListener('click',()=>setDetail(b.dataset.panel)));
$('sources-nav').addEventListener('click',()=>setDetail('sources',true));

function configureVenue(){
 document.body.dataset.venue=VENUE.id;
 document.title=VENUE.name+' · 座位视野探索';
 document.querySelector('meta[name="description"]').content=VENUE.nameZh+'四看台选位与三维观赛视野，本机交互原型。';
 document.querySelector('meta[name="theme-color"]').content=venueUI?.theme||'#e31b23';
 $('brand-title').textContent=venueUI?.brand||VENUE.name.toUpperCase();$('brand-letter').textContent=venueUI?.letter||'A';
 document.querySelector('.brand').href='?venue='+VENUE.id;
 document.querySelector('.brand').setAttribute('aria-label',VENUE.nameZh+'视野首页');
 $('venue-select').value=VENUE.id;$('venue-heading').textContent='找到你的'+VENUE.nameZh+'视角。';
 $('view-type-count').textContent=new Set(SECTIONS.map(section=>section.type)).size;
 $('stadium-map').setAttribute('aria-label',VENUE.nameZh+'分区平面选位图');
 $('google-scene').setAttribute('aria-label','Google '+VENUE.nameZh+'三维地图');
 $('loading').querySelector('strong').textContent='正在走进'+VENUE.nameZh;
 $('footer-venue').textContent=VENUE.name.toUpperCase()+' VIEW EXPLORER';
 document.querySelectorAll('#type-filters button').forEach(button=>{button.hidden=button.dataset.type!=='all'&&!SECTIONS.some(section=>section.type===button.dataset.type);});
 if(venueUI){
  document.querySelector('link[rel="icon"]').href='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${venueUI.theme}"/><text x="32" y="47" text-anchor="middle" font-family="Arial,sans-serif" font-size="44" font-weight="700" fill="${venueUI.accent}">${venueUI.letter}</text></svg>`);
  $('venue-eyebrow').textContent=venueUI.eyebrow;$('venue-edition').textContent=venueUI.edition;$('venue-model-note').textContent=venueUI.note;
  $('map-orientation').textContent=venueUI.orientation;$('model-label').textContent=modelLabel;
  $('accuracy-heading').textContent=venueUI.accuracyTitle;$('accuracy-description').textContent=venueUI.accuracy;
  $('sources-intro').textContent=venueUI.sourceIntro;
  $('source-coverage-title').textContent=venueUI.sourceTitle;$('source-coverage-description').textContent=venueUI.coverage;$('source-special-description').textContent=venueUI.special;
  $('import-coordinate-description').textContent=venueUI.coordinates;
  $('earth-reference').href=venueUI.earthUrl;$('venue-view-reference').href=venueUI.referenceUrl;$('venue-view-reference').textContent=venueUI.referenceLabel;
  $('coordinate-sample').href=`./samples/${VENUE.id}-coordinates.example.json`;$('coordinate-sample').download=`${VENUE.id}-coordinates.json`;
  $('footer-motto').textContent=venueUI.motto;
  $('google-status').textContent=venueUI.googleNotice;
 }
 const sampleSection=SECTION_BY_ID.get(VENUE.defaultSection)||SECTIONS[0],base=getPosition(sampleSection,1,1,0);
 $('coordinate-schema').textContent=JSON.stringify({version:1,venueId:VENUE.id,seats:[{sectionId:sampleSection.id,row:1,seat:1,x:+base.x.toFixed(2),y:+base.y.toFixed(2),z:+base.z.toFixed(2)}]},null,2);
}
$('venue-select').addEventListener('change',()=>{
 const id=$('venue-select').value;if(!VENUES.some(venue=>venue.id===id)||id===VENUE.id)return;
 const next=new URL(location.href);next.search='';next.searchParams.set('venue',id);if(state.lighting==='night')next.searchParams.set('light','night');location.assign(next.href);
});

$('source-list').replaceChildren(...(venueUI?.sources||SOURCE_ITEMS).map(source=>{const div=document.createElement('div');div.className='source-item';const a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener';a.textContent=source.title+' ↗';const tag=document.createElement('span');tag.textContent=source.tag;const text=document.createElement('p');text.textContent=source.text;div.append(a,tag,text);return div;}));
$('model-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file||importBusy)return;setImportBusy(true);try{if(!viewer)throw new Error('三维渲染尚未就绪');if(!file.name.toLowerCase().endsWith('.glb')||file.size>150*1024*1024)throw new Error('请使用小于 150 MB 的自含 GLB 文件');$('import-status').textContent='正在读取模型…';await viewer.loadModel(file);$('model-label').textContent=`导入模型 · ${file.name}`;$('import-status').textContent=`已加载 ${file.name}。请确认模型米制、轴向与球场中心一致。`;update();toast('模型加载完成');}catch(error){$('import-status').textContent=`模型导入失败：${error.message}`;toast('模型导入失败，保留原场景');}finally{event.target.value='';setImportBusy(false);}});
$('coordinate-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file||importBusy)return;setImportBusy(true);try{if(file.size>30*1024*1024)throw new Error('JSON 文件需小于 30 MB');const count=importCoordinates(JSON.parse(await file.text()));viewer?.setGeometry(SECTIONS);$('import-status').textContent=`已导入 ${count} 个视点基座坐标。相机与座椅示意点已更新；台阶与屋顶仍为估算，可搭配同坐标系 GLB 模型。`;update();toast(`已替换 ${count} 个视点坐标`);}catch(error){$('import-status').textContent=`坐标导入失败：${error.message}`;toast('坐标文件无效，已保留之前的数据');}finally{event.target.value='';setImportBusy(false);}});
$('reset-data').addEventListener('click',()=>{if(importBusy)return;clearCoordinates();viewer?.setGeometry(SECTIONS);viewer?.useProceduralModel();$('model-label').textContent=modelLabel;$('import-status').textContent='已恢复估算模型与坐标，导入内容已从内存清除。';update();toast('已恢复程序重建');});
configureVenue();update(false);setLighting(state.lighting);
try{
 viewer=new StadiumViewer($('scene'),{onReady:()=>{requestAnimationFrame(()=>{sceneReady=true;$('loading').classList.add('hidden');options($('exterior-focus'),[{value:'overview',label:'球场全景'},...(viewer?.getExteriorLandmarks()||[]).map(item=>({value:item.id,label:item.label}))],'overview');viewer?.setPosition(getPosition(state.section,state.row,state.seat,defaultEyeHeight(state.section.type,state.posture)),{animate:false});viewer?.setLighting(state.lighting);});},onError:error=>{console.error(error);if(sceneReady){toast(typeof error==='string'?error:error.message);return;}$('loading').classList.remove('hidden');$('loading').classList.add('error');$('loading').querySelector('strong').textContent='三维视图暂时无法显示';$('loading').querySelector('small').textContent=typeof error==='string'?error:error.message;},onViewChange:view=>{if(Number.isFinite(view?.fov)){state.fov=Math.round(view.fov);$('fov').value=state.fov;$('fov-value').textContent=`${state.fov}°`;}}});
 viewer.renderer?.domElement.setAttribute('aria-label',`${VENUE.nameZh}球场三维视图，拖动查看，滚轮调节视角`);viewer.setPosition(getPosition(state.section,state.row,state.seat,defaultEyeHeight(state.section.type,state.posture)),{animate:false});viewer.setLighting(state.lighting);
}catch(error){$('loading').classList.add('error');$('loading').querySelector('strong').textContent='需要支持 WebGL 2 的浏览器';$('loading').querySelector('small').textContent=`请使用最新 Chrome / Edge 并启用图形加速。${error.message}`;console.error(error);}
window.addEventListener('beforeunload',()=>{viewer?.dispose();googleMap?.dispose();});
