import test from 'node:test';
import assert from 'node:assert/strict';
import { VENUE, VENUES, STANDS, SECTIONS, SECTION_BY_ID, setActiveVenue, getPosition, getRowSeatCount, importCoordinates, clearCoordinates, getImportedCount } from '../src/seat-data.js';

test('Camp Nou provides four connected stand areas and valid selectable viewpoints outside the pitch', t => {
  setActiveVenue('camp-nou');t.after(()=>setActiveVenue('anfield'));
  assert.equal(VENUE.pitchLength,105);assert.equal(VENUE.pitchWidth,68);
  assert.ok(SECTION_BY_ID.has(VENUE.defaultSection));
  assert.deepEqual(new Set(STANDS.map(s=>s.id)),new Set(['tribuna','lateral','nord','sud']));
  assert.equal(SECTION_BY_ID.size,SECTIONS.length);
  for(const stand of STANDS)for(const tier of ['1','2','3'])assert.ok(SECTIONS.some(s=>s.stand===stand.id&&s.tier===tier),`${stand.id} ${tier}`);
  for(const type of ['seat','suite','accessible','dugout'])assert.ok(SECTIONS.some(s=>s.type===type),type);
  assert.equal(SECTIONS.some(s=>s.type==='standing'),false,'classic all-seater stadium does not invent a standing-ticket area');
  for(const section of SECTIONS){
    for(const row of new Set([1,section.rows]))for(let seat=1;seat<=getRowSeatCount(section,row);seat++){
      const p=getPosition(section,row,seat);
      assert.ok([p.x,p.y,p.z].every(Number.isFinite),section.id);
      assert.ok(Math.abs(p.x)<180&&Math.abs(p.z)<180&&p.y>=0&&p.y<70,section.id);
      assert.ok(Math.hypot(Math.max(Math.abs(p.x)-34,0),Math.max(Math.abs(p.z)-52.5,0))>=2,`${section.id} remains outside the pitch buffer`);
    }
    const seat=Math.ceil(section.seatsPerRow/2),front=getPosition(section,1,seat),back=getPosition(section,section.rows,seat);
    if(section.rows>1){assert.ok(back.y>front.y,section.id);assert.ok(Math.hypot(back.x,back.z)>Math.hypot(front.x,front.z),section.id);}
    assert.throws(()=>getPosition(section,0,1),RangeError);
    assert.throws(()=>getPosition(section,1,section.seatsPerRow+1),RangeError);
  }
});

test('stadium changes isolate imported coordinates and reject foreign or stale selections',t=>{
  setActiveVenue('anfield');clearCoordinates();t.after(()=>{setActiveVenue('anfield');clearCoordinates();});
  assert.equal(VENUES.length,5);
  const oldSection=SECTION_BY_ID.get('L5');
  importCoordinates({version:1,venueId:'anfield',seats:[{sectionId:'L5',row:1,seat:1,x:-45,y:4,z:-5}]});
  assert.equal(getImportedCount(),1);
  setActiveVenue('camp-nou');
  assert.equal(getImportedCount(),0);
  assert.equal(SECTION_BY_ID.has('L5'),false);
  assert.throws(()=>getPosition(oldSection,1,1),/当前球场/);
  const section=SECTION_BY_ID.get(VENUE.defaultSection);
  const record={sectionId:section.id,row:1,seat:1,x:-75,y:21,z:4};
  importCoordinates({version:1,venueId:'camp-nou',seats:[record]});
  assert.deepEqual(getPosition(section,1,1,1.15),{x:-75,y:22.15,z:4,exact:true});
  assert.throws(()=>importCoordinates({version:1,venueId:'anfield',seats:[record]}),/venueId/);
  assert.equal(getImportedCount(),1,'invalid venue cannot erase a valid import');
  assert.throws(()=>setActiveVenue('unknown'),/未知球场/);
  assert.equal(VENUE.id,'camp-nou');
  setActiveVenue('anfield');
  assert.equal(getImportedCount(),0);assert.equal(getPosition(SECTION_BY_ID.get('L5'),1,1).exact,false);
});

test('Bernabéu exposes its own four stands, dimensions and bounded viewpoints', t => {
  setActiveVenue('bernabeu');t.after(()=>{setActiveVenue('anfield');clearCoordinates();});
  assert.equal(VENUE.pitchLength,105);assert.equal(VENUE.pitchWidth,68);
  assert.equal(VENUE.defaultSection,'O2-04');
  assert.deepEqual(new Set(STANDS.map(stand=>stand.id)),new Set(['west','east','north','south']));
  assert.ok(SECTION_BY_ID.has(VENUE.defaultSection));
  assert.equal(SECTION_BY_ID.size,SECTIONS.length,'section identifiers are unique within the stadium');
  for(const type of ['seat','suite','accessible','dugout'])assert.ok(SECTIONS.some(section=>section.type===type),type);
  for(const section of SECTIONS){
    for(const row of new Set([1,Math.ceil(section.rows/2),section.rows])){
      const count=getRowSeatCount(section,row);
      for(const seat of new Set([1,Math.ceil(count/2),count])){
        const p=getPosition(section,row,seat,1.15);
        assert.ok([p.x,p.y,p.z].every(Number.isFinite),`${section.id} finite coordinates`);
        assert.ok(Math.abs(p.x)<200&&Math.abs(p.z)<200&&p.y>=0&&p.y<100,`${section.id} stadium-scale bounds`);
        assert.ok(Math.hypot(Math.max(Math.abs(p.x)-34,0),Math.max(Math.abs(p.z)-52.5,0))>=2,`${section.id} pitch buffer`);
      }
    }
    const middle=Math.ceil(section.seatsPerRow/2),front=getPosition(section,1,middle),back=getPosition(section,section.rows,middle);
    if(section.rows>1){assert.ok(back.y>front.y,section.id+' rising rows');assert.ok(Math.hypot(back.x,back.z)>Math.hypot(front.x,front.z),section.id+' outward rows');}
    if(section.type==='seat'){
      if(section.stand==='west')assert.ok(front.x<0,section.id+' west -X');
      if(section.stand==='east')assert.ok(front.x>0,section.id+' east +X');
      if(section.stand==='north')assert.ok(front.z<0,section.id+' north -Z');
      if(section.stand==='south')assert.ok(front.z>0,section.id+' south +Z');
    }
    if(section.type==='dugout'){
      assert.equal(section.stand,'east',section.id+' belongs to Lateral Este');
      assert.ok(front.x>34&&back.x>front.x,section.id+' east-side bench remains outside the sideline');
    }
    assert.throws(()=>getPosition(section,0,1),RangeError);
    assert.throws(()=>getPosition(section,1,section.seatsPerRow+1),RangeError);
  }
});

test('five-stadium changes clear imported coordinates, reject stale objects and preserve valid data on foreign imports', t => {
  setActiveVenue('anfield');clearCoordinates();t.after(()=>{setActiveVenue('anfield');clearCoordinates();});
  assert.deepEqual(new Set(VENUES.map(venue=>venue.id)),new Set(['anfield','camp-nou','bernabeu','allianz-arena','old-trafford']));
  let previousSection;
  for(const id of ['anfield','camp-nou','bernabeu','allianz-arena','old-trafford','anfield']){
    setActiveVenue(id);
    assert.equal(getImportedCount(),0,`${id} starts without coordinates from the previous venue`);
    if(previousSection)assert.throws(()=>getPosition(previousSection,1,1),/当前球场/);
    const section=SECTION_BY_ID.get(VENUE.defaultSection),base=getPosition(section,1,1,0);
    const record={sectionId:section.id,row:1,seat:1,x:base.x+.37,y:base.y+.11,z:base.z-.25};
    assert.equal(importCoordinates({version:1,venueId:id,seats:[record]}),1);
    assert.deepEqual(getPosition(section,1,1,1.68),{x:record.x,y:record.y+1.68,z:record.z,exact:true});
    for(const foreign of VENUES.filter(venue=>venue.id!==id)){
      assert.throws(()=>importCoordinates({version:1,venueId:foreign.id,seats:[record]}),/venueId/);
      assert.equal(getImportedCount(),1,'foreign file rejection is atomic');
      assert.equal(getPosition(section,1,1).x,record.x);
    }
    setActiveVenue(id);
    assert.equal(getImportedCount(),1,'selecting the same stadium preserves its current import');
    assert.throws(()=>setActiveVenue('unknown'),/未知球场/);
    assert.equal(VENUE.id,id,'invalid venue selection does not change active data');
    previousSection=section;
  }
});

test('Allianz has its own stands, standing viewpoints and bounded geometry outside the pitch', t => {
  setActiveVenue('allianz-arena');t.after(()=>{setActiveVenue('anfield');clearCoordinates();});
  assert.equal(VENUE.pitchLength,105);assert.equal(VENUE.pitchWidth,68);
  assert.equal(VENUE.defaultSection,'AW2-04');
  assert.deepEqual(new Set(STANDS.map(stand=>stand.id)),new Set(['west','east','north','south']));
  assert.ok(SECTION_BY_ID.has(VENUE.defaultSection));
  assert.equal(SECTION_BY_ID.size,SECTIONS.length);
  for(const type of ['seat','standing','suite','accessible','dugout'])assert.ok(SECTIONS.some(section=>section.type===type),type);
  for(const stand of ['north','south'])assert.ok(SECTIONS.some(section=>section.stand===stand&&section.type==='standing'),stand+' estimated standing viewpoints');
  for(const section of SECTIONS){
    for(const row of new Set([1,Math.ceil(section.rows/2),section.rows])){
      const count=getRowSeatCount(section,row);
      for(const seat of new Set([1,Math.ceil(count/2),count])){
        const p=getPosition(section,row,seat,1.15);
        assert.ok([p.x,p.y,p.z].every(Number.isFinite),section.id+' finite position');
        assert.ok(Math.abs(p.x)<200&&Math.abs(p.z)<200&&p.y>=0&&p.y<100,section.id+' stadium-scale bounds');
        assert.ok(Math.hypot(Math.max(Math.abs(p.x)-34,0),Math.max(Math.abs(p.z)-52.5,0))>=2,section.id+' pitch buffer');
      }
    }
    const middle=Math.ceil(section.seatsPerRow/2),front=getPosition(section,1,middle),back=getPosition(section,section.rows,middle);
    if(section.rows>1){assert.ok(back.y>front.y,section.id+' rising rows');assert.ok(Math.hypot(back.x,back.z)>Math.hypot(front.x,front.z),section.id+' outward rows');}
    if(['seat','standing'].includes(section.type)){
      // Check every front-row position: rounded corners must retain the
      // official 7.5 m spectator clearance, not merely the straight sides.
      for(let seat=1;seat<=section.seatsPerRow;seat++){
        const p=getPosition(section,1,seat,0);
        assert.ok(Math.hypot(Math.max(Math.abs(p.x)-34,0),Math.max(Math.abs(p.z)-52.5,0))>=7.5,section.id+' corner spectator clearance');
      }
      if(section.stand==='west')assert.ok(front.x<0,section.id+' west -X');
      if(section.stand==='east')assert.ok(front.x>0,section.id+' east +X');
      if(section.stand==='north')assert.ok(front.z<0,section.id+' north -Z');
      if(section.stand==='south')assert.ok(front.z>0,section.id+' south +Z');
    }
    if(section.type==='dugout'){
      assert.equal(section.stand,'west',section.id+' benches belong to the west stand');
      assert.ok(front.x< -34&&back.x<front.x,section.id+' west-side bench remains outside the sideline');
    }
    assert.throws(()=>getPosition(section,0,1),RangeError);
    assert.throws(()=>getPosition(section,1,section.seatsPerRow+1),RangeError);
  }
});

test('Old Trafford retains its asymmetric stand directions, pitch bounds and south-side dugouts',t=>{
  setActiveVenue('old-trafford');t.after(()=>{setActiveVenue('anfield');clearCoordinates();});
  assert.equal(VENUE.pitchLength,105);assert.equal(VENUE.pitchWidth,68);
  assert.equal(VENUE.defaultSection,'OT-N2-04');
  assert.deepEqual(new Set(STANDS.map(stand=>stand.id)),new Set(['north','south','east','west']));
  assert.ok(SECTION_BY_ID.has(VENUE.defaultSection));assert.equal(SECTION_BY_ID.size,SECTIONS.length);
  for(const type of ['seat','standing','suite','accessible','dugout'])assert.ok(SECTIONS.some(section=>section.type===type),type);
  for(const section of SECTIONS){
    for(const row of new Set([1,Math.ceil(section.rows/2),section.rows])){
      const count=getRowSeatCount(section,row);
      for(const seat of new Set([1,Math.ceil(count/2),count])){
        const p=getPosition(section,row,seat,1.15);
        assert.ok([p.x,p.y,p.z].every(Number.isFinite),section.id+' finite position');
        assert.ok(Math.abs(p.x)<200&&Math.abs(p.z)<200&&p.y>=0&&p.y<100,section.id+' stadium-scale bounds');
        assert.ok(Math.hypot(Math.max(Math.abs(p.x)-34,0),Math.max(Math.abs(p.z)-52.5,0))>=2,section.id+' pitch buffer');
      }
    }
    const middle=Math.ceil(section.seatsPerRow/2),front=getPosition(section,1,middle),back=getPosition(section,section.rows,middle);
    if(section.rows>1){assert.ok(back.y>front.y,section.id+' rising rows');assert.ok(Math.hypot(back.x,back.z)>Math.hypot(front.x,front.z),section.id+' outward rows');}
    if(['seat','standing'].includes(section.type)){
      if(section.stand==='north')assert.ok(front.x<0,section.id+' Sir Alex Ferguson north -X');
      if(section.stand==='south')assert.ok(front.x>0,section.id+' Sir Bobby Charlton south +X');
      if(section.stand==='east')assert.ok(front.z<0,section.id+' east -Z goal end');
      if(section.stand==='west')assert.ok(front.z>0,section.id+' Stretford west +Z goal end');
    }
    if(section.type==='dugout'){
      assert.equal(section.stand,'south',section.id+' belongs to Sir Bobby Charlton');
      assert.ok(front.x>34&&back.x>front.x,section.id+' south-side bench remains outside the sideline');
    }
    assert.throws(()=>getPosition(section,0,1),RangeError);
    assert.throws(()=>getPosition(section,1,section.seatsPerRow+1),RangeError);
  }
});

test('Old Trafford coach rows enforce their front-to-back 6, 7 and 8 position bounds before accepting coordinates',t=>{
  setActiveVenue('old-trafford');clearCoordinates();t.after(()=>{setActiveVenue('anfield');clearCoordinates();});
  const benches=SECTIONS.filter(section=>section.type==='dugout');assert.equal(benches.length,2);
  for(const section of benches){
    assert.deepEqual([1,2,3].map(row=>getRowSeatCount(section,row)),[6,7,8]);
    assert.ok(Number.isFinite(getPosition(section,1,6).x));
    assert.ok(Number.isFinite(getPosition(section,2,7).x));
    assert.ok(Number.isFinite(getPosition(section,3,8).x));
    assert.throws(()=>getPosition(section,2,8),RangeError);
    assert.throws(()=>getPosition(section,1,7),RangeError);
    const record={sectionId:section.id,row:2,seat:7,x:39,y:.4,z:4};
    assert.equal(importCoordinates({version:1,venueId:'old-trafford',seats:[record]}),1);
    assert.equal(getPosition(section,2,7).exact,true);
    for(const invalid of [{...record,row:1,seat:7},{...record,row:2,seat:8}]){
      assert.throws(()=>importCoordinates({version:1,venueId:'old-trafford',seats:[invalid]}));
      assert.equal(getImportedCount(),1,'a row-specific overflow cannot erase a valid coordinate import');
      assert.equal(getPosition(section,2,7).x,record.x);
    }
    clearCoordinates();
  }
});
