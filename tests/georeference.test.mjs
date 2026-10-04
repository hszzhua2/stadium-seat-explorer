import test from 'node:test';
import assert from 'node:assert/strict';
import {GEO_REFERENCE,CAMP_NOU_GEO_REFERENCE,BERNABEU_GEO_REFERENCE,ALLIANZ_GEO_REFERENCE,OLD_TRAFFORD_GEO_REFERENCE,localToGeographic} from '../src/georeference.js';
test('georeference preserves pitch centre and the selected eye altitude',()=>{
  const origin=localToGeographic({x:0,y:12,z:0});
  assert.equal(origin.lat,GEO_REFERENCE.lat);assert.equal(origin.lng,GEO_REFERENCE.lng);assert.equal(origin.altitude,12);
});
test('real pitch axis places Kop southwest, Road northeast, Main northwest and Kenny southeast',()=>{
  const origin=GEO_REFERENCE;
  const kop=localToGeographic({x:0,y:1,z:50}),road=localToGeographic({x:0,y:1,z:-50});
  const main=localToGeographic({x:-34,y:1,z:0}),kenny=localToGeographic({x:34,y:1,z:0});
  assert.ok(kop.lat<origin.lat&&kop.lng<origin.lng);assert.ok(road.lat>origin.lat&&road.lng>origin.lng);
  assert.ok(main.lat>origin.lat&&main.lng<origin.lng);assert.ok(kenny.lat<origin.lat&&kenny.lng>origin.lng);
});
test('a 100 metre displacement remains 100 metres on the local geodetic tangent plane',()=>{
  const p=localToGeographic({x:60,y:1,z:80});
  const north=(p.lat-GEO_REFERENCE.lat)*Math.PI/180*6378137;
  const east=(p.lng-GEO_REFERENCE.lng)*Math.PI/180*6378137*Math.cos(GEO_REFERENCE.lat*Math.PI/180);
  assert.ok(Math.abs(Math.hypot(north,east)-100)<.00001);
  assert.throws(()=>localToGeographic({x:NaN,y:1,z:0}));
});

test('Camp Nou places Gol Sud southeast, Gol Nord northwest, Tribuna southwest and Lateral northeast',()=>{
 const ref=CAMP_NOU_GEO_REFERENCE;
 const origin=localToGeographic({x:0,y:17,z:0},ref);
 assert.deepEqual(origin,{lat:ref.lat,lng:ref.lng,altitude:17});
 const sud=localToGeographic({x:0,y:1,z:50},ref),nord=localToGeographic({x:0,y:1,z:-50},ref);
 const tribuna=localToGeographic({x:-34,y:1,z:0},ref),lateral=localToGeographic({x:34,y:1,z:0},ref);
 assert.ok(sud.lat<ref.lat&&sud.lng>ref.lng);assert.ok(nord.lat>ref.lat&&nord.lng<ref.lng);
 assert.ok(tribuna.lat<ref.lat&&tribuna.lng<ref.lng);assert.ok(lateral.lat>ref.lat&&lateral.lng>ref.lng);
 assert.equal(ref.approximate,true);
 assert.equal(ref.source,'https://www.openstreetmap.org/way/35815805');
 assert.notEqual(origin.lat,GEO_REFERENCE.lat,'a custom reference never falls back to Anfield');
});

test('all five venue axes preserve distance and selected altitude independently of their latitude',()=>{
 for(const ref of [GEO_REFERENCE,CAMP_NOU_GEO_REFERENCE,BERNABEU_GEO_REFERENCE,ALLIANZ_GEO_REFERENCE,OLD_TRAFFORD_GEO_REFERENCE]){
  for(const local of [{x:60,y:1.65,z:80},{x:-34,y:23,z:-52.5}]){
   const point=localToGeographic(local,ref);
   const north=(point.lat-ref.lat)*Math.PI/180*6378137;
   const east=(point.lng-ref.lng)*Math.PI/180*6378137*Math.cos(ref.lat*Math.PI/180);
   assert.ok(Math.abs(Math.hypot(north,east)-Math.hypot(local.x,local.z))<.00001);
   assert.equal(point.altitude,local.y);
  }
 }
});

test('Bernabéu follows its mapped pitch axis with Fondo Sur south-west and Lateral Este east-south',()=>{
 const ref=BERNABEU_GEO_REFERENCE,origin=localToGeographic({x:0,y:26,z:0},ref);
 assert.deepEqual(origin,{lat:ref.lat,lng:ref.lng,altitude:26});
 const south=localToGeographic({x:0,y:1,z:52.5},ref),north=localToGeographic({x:0,y:1,z:-52.5},ref);
 const west=localToGeographic({x:-34,y:1,z:0},ref),east=localToGeographic({x:34,y:1,z:0},ref);
 assert.ok(south.lat<ref.lat&&south.lng<ref.lng);assert.ok(north.lat>ref.lat&&north.lng>ref.lng);
 assert.ok(west.lat>ref.lat&&west.lng<ref.lng);assert.ok(east.lat<ref.lat&&east.lng>ref.lng);
 assert.equal(ref.source,'https://www.openstreetmap.org/way/1446479375');assert.equal(ref.approximate,true);
 const southBearing=(Math.atan2((south.lng-ref.lng)*Math.cos(ref.lat*Math.PI/180),south.lat-ref.lat)*180/Math.PI+360)%360;
 assert.ok(Math.abs(southBearing-184.21)<.00001,'Fondo Sur follows the mapped southward axis rather than assuming due south');
 assert.notEqual(origin.lng,CAMP_NOU_GEO_REFERENCE.lng,'Madrid coordinates never fall back to Barcelona');
});

test('Allianz follows the grass pitch axis with south southeast, north northwest and east northeast',()=>{
 const ref=ALLIANZ_GEO_REFERENCE,origin=localToGeographic({x:0,y:18.15,z:0},ref);
 assert.deepEqual(origin,{lat:ref.lat,lng:ref.lng,altitude:18.15});
 const south=localToGeographic({x:0,y:1,z:52.5},ref),north=localToGeographic({x:0,y:1,z:-52.5},ref);
 const west=localToGeographic({x:-34,y:1,z:0},ref),east=localToGeographic({x:34,y:1,z:0},ref);
 assert.ok(south.lat<ref.lat&&south.lng>ref.lng);assert.ok(north.lat>ref.lat&&north.lng<ref.lng);
 assert.ok(west.lat<ref.lat&&west.lng<ref.lng);assert.ok(east.lat>ref.lat&&east.lng>ref.lng);
 assert.equal(ref.source,'https://www.openstreetmap.org/way/123121774');assert.equal(ref.approximate,true);
 const bearing=(Math.atan2((south.lng-ref.lng)*Math.cos(ref.lat*Math.PI/180),south.lat-ref.lat)*180/Math.PI+360)%360;
 assert.ok(Math.abs(bearing-164.77)<.00001,'south uses the pitch goal-midpoint axis');
 assert.notEqual(origin.lat,GEO_REFERENCE.lat);assert.notEqual(origin.lng,BERNABEU_GEO_REFERENCE.lng);
});

test('Old Trafford maps Stretford west along +Z and Sir Bobby Charlton south along +X',()=>{
 const ref=OLD_TRAFFORD_GEO_REFERENCE,origin=localToGeographic({x:0,y:15.68,z:0},ref);
 assert.deepEqual(origin,{lat:ref.lat,lng:ref.lng,altitude:15.68});
 const stretford=localToGeographic({x:0,y:1,z:52.5},ref),east=localToGeographic({x:0,y:1,z:-52.5},ref);
 const sirAlex=localToGeographic({x:-34,y:1,z:0},ref),sirBobby=localToGeographic({x:34,y:1,z:0},ref);
 assert.ok(stretford.lat<ref.lat&&stretford.lng<ref.lng,'the Stretford End is west-southwest of the grass centre');
 assert.ok(east.lat>ref.lat&&east.lng>ref.lng,'the east goal is east-northeast');
 assert.ok(sirAlex.lat>ref.lat&&sirAlex.lng<ref.lng,'Sir Alex Ferguson is on the north-northwest sideline');
 assert.ok(sirBobby.lat<ref.lat&&sirBobby.lng>ref.lng,'Sir Bobby Charlton is on the south-southeast sideline');
 assert.equal(ref.source,'https://www.openstreetmap.org/way/165256230');assert.equal(ref.approximate,true);
 const westBearing=(Math.atan2((stretford.lng-ref.lng)*Math.cos(ref.lat*Math.PI/180),stretford.lat-ref.lat)*180/Math.PI+360)%360;
 assert.ok(Math.abs(westBearing-250.63)<.00001,'local +Z follows the west goal midpoint rather than assuming south');
 assert.notEqual(origin.lat,GEO_REFERENCE.lat);assert.notEqual(origin.lng,GEO_REFERENCE.lng);
});

test('generic zBearing takes precedence, zero degrees is valid and legacy kopBearing still works',()=>{
 const local={x:0,y:2,z:50};
 const legacy={lat:GEO_REFERENCE.lat,lng:GEO_REFERENCE.lng,kopBearing:GEO_REFERENCE.kopBearing};
 assert.deepEqual(localToGeographic(local,legacy),localToGeographic(local));
 const north=localToGeographic(local,{lat:41,lng:2,zBearing:0,kopBearing:180});
 assert.ok(north.lat>41);assert.equal(north.lng,2);
 const east=localToGeographic(local,{lat:41,lng:2,zBearing:90});
 assert.ok(east.lng>2);assert.equal(east.lat,41);
});

test('invalid origins and axes fail clearly instead of producing NaN or pole-singular coordinates',()=>{
 for(const ref of [null,{}, {lat:NaN,lng:0,zBearing:0},{lat:90,lng:0,zBearing:0},{lat:-90,lng:0,zBearing:0},{lat:0,lng:181,zBearing:0},{lat:0,lng:0,zBearing:Infinity}]){
  assert.throws(()=>localToGeographic({x:1,y:1,z:1},ref),/地理基准无效/);
 }
 for(const point of [null,{x:1,y:NaN,z:0},{x:1,y:1,z:Infinity}])assert.throws(()=>localToGeographic(point,CAMP_NOU_GEO_REFERENCE),/有限数值/);
});
