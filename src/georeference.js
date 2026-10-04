// Pitch footprints: OpenStreetMap ways 124589354, 35815805, 1446479375,
// 123121774 and 165256230. Origins and bearings are approximate map references,
// not surveyed ticket-seat locations.
// +Z points toward Kop at Anfield, Gol Sud at Camp Nou, Fondo Sur at Bernabéu
// and the South Stand at Allianz Arena. At Old Trafford +Z points toward the
// Stretford End (west), +X toward Sir Bobby Charlton (south), -X toward Sir Alex
// Ferguson (north), and -Z toward the east end. +X is to the left when looking
// toward +Z. © OpenStreetMap contributors, ODbL.
export const GEO_REFERENCE=Object.freeze({
  lat:53.4308458,lng:-2.9608203,zBearing:219.74,kopBearing:219.74,
  source:'https://www.openstreetmap.org/way/124589354',approximate:true
});
export const CAMP_NOU_GEO_REFERENCE=Object.freeze({
  lat:41.3808928,lng:2.1228200,zBearing:158.09,
  source:'https://www.openstreetmap.org/way/35815805',approximate:true
});
export const BERNABEU_GEO_REFERENCE=Object.freeze({
  // The mapped grass outline has rounded corners. Average its vertices for
  // the origin and its two long straight sidelines for the southward bearing.
  lat:40.4530563,lng:-3.6883504,zBearing:184.21,
  source:'https://www.openstreetmap.org/way/1446479375',approximate:true
});
export const ALLIANZ_GEO_REFERENCE=Object.freeze({
  // Four football-grass corners, not the inflated facade's outer footprint.
  lat:48.2187940,lng:11.6247020,zBearing:164.77,
  source:'https://www.openstreetmap.org/way/123121774',approximate:true
});
export const OLD_TRAFFORD_GEO_REFERENCE=Object.freeze({
  // Four football-grass corners; east goal midpoint toward Stretford End.
  lat:53.4630704,lng:-2.2913486,zBearing:250.63,
  source:'https://www.openstreetmap.org/way/165256230',approximate:true
});
export function localToGeographic(position,reference=GEO_REFERENCE){
  if(!position||!['x','y','z'].every(k=>Number.isFinite(position[k])))throw new Error('空间坐标必须是有限数值');
  const bearing=reference?.zBearing??reference?.kopBearing;
  if(!reference||![reference.lat,reference.lng,bearing].every(Number.isFinite)||Math.abs(reference.lat)>=90||Math.abs(reference.lng)>180)throw new Error('地理基准无效');
  const zBearing=bearing*Math.PI/180;
  const xBearing=zBearing-Math.PI/2;
  const east=position.x*Math.sin(xBearing)+position.z*Math.sin(zBearing);
  const north=position.x*Math.cos(xBearing)+position.z*Math.cos(zBearing);
  const radius=6378137;
  return {lat:reference.lat+north/radius*180/Math.PI,lng:reference.lng+east/(radius*Math.cos(reference.lat*Math.PI/180))*180/Math.PI,altitude:position.y};
}
