# 安菲尔德、经典诺坎普、伯纳乌、安联与老特拉福德：数据来源与精度

资料核查日期：2026-10-04。

界面配色与排版参考：[Liverpool FC 官网](https://www.liverpoolfc.com/) 当日页面的主红色 `#E31B23`、红白导航、粗体无衬线标题与简洁直角布局。应用使用系统字体及自己的安菲尔德标识。

本应用依据公开球场尺寸和座位分区图建立程序化三维重建，并提供可配置的 Google 在线三维鸟瞰。当前交付没有内置第三方球场模型、实拍全景、官方逐座测绘数据或票务库存。页面中的排、座号是分区内示意索引；包厢、教练席和无障碍平台的内部编号与坐标也是示意值。

## 老特拉福德：现有曼联主场

采用现有 Old Trafford 的四侧独立看台与角部连接形态：北侧 Sir Alex Ferguson 三层、南侧 Sir Bobby Charlton 较低一层，西侧 Stretford End 与 East Stand 两层；应用排带仅为几何组织方式。未来新球场的帐篷式屋顶规划不属于本地模型。

| 参考 | 在本应用中的用途 |
| --- | --- |
| [Manchester United · 2025/26 Executive Club](https://assets.manutd.com/AssetPicker/images/0/0/23/192/1556556/2526_Executive_Club_Brochure1772529017923.pdf) | 四侧看台、南側球员通道与教练席以及包厢关系；餐饮、会客厅与包厢区别处理，不直接复制票面编号 |
| [Manchester United · 公开球场行程图](https://assets.manutd.com/AssetPicker/images/0/0/15/92/1006628/MDVIP_Post-Match_Museum_Itinerary1628087104618.pdf) | 2021 文件中标注的历史层级图，用来参考各侧层数；旧库存与席位范围不当作当前票务数据 |
| [Manchester United · 2026 教练席扩建](https://www.manutd.com/en/news/construction-begins-on-expansion-of-old-trafford-dugouts) | 南侧 Sir Bobby Charlton 场边露天教练席；前／中／后三排 6 / 7 / 8，坐标、座距和主客侧别仍为估算 |
| [Manchester United · 2025 年 12 月球迷论坛纪要](https://assets.manutd.com/AssetPicker/images/0/0/23/108/1535068/Fans%27_Forum_December_2025_-_Minutes1766491395400.pdf) | Stretford End 第二层新增护栏站席及既有四角局部站席的参考；不将全部看台视为站票区 |
| [MUDSA · Visiting Old Trafford](https://mudsa.org.uk/visiting-ot/) / [2025/26 Access Statement](https://mudsa.org.uk/wp-content/uploads/2025/11/Access_Statement_2526.pdf) | 东侧低层、南侧、西侧第二层，东南/西南低层及东北/西北第二层无障碍平台；仅取方位关系，不能替代无障碍路线图 |
| [Manchester United · 2014 官方年报](https://ir.manutd.com/~/media/files/m/manutd-ir/annual%20reports/manchester-united-plc-20f-20141027.pdf) | 第 23 页的 105 × 68 m 场地尺寸；历史容量、人物与运营数据不引用为现状 |
| [Historic England · 2017 航拍，Damian Grady](https://www.mediastorehouse.com.au/historic-england/sports/football-grounds-air/old-trafford-33160-037-13704647.html) | 实际查看公开预览，观察高低屋顶、白色外露桁架、东侧蓝绿玻璃外墙及西看台 STRETFORD END 字样；照片未内置 |
| [OpenStreetMap · 草坪 way 165256230](https://www.openstreetmap.org/way/165256230) | 实际草坪四角估算中心 53.4630704, −2.2913486，+Z 朝 Stretford End 方位角约 250.63°。© OpenStreetMap contributors，非逐座测绘 |

本地坐标北 SAF 为 −X、南 SBC 为 +X、东为 −Z、西 Stretford 为 +Z，Y 向上。场地长轴保持沿 Z，所以平面图上方为东侧球门端，不是地理北向朝上。全部 OT 区号、排座、包厢与入口编号为应用示意值；顶棚和看台高度、站区边界、栏杆尺寸以及无障碍平台位置均未经过测绘，不能用于真实球票验证或现场导航。

官方图与照片仅作观察和链接，不随程序再分发。屋顶、桁架、红色座椅与白色字样均由程序生成，不能反映全部真实遮挡。Google 三维地图使用现有球场位置，在线瓦片时期由 Google 提供，本次没有使用真实 key 验证。

## 安联球场：拜仁慕尼黑主场

采用红白座椅改造后的外观：连续三层看台、鼓起的菱形气膜外壳、中央开放的固定屋顶及两端大屏幕。外壳日间银白、夜场红色；气膜数量、尺寸、屋顶曲面与灯光亮度为程序近似。没有内置官方三维模型或逐座坐标。

| 参考 | 在本应用中的用途 |
| --- | --- |
| [Allianz Arena · 官方技术资料](https://allianz-arena.com/en/arena/facts/general-information) | 105 × 68 m 球场、三层看台及坡度、气膜立面、两端屏幕与南北站位存在性；页面部分历史容量和气膜数量表述不同，应用不据此宣称精确容量或面板总数 |
| [Herzog & de Meuron · 建筑项目](https://www.herzogdemeuron.com/projects/205-allianz-arena/lightbox/33553/) | 立面和屋顶的连续气膜体量；仅观察建筑形态，未复制三维文件 |
| [2018 官方红白改造报道](https://allianz-arena.com/de/news/2018/08/allianz-arena-homepage-in-neuem-rot-weissen-look) | 红白座椅、西侧主看台下层 Mia san Mia、对面东看台 FC Bayern München、北端图案的相对布局 |
| [南端下层站席改造公告](https://allianz-arena.com/de/news/2015/01/kapazitatserhohung-genehmigt) | 2015 年官方说明南下层 109–117；本地仅取南端站席关系，不映射这些真实区号 |
| [2023 官方 Supercup 票价图](https://tickets.fcbayern.com/documents/de/preisliste-supercup-2023.pdf) | 北下层两侧 126–127、133–134 为该场次站席类别，中央 128–132 为座区；用作两侧站区的历史参考，不宣称现行完整票务配置 |
| [官方无障碍设施资料](https://allianz-arena.com/de/die-arena/barrierefreie-arena) | 东、西长边和北端下层顶部平台，示意布局不具备路线测绘精度 |
| [官方建设状态报告](https://allianz-arena.com/de/news/2011/09/100-tage-vor-der-eroffnung-statusbericht-teil-eins) | 西侧球员替补席方位；不据历史工程文档推断当前座数或主客侧别 |
| [2025/26 官方公开楼层图](https://allianz-arena.com/binaries/content/assets/downloads/allianz-arena/fantreffs/englisch/25_26_allar_e02_297x210_w_en.pdf) | 四侧与层级方向参考；官方区号不等同于应用 AW/AE/AN/AS 区号 |
| [OpenStreetMap · 草坪 way 123121774](https://www.openstreetmap.org/way/123121774) | 四草坪角点估算中心 48.2187940, 11.6247020；+Z 朝南看台方位角约 164.77°。© OpenStreetMap contributors，非逐座测绘 |

本地西侧为 −X、东侧为 +X、北端为 −Z、南端为 +Z，Y 向上。AW、AE、AN、AS、AA 开头的选区和设施标识、所有排座号、台阶高度、包厢及入口编号均为估算。站席范围仅用于体验站姿眼高，不表示当前赛事售票配置；无障碍视点和入口不能用于现场导航。两组教练席以 A/B 区别，主客方向未核实。

座椅字样的东西方位是结合官方“主看台／对面”描述与西侧球员区推断的映射。北侧站席采用有日期的官方地图例证；全部排座、图案大小和字母边界仍需现场或测绘数据校准。

官方资料与照片仅用于参考和链接，未作为贴图内置。白色座椅拼字和北看台图案为程序生成的简化着色；大屏幕是示意显示，不包含实时比分或比赛转播。Google 模式定位到慕尼黑安联球场，未用真实 key 验证在线影像。

## 伯纳乌：改造后建筑与数据来源

本地模型采用改造后的外立面与屋顶形态，中央屋顶开口默认打开。参考建筑资料复原银色横向不锈钢百叶、连续看台与高位环形屏；不模拟收放草坪的机械系统，也没有加载官方逐座测绘几何。

| 参考 | 在本应用中的用途 |
| --- | --- |
| [gmp · Santiago Bernabéu 改造项目](https://www.gmp.de/en/projects/652/estadio-santiago-bernabeu) | 不锈钢百叶外壳、保留主体结构、可开合屋顶与改造后建筑轮廓 |
| [Real Madrid · 360° 屏幕启用说明](https://www.realmadrid.com/es-ES/noticias/club/actualidad/el-santiago-bernabeu-estrena-su-espectacular-videomarcador-360-21-04-2024) | 屏幕吊挂于屋顶下、绕场连续设置；侧边与球门端高度不同。模型吊挂高度和尺寸仍为估算 |
| [Real Madrid · 2016/17 官方层级名称表](https://static.realmadrid.com/StaticFiles/RealMadrid/socios/pdf/PrecioAbonos_Temp_2016-2017.pdf) | 仅参考四侧与 Grada Baja、Grada Alta、Tribuna、第 1–4 Anfiteatro 名称；旧价格、门号、座位范围不作为当前数据 |
| [Real Madrid · 2018 官方比赛技术资料](https://www.realmadrid.com/StaticFiles/RealMadrid/img/pdf/Dossier-Real-Madrid-Getafe.pdf) | 引用 105 × 68 m 草坪尺寸；不引用旧容量作为本模型容量 |
| [Real Madrid · Flash Club](https://bernabeu.realmadrid.com/es-ES/eventos-corporativos/flash-club) | Padre Damián 一侧与球员区域、教练席的相对关系；结合官方 VIP 照片估算东侧场边位置 |
| [OpenStreetMap · 草坪轮廓 way 1446479375](https://www.openstreetmap.org/way/1446479375) | 草坪顶点平均近似中心 40.4530563, −3.6883504；长侧边推算 +Z 朝南端方位约 184.21°，+X 朝东约 94.21°。© OpenStreetMap contributors，非逐座测绘 |

四侧采用 Lateral Oeste、Lateral Este、Fondo Norte、Fondo Sur；本地 −X 为西侧、+X 为东侧、−Z 为北端、+Z 为南端。O/E/N/S 开头的分区、所有排座及包厢编号由本应用定义，不对应官方票面。参考层级名称组织选区，但层间边界、坡度与平台位置仍需精确模型校准。各层座位数量和几何尺度为估算，不能用生成的视点总数推断官方容量。教练席主客侧别、无障碍位置及示意检票入口均不作为现场导航。

参考照片仅用于观察结构和链接；未作为内置贴图。蓝色座椅、白色字样、银色材质及屏幕内容均由程序生成；屏幕不包含实时比分或比赛转播。

## 经典诺坎普：建筑与数据来源

模型采用改建前的经典形态。四看台名称、三层结构和球场尺寸有公开依据；`TR1-01`、`LA2-04`、`GN3-02` 等编号均为本应用自定义的示意分区。没有内置官方逐座测绘模型，也没有官方全量座号数据库。位置数量不代表任何时期的官方容量。

| 参考 | 用于复原的内容 |
| --- | --- |
| [FC Barcelona · Camp Nou history](https://www.fcbarcelona.com/en/club/facilities/spotify-camp-nou/history) | 105 × 68 m 场地、增建第三层及站位改座席的历史 |
| [2014 官方 Hospitality 目录](https://media2.fcbarcelona.com/media/asset_publics/resources/000/103/287/original/ANG_004_cataleg_HOSPITALITY_2014.v1401881462.pdf) | 四看台图、空场红/蓝座椅与黄色拼字、包厢、Tribuna 中央球员通道与教练席相对位置 |
| [2021 Espai Barça 官方对照资料](https://www.fcbarcelona.com/fcbarcelona/document/2021/12/02/f7a4b727-8dcf-435a-a460-0db552906f82/DossierEB-ENG.pdf) | 经典 Tribuna 单侧屋顶、Lateral 较高的第三层；文件中的未来方案不作为经典建筑 |
| [Future Spotify Camp Nou 官方规划](https://espaibarca.fcbarcelona.com/en/spaces/future-spotify-camp-nou) | 区别改建后的全覆盖屋顶、新第三层和双 VIP 环；不把规划称为目前已全部建成 |
| [2026-03-10 Phase 1C 官方公告](https://www.fcbarcelona.com/en/news/4465846/fc-barcelona-official-statement/amp) | 说明分期开放及时期差异，不把当日阶段容量当作永久容量或本地示意位置数量 |
| [OpenStreetMap 场地 way 35815805](https://www.openstreetmap.org/way/35815805) | Google 视点地图的近似中心（41.3808928, 2.1228200）与 +Z 朝 Gol Sud 的 158.09° 方位；© OpenStreetMap contributors，非逐座测绘 |

官方图片用于观察和链接，没有作为贴图内置。下层、上层的红色和中层的蓝色取自空场照片，黄色 `MÉS QUE UN CLUB` 采用程序生成的座椅拼字。层高、分区边界、椅数、包厢与教练席、围栏入口及无障碍平台为几何估算。经典模型的单侧屋顶和分散包厢不能与新规划全覆盖屋顶、VIP 环混用。

## 安菲尔德：官方尺寸与建筑资料

| 数据 | 公开依据 | 在本应用中的含义 |
| --- | --- | --- |
| 球场容量 61,276 | [Liverpool FC 容量公告](https://www.liverpoolfc.com/news/new-anfield-capacity-confirmed-ahead-2024-25) | 官方体育场容量；应用生成位置总数不代表该容量 |
| 场地长 101 米、宽 68 米 | [Premier League 2024/25 Handbook](https://resources.premierleague.pulselive.com/premierleague/document/2024/12/11/e9aa1b9e-a7d5-4788-8afe-6e07b8a5f5fc/TM1603-PL_Handbook-and-Collateral-2024-25_11.12_DIGITAL.pdf)，Liverpool 目录，PDF 第 17 页 | 作为场地几何尺寸 |
| Main 三层、Kenny 两层、Kop 单层、Anfield Road 两层 | [LFC 2026 年 3 月 Access Statement](https://backend.liverpoolfc.com/sites/default/files/2026-03/Access_Statement_-_LATEST__March_5a6934336def9e01eeef96e550620350.pdf) | 作为四个看台的整体结构依据 |
| Anfield Road 扩建屋顶宽 75 米、高 39 米 | [LFC 扩建工程公告](https://www.liverpoolfc.com/news/next-phase-anfield-road-stand-expansion-begin) | 用于参考扩建后建筑尺度；程序屋顶形状仍是估算 |
| Main Stand 屋顶桁架长 140 米 | [设计工程方 Jacobs 的项目公告](https://invest.jacobs.com/news/investor-news/news-details/2016/Jacobs-Helps-Liverpool-Football-Club-Boost-Anfield-Road-Stadium-Capacity-12-07-2016/default.aspx) | 用于参考看台跨度 |

各看台逐排高度、坡度、座距、踏步深度、柱与栏杆位置、包厢尺寸没有完整测绘依据。程序只模拟已建入场景的遮挡，不能核验真实票面座位的视线。坐姿 1.15 米、站姿 1.68 米是相对基座的演示眼高。

## 分区图与坐标约定

完整分区代码和排列主要参考 [Eventmasters 扩建后座位图](https://www.eventmasters.co.uk/event-guides/football-hospitality/liverpool-hospitality/anfield-seating-plan.pdf)。这是第三方票代提供的图，分区布局与实际尺度并非本应用的测绘结果。部分分区通过下文 LFC 官方 hospitality 页面交叉核对。

本应用以球场中心为原点，单位为米，Y 轴向上，X 沿球场宽度，Z 沿球场长度；Main 位于 −X，Kenny 位于 +X，Kop 位于 +Z，Anfield Road 位于 −Z。这是应用坐标约定，不代表地理北向。

| 看台 | 分区带 | 编号排列方向 | 分区代码 |
| --- | --- | --- | --- |
| Main | 下层前段 | Anfield Road 到 Kop | L1–L10 |
| Main | 下层后段短带 | Anfield Road 到 Kop | L11–L16 |
| Main | 中层 | Anfield Road 到 Kop | M1–M9 |
| Main | 上层 | Anfield Road 到 Kop | U1–U9 |
| Kenny | 下层 | Anfield Road 到 Kop | KG、KH、KJ、KK、KL、KM、KN、KP |
| Kenny | 上层 | Anfield Road 到 Kop | CE1–CE9 |
| Anfield Road | 下层 | Kenny 到 Main | AL1–AL9 |
| Anfield Road | 扩建上部看台前段 | Kenny 到 Main | AM1–AM8 |
| Anfield Road | 扩建上部看台后段 | Kenny 到 Main | AU1–AU8 |
| Kop | 连续单层前段 | Main 到 Kenny | 102–109 |
| Kop | 连续单层中段 | Main 到 Kenny | 202–208 |
| Kop | 连续单层后段 | Main 到 Kenny | 304–306 |

Kop 的 100、200、300 系列表示同一连续斜面上的前中后分区。Main 的 L11–L16 位于主要下层块后侧。参考的扩建后图没有 101，因此本应用未加入此旧图常见代码。

AM 在官方 hospitality 票务描述中称为 Middle Tier；官方建筑说明仍将 Anfield Road 定义为两层。程序将 AM/AU 按扩建上部看台的前后排带处理，实际票面命名以俱乐部提供的信息为准。

公开资料未提供完整逐排排数、每排座号起止和所有座椅 XYZ。本应用的示意排从每个分区 1 开始，不能直接对应真实球票排座。导入真实坐标时，票面编号需要先映射到这些示意索引；模型文件与坐标表也必须先校准同一原点、轴向和比例。

## 安全站席

[LFC 2024 年 Kop 护栏安装公告](https://www.liverpoolfc.com/news/rail-seating-be-installed-remainder-kop)确认将护栏座席安装到 Kop 的所有剩余区域。[LFC 许可说明](https://www.liverpoolfc.com/news/lfc-completes-successful-rail-seating-trial-and-will-apply-safe-standing-licence)说明，Kop 与 Lower Anfield Road 的护栏座席区域可实施 safe standing，始终每人对应一个座椅或位置，座椅可以坐或站。

程序将 Kop 显示为护栏站席，自动使用站姿眼高，也可切换坐姿。Anfield Road 下层护栏区域没有逐排核实，因此 AL 仍作为普通示意座位；姿态切换只是视点模拟，不能判断某个真实座位是否允许站立。[官方观赛说明正文](https://www.liverpoolfc.com/news/important-information-fans-attending-matches-anfield-0)明确没有护栏的区域不属于许可站区，其中包括 Anfield Road 上层。

## 包厢、hospitality 与教练席

[LFC Main Executive Boxes](https://events.liverpoolfc.com/event-spaces/main-stand/main-stand-executive-boxes)确认 Main 的独立套间有面向球场的玻璃立面。[LFC Kenny Executive Boxes](https://events.liverpoolfc.com/event-spaces/sir-kenny-dalglish-stand/sir-kenny-dalglish-stand-executive-boxes)确认 Kenny 的独立私密包厢可看球场。官方页面的会务容量 12 人或 10 人不等同足球比赛每个包厢的固定座椅数量。

本应用的 BOX-M、BOX-K 表示示范包厢视点，观察位置位于球场一侧前缘或阳台。其数量、编号、内部排座和尺度都不对应官方包厢库存。

以下 hospitality 是酒廊或套餐与球场座区的关系，并非独立包厢编号：

- [Founders Lounge](https://www.liverpoolfc.com/hospitality/packages/founders-lounge)：比赛座区为 Anfield Road AM4 或 AM5。
- [Brodies Sports Bar](https://www.liverpoolfc.com/hospitality/packages/brodies-sports-bar)：比赛座区为 Anfield Road Middle Tier，页面未列完整分区代码。
- [Beautiful Game](https://www.liverpoolfc.com/hospitality/packages/the-beautiful-game)：比赛座区为 Main M4。
- Eventmasters 图另标注 Anfield Beat L15/L16、Code L11/L12、Reds KG/KN/KP、Village CE2/CE8；这些是对应套餐的座区标记。

[LFC Main Stand Tour 公告](https://www.liverpoolfc.com/news/announcements/231108-reds-to-open-main-stand-for-stadium-tours)与[官方球场游览页面](https://bookings.liverpoolfc.com/stadiumtours/booking/ticketquantities.htm?id=110683)提供 managerial dugout 体验。本应用在 Main 场边中央附近绘制两组主客队示意席位；主客侧别、座椅数量和坐标均为估算，不属于可售观众票位。Carlsberg Dugout hospitality 酒廊与球员、教练替补席是不同空间。

## 无障碍资料

[LFC 2026 年 3 月 Access Statement](https://backend.liverpoolfc.com/sites/default/files/2026-03/Access_Statement_-_LATEST__March_5a6934336def9e01eeef96e550620350.pdf)列出的无障碍入口服务分区包括 Main 下层 L1/L2/L7/L8/L9/L10、中层 M1/M2/M4/M6/M8/M9、上层 U5；Kop 104–108 与 202–208；Kenny KG/KN/KP；Anfield Road AL2–AL9。这是入口与服务分区表，不表示其中所有座位都是轮椅位。

同一官方文件列出可变轮椅位上限 Main 111、Kenny 40、Kop 52、Anfield Road 54，客队最多 24；配置可能随赛事要求和客队分配变化。程序中的 WC-M、WC-KOP、WC-AR 为少量示范平台，既不代表完整数量，也不能用于真实无障碍导航或选票。

## 外部座位视野与模型候选

[3D Digital Venue 的 Anfield 公开选座视野](https://map.3ddigitalvenue.com/liverpool)可用于查阅其提供的分区、排座和三维视图。它是外部服务，本应用没有其原始模型或逐座 XYZ 导出授权。三维渲染视图不等同实拍照片，也不代表所有遮挡或赛事设施始终不变。

[3D Digital Venue 介绍站](https://sites.3ddigitalvenue.com/3dmap/clients/premier-league/anfield/)提供另一分区视野入口；其[网站说明](https://sites.3ddigitalvenue.com/3dmap/clients/premier-league/index.html)称该介绍站为独立网站，不隶属英超、足总或俱乐部。本应用不将第三方网页标注为 Liverpool FC 官方模型下载渠道。

以下仅为找到的模型候选，没有下载、内置或用于生成当前场景：

| 模型 | 发布者与版本 | 获取及精度边界 |
| --- | --- | --- |
| [ANFIELD STADIUM](https://sketchfab.com/3d-models/anfield-stadium-337f6ba6199a4a13b69bbacca53572fd) | PeeJaa，2024-02-26，约 376.6k 三角形 | 页面有正规下载选项，标 Free Standard / NoAI。页面容量仍为 60,725，未验证是否覆盖最终扩建版，未提供逐座映射 |
| [Anfield Stadium – Liverpool FC](https://sketchfab.com/3d-models/anfield-stadium-liverpool-fc-195492f2612e404281d6dfae7f382a2d) | Ihnder，2021-07-28 摄影测量模型 | 作者介绍 Blender 文件，可询问其他格式；未核实免费正式下载权，早于 Road 扩建 |
| [Liverpool – Anfield Stadium 3D](https://sketchfab.com/3d-models/liverpool-anfield-stadium-3d-d45b78e5162e43a39eb21bec5cfa674f) | Shin Xiba 3D，旧版本 | 作者将下载或购买入口移往 Fab；未取得文件和许可 |
| [Anfield Stadium – Liverpool](https://www.cgtrader.com/3d-models/exterior/stadium/anfield-stadium-liverpool) | SENSIET，2021 旧容量版 | 付费，页面为 Editorial License（no AI）；列出 BLEND、OBJ、FBX、DAE、STL，未取得文件 |
| [Anfield](https://embed-3dwarehouse-classic.sketchup.com/model/cb6b54bee58e45ab1f772012fbe58e8/Anfield) | Dave P. 页面，模型注明 AFC123，2009 制作、2014 更新 | 3D Warehouse 老版本，容量注明 45,276；平台下载与许可条件需另行确认，未取得文件 |

PeeJaa 页面 NoAI 条件明确禁止将模型用于生成式 AI 的输入、数据集或开发材料。以上许可记录只反映核查时的页面信息，不构成文件使用授权；取得文件后应以其完整许可为准。

GLB 导入可以替换视觉几何，但不会自动产生官方座号或座位坐标。即使取得高质量模型，逐座坐标、空间比例和座号映射仍需独立校准。

## 鸟瞰外观与 Google 在线三维地图

本次本地建筑改版参考 [LFC 2024-10-24 官方航拍](https://www.liverpoolfc.com/news/anfield-crowned-uks-best-landmark-remarkable-venue-awards-2024)：浅银灰屋顶、Main 上方桁架、Road 砖与玻璃立面、看台角部连接及外围道路。照片已实际查看；几何、纹理及附近住宅仍为程序近似，没有使用照片提取的测绘网格或从 Google 复制建筑几何。

真实地图入口使用 Google 官方 [Maps JavaScript 3D Maps](https://developers.google.com/maps/documentation/javascript/3d/overview) 的 [Map3DElement](https://developers.google.com/maps/documentation/javascript/reference/3d-map) 与 [Marker3DElement](https://developers.google.com/maps/documentation/javascript/reference/3d-map-draw)。地图保留 Google 署名，由其在线组件请求影像，不缓存或导出成球场 GLB。仅在用户本机输入 key 并点击加载后请求 SDK；标准 key 的项目授权与费用参见 [API key 设置](https://developers.google.com/maps/documentation/javascript/get-api-key) 和 [使用与计费](https://developers.google.com/maps/documentation/javascript/usage-and-billing)。

Google 提供无需账单信息的有限额度 [Demo Key](https://developers.google.com/maps/documentation/javascript/demo-key)，适合原型验证，由用户本人申请；正式服务应使用标准 key。英国列在 [官方覆盖表](https://developers.google.com/maps/coverage) 的支持范围，但本次没有有效 key 实测安菲尔德瓦片，不能核实其建筑覆盖、采集日期或是否呈现最终扩建版本。组件初始化成功与影像真实绘制完成分开提示。

标记配准采用 [OpenStreetMap 球场 way 124589354](https://www.openstreetmap.org/way/124589354) 的四角平均中心 `53.4308458, -2.9608203`，长轴由该轮廓推算为 Road 端 `39.74°`、Kop 端 `219.74°`。Main 在西北侧，Kenny 在东南侧。该中心和方位是对公开轮廓的近似计算，不能赋予逐座定位精度。© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)，ODbL。

本地 Y 高度没有真实海拔依据；Google 镜头以地面为目标，座位指示使用相对地面高度。被屋顶挡住的标记仍可显示，它只表示应用估算位置，不表示从 Google 模型识别到真实座椅。座位内部视野继续使用可控的本地模型。

## 纪念大门、检票口与局部围栏

两座大门的位置和入口组字母参考 [LFC 2025/26 Visiting Supporters Guide，第 5 页](https://backend.liverpoolfc.com/sites/default/files/2026-01/LFC_Visiting_Fans_Booklet_be6a8654d01a9d32e6362c4ee2d2bd30.pdf)。Shankly Gates 在 Road/Kenny 角外侧；Paisley Gateway 在 Kop 外侧中央附近，后者不同于 Main/Kop 角的 Paisley Square。[LFC 2016 年报道](https://www.liverpoolfc.com/news/first-team/235015-callaghan-why-anfield-holds-a-special-place-in-my-heart)确认 Shankly 迁至当时 Centenary Stand 入口。

造型人工对照了两张作者公开照片：[Mike Pennington 的 Shankly Gates，2018-08-25，CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:The_Shankly_Gates,_Anfield,_Liverpool_-_geograph.org.uk_-_5885069.jpg)、[Phil Nash 的 Paisley Gateway，2018-08-31，CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Paisley_Gateway,_Anfield.jpg)。照片未下载、嵌入或用于材质贴图。程序用几何和自绘字牌概括红砖门柱、黑铁栏、金色字带、卷草、Paisley 的三只欧洲杯及双色盾徽；徽记与纪念牌为简化表达，不是精确雕塑复制。历史照片只用于门体形态，周边看台仍使用扩建后的建筑参考。

四看台的检票口含红色门框、灰白多层横杆全高旋转闸和读卡面板，参考 [LFC NFC 入场指南，第 2 页](https://d3j2s6hdd6a7rg.cloudfront.net/uploads/7848__0645__170174_instruction_pdf_-_iphone_18.12.20.pdf) 的官方照片。示范入口取自官方字母组；其门数、宽度、排队栏位置和建筑门洞为估算，不构成实际票务入口导航。

外围补充的是大门邻接铁栏、低砖墙、入口分流栏及无障碍通道。[LFC 2024-09 Fans Forum](https://backend.liverpoolfc.com/sites/default/files/2024-10/September%20fans%20forum%20-%202024.pdf)记载 Road 扩建施工围栏拆除，因此本应用不把旧施工围挡建成包围整个球场的永久高栏。门与栏的尺寸、精确空间位置和完整场界尚无测绘；入口近览仅用于查看参考重建。
