# 球场座位视野探索器 · 安菲尔德 / 诺坎普 / 伯纳乌 / 安联 / 老特拉福德

[在线体验](https://hszzhua2.github.io/stadium-seat-explorer/) · [GitHub 仓库](https://github.com/hszzhua2/stadium-seat-explorer) · [MIT 许可证](LICENSE)

现在可在页面顶部切换 **安菲尔德**、**经典诺坎普（改建前）**、**伯纳乌（改造后形态）**、**拜仁慕尼黑安联球场** 和 **曼联老特拉福德**。五个球场使用独立的看台、空间模型、分区平面图和地理基准。旧版没有 `venue` 的位置链接仍会打开安菲尔德；新链接会包含所选球场的 `venue` 参数。

## 开源与 GitHub Pages

这是一个独立的球场视野可视化项目。项目代码采用 MIT 许可证，Third-party 组件的许可与地理数据归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，模型参考与精度说明见 [SOURCES.md](SOURCES.md)。分区、排座和视点坐标为估算，不代表官方票务数据。

- 在线版是纯静态页面，默认的五座本地程序模型无需 API key；GLB 和坐标导入在浏览器内存中处理，不上传到服务器。
- 下载或克隆后，Windows 双击 `start.cmd`；其他系统安装 Node.js 18+ 后运行 `npm start`。无需安装 npm 依赖，运行模块已经附带。
- 运行 `npm test` 检查数据、服务与部署路径；运行 `npm run build` 生成 `dist/`。源码和构建目录均支持部署在域名子目录。
- 本仓库的 `main` 分支推送后，GitHub Actions 会测试、构建并发布 GitHub Pages。Fork 后在 Settings → Pages 中选择 GitHub Actions，再运行部署工作流。
- 可分享带 `?venue=old-trafford&section=OT-S1-04&row=18&seat=10` 的位置链接。Google 三维地图是可选服务，需要使用者自行配置有相应权限和站点限制的 API key；仓库和部署包不包含密钥。
- `package.json` 中的 `private: true` 只用于防止误发 npm 包，不限制 GitHub 仓库公开或 MIT 许可。

## 新增老特拉福德

- 版本为**现有 Old Trafford**，参考北侧 Sir Alex Ferguson 三层高看台、较低的南侧 Sir Bobby Charlton 看台、东西两端两层看台和角部连接区。采用四侧屋顶、外露桁架、红色座椅与白色拼字；未来新球场规划不属于这个模型。
- 本地坐标以场地中心为原点、Y 向上、Z 沿场地长轴。**北看台为 −X、南看台为 +X、东看台为 −Z、西 Stretford End 为 +Z。** 平面图上方为东看台，下方为 Stretford End，不是地理北向朝上。
- 可选择普通座席、Stretford End 第二层及局部角区的站席示意位、包厢、南侧场边教练席和无障碍视点，并使用日夜、观众、屋顶剖开与入口近览。
- 教练席参考 2026 年公开扩建的前／中／后三排 **6 / 7 / 8** 布局；第 1 排在最前方，应用会随排号改变座位数量。A/B 主客方向、基座高度、逐座间距与设施坐标仍为估算。
- **所有 OT 开头的代码和排座、包厢、入口编号均由本应用定义，不是票面座号。** 座椅数量不代表官方容量。可导入同坐标系的 GLB 与坐标文件进一步校准。
- 本地地址：`http://127.0.0.1:5173/?venue=old-trafford`；示例文件：`samples/old-trafford-coordinates.example.json`，建议包含 `venueId: "old-trafford"`。
- Google 模式使用现有老特拉福德的草坪中心和朝向，未使用真实 key 验证在线瓦片。界面采用红、黑、白配色，素材在本机生成。

## 新增安联球场

- 参考慕尼黑安联球场的菱形气膜外立面、连续三层看台与固定屋顶中央开口。日间外壳为银白色，夜场为拜仁红色灯光；场内采用红色座椅和南北两端大屏幕。
- 四看台分别为 West（西，−X）、East（东，+X）、Nord（北，−Z）、Süd（南，+Z）；场地 105 × 68 m，Y 轴向上，场地中心为原点。
- 提供普通座席、南北下层的站席示意区、层间包厢、西侧场边教练席和东、西、北侧无障碍平台。站席范围和设施位置为估算，不代表特定赛事的票种或通行权限。
- **AW、AE、AN、AS 和 AA 开头的分区、所有排座与设施编号都是本应用示意编号。** 台阶、坡度、座椅间距、外壳气膜数量、包厢和入口均为近似重建；可选视点数量不代表官方容量。
- 接入平面选区、排座选择、坐站眼高、日夜、观众、屋顶剖开、入口近览、GLB 与坐标导入。主题为红、白与深蓝。
- 本地地址：`http://127.0.0.1:5173/?venue=allianz-arena`；示例文件：`samples/allianz-arena-coordinates.example.json`，包含 `venueId: "allianz-arena"`。
- Google 三维模式定位慕尼黑安联球场，标记使用草坪中心与朝向的近似换算。未使用真实 key 验证瓦片；影像时期、覆盖与实际灯光由 Google 提供。

## 新增伯纳乌

- 参考改造后的银色不锈钢百叶外立面、覆盖四侧的屋顶和环形屏幕，屋顶中央默认展示开放形态。模型保留蓝色座椅、白色 `REAL MADRID` 看台字样，并增加四侧入口、检票闸与围栏。
- 四看台为 Lateral Oeste（西，−X）、Lateral Este（东，+X）、Fondo Norte（北，−Z）、Fondo Sur（南，+Z）。球场为 105 × 68 m，Y 轴向上，场地中心为原点。
- 普通座席、包厢、教练席和无障碍示意位置均可在平面图选择，并进入对应三维眼高。界面使用白、深蓝、金色主题；日夜、观众与屋顶剖开控件可继续使用。
- **O、E、N、S 分区代码及所有排座号都是本应用的示意编号。** 层级名称参考公开票务资料，分区几何、层高、排数、视点数量、包厢与入口均为估算，不是官方测绘或票面座号对应表。
- 模型用四组主要连续坡面近似承载七个参考层级名称，部分相邻层级连续衔接；这属于几何简化，不表示真实伯纳乌只有四层。
- 本地地址：`http://127.0.0.1:5173/?venue=bernabeu`；示例文件：`samples/bernabeu-coordinates.example.json`，包含 `venueId: "bernabeu"`。
- Google 三维模式会定位马德里的伯纳乌，但瓦片年份与实际改造阶段由 Google 决定。本次未使用真实 key 验证瓦片，在线影像不等于本地可选座模型。

五馆共用一个启动脚本。切换球场会重新载入页面，导入的 GLB 与坐标需在目标球场重新选择。建筑来源见 `SOURCES.md` 和页面“模型与资料”。

## 新增经典诺坎普

- 版本：以改建前公开照片与建筑资料为参考的程序复原，具有连续三层碗形看台、Tribuna 单侧屋顶、Lateral 黄色 `MÉS QUE UN CLUB` 字样、红色上下层与蓝色中层座椅。当前改建现场与未来新屋顶方案不属于这一版本。
- 四看台：Tribuna（−X）、Lateral（+X）、Gol Nord（−Z）、Gol Sud（+Z）。球场为 105 × 68 m，Y 向上，场地中心为原点。
- 切换球场后，界面同步使用诺坎普的深蓝、酒红与金色主题；安菲尔德保留红白主题。
- 普通座席、包厢、教练席和无障碍平台均可选择。经典晚期为全座席球场，故不虚构可售站票区域；姿态控件可体验站姿眼高。
- **TR、LA、GN、GS 及其他所有分区代码、排座号均为应用示意编号，不是官方票面编号。** 各层排数、座位总数、逐座位置、包厢尺寸和出入口均属估算，不能代替售票或现场无障碍导航。
- 入口近览和鸟瞰使用本地建筑模型；Google 模式会定位巴塞罗那的诺坎普，但影像可能处于施工期，与经典模型不同时期。
- 本地地址：`http://127.0.0.1:5173/?venue=camp-nou`。样例坐标：`samples/camp-nou-coordinates.example.json`。JSON 建议包含 `venueId: "camp-nou"`；不同球场文件会受到校验。

切换球场会重新载入页面，导入的 GLB 与坐标需在目标球场重新选择。切换不会沿用另一球场的测绘坐标。文档下方原有的 L/M/U、CE、Kop、AM/AU 说明仅针对安菲尔德。

## 安菲尔德

本机运行的中文前端：在平面分区图中选择看台、估算排号和位置，进入对应空间视点观看足球场。包含四个看台、包厢示意视点、安全站席、无障碍示意位置及场边主客队教练席，支持坐姿/站姿和后续导入模型与测绘坐标。

界面参考利物浦足球俱乐部官网的红、白、深灰主题，使用本地系统字体，适配桌面与手机浏览器。主题变量集中在 `src/style.css`；这是独立原型，未使用官网的专有字体或俱乐部标志。

当前球场是**依据公开分区与场地尺寸建立的程序化空间重建**。真实分区代码与估算排号/位置分开标记；生成的排号、座号、坡度、包厢编号及教练席坐标不是官方测绘，也不能对应票面真实座号。它用于比较位置和视野，不提供官方售票、库存或实景照片。

## 启动

1. 将整个文件夹解压到任意本地目录，保持 `src`、`vendor` 等子目录完整。
2. 双击 **`start.cmd`**。脚本会启动本地服务并打开浏览器。
3. 默认地址为 **http://127.0.0.1:5173/**。保持终端窗口打开，按 `Ctrl+C` 停止服务。

无需 `npm install`。本地重建模式运行时无需联网；Google 真实三维模式需联网和你自己的地图密钥。Three.js 已随项目提供；使用支持 WebGL 2 的现代浏览器。不要通过双击 `index.html` 的方式打开，浏览器的本地文件限制会阻止模块正常加载。

启动脚本优先寻找 PATH 中的 Node.js，然后尝试 Codex 随附的 `%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`。如果两处均无 Node，请从 [Node.js 官方下载页](https://nodejs.org/en/download) 安装 Node.js 18 或更新版本后重新启动。脚本不会自动安装软件。

在项目文件夹的 PowerShell 中也可执行：

```powershell
.\start.cmd -Port 5174
.\start.cmd -Port 5174 -NoBrowser
```

有 Node.js 的其他系统可执行：

```sh
node server.mjs --host 127.0.0.1 --port 5173 --open
```

端口冲突会给出明确提示，换一个 `-Port` 即可。若浏览器没有自动打开，手动访问终端显示的地址。

## 使用与覆盖范围

在平面图点选分区，再选该分区的示意排/座。平面图和三维相机共享同一坐标模型，显示的 XYZ 是眼睛位置。坐姿与站姿改变眼高，不改变该位置在地面的归属。

| 看台/位置 | 本地模型的组织方式 |
| --- | --- |
| Main Stand / 主看台 | 下层 L1–L10 前段及 L11–L16 后段，中层 M1–M9，上层 U1–U9 |
| Sir Kenny Dalglish Stand / 肯尼·达格利什看台 | 下层 KG、KH、KJ、KK、KL、KM、KN、KP，上层 CE1–CE9 |
| The Kop / Kop 看台 | 同一连续斜面，前段 102–109、中段 202–208、后段 304–306；不是三层楼 |
| Anfield Road Stand / 安菲尔德路看台 | 下层 AL1–AL9，新上层前段 AM1–AM8、后段 AU1–AU8；建筑为两层 |
| 包厢 | Main 与 Kenny 的示意包厢视点；BOX-M、BOX-K 编号仅供应用定位，非真实包厢编号 |
| 安全站席 | Kop 的栏杆座席；Road 下层栏杆区域采用示意布局，可切换眼高。站席仍与单个座位对应，不是自由站立场区 |
| 无障碍位 | 若干无障碍平台示意视点，不能代替实际轮椅位编号和赛事配置 |
| 教练席 | Main 场边中线附近两组示意席位；主客侧别、椅数、坐标均估算，不是可售观众位 |

真实球场的柱、栏杆、人群、广告、包厢玻璃等可能影响视线，程序重建仅能反映已建入模型的几何。若要核对真实票面座号和视野，可使用 [Anfield 的 3D Digital Venue 公开服务](https://map.3ddigitalvenue.com/liverpool)。

## 导入精确座位坐标

使用页面的数据导入入口选择 JSON。示例文件为 `samples/seat-coordinates.example.json`，里面的数值仍是演示坐标，用来验证格式，不是测绘数据。

```json
{
  "version": 1,
  "seats": [
    {"sectionId": "L5", "row": 1, "seat": 1, "x": -39, "y": 2, "z": -10.2125}
  ]
}
```

`sectionId` 必须是应用已有分区，`row` 与 `seat` 是该分区内从 1 开始的示意索引，必须在页面可选范围内。已有真实票面编号的数据需先映射到这些索引；第一版不能仅靠坐标文件创建任意新分区、真实排号体系或更大的座号范围。

`x`、`y`、`z` 是米制有限数值，表示**座椅基座/脚下地面位置**，不是眼睛位置。应用另加眼高：默认坐姿 1.15 米、站姿 1.68 米。每份文件允许 1–150,000 个位置，不允许重复分区/排/座组合；为发现单位或轴向错误，坐标需在 `|x| ≤ 1000`、`|z| ≤ 1000`、`-10 ≤ y ≤ 200` 的范围内。

成功导入的新文件会替换上一次坐标表，未覆盖的位置继续使用估算坐标；格式校验失败会保留上一次有效导入。文件只在当前浏览器会话内存中解析，不上传服务器，刷新页面后需重新导入。精确坐标更新已覆盖位置的相机和座椅示意位置，但台阶、屋顶、包厢和看台结构不会因此自动成为测绘几何；要匹配真实遮挡，应同时导入同坐标系的精确模型。

## 导入 GLB 球场模型

可在页面的模型导入入口加载合法取得的 GLB。文件必须自包含，buffer 与纹理嵌入文件，不引用外部 URL 或文件。Draco/Meshopt 压缩模型需先解压并重新导出为普通 GLB。模型成功加载后隐藏程序重建场景；导入失败则保留原场景。模型文件只在浏览器会话内存中解析，不上传服务器。

模型与座位 JSON 必须使用下面同一坐标系：

| 项目 | 安菲尔德 | 经典诺坎普 | 伯纳乌 | 安联球场 | 老特拉福德 |
| --- | --- | --- | --- | --- | --- |
| 单位 | 米 | 米 | 米 | 米 | 米 |
| 原点 | 球场中心、草皮地面高度 | 球场中心、草皮地面高度 | 球场中心、草皮地面高度 | 球场中心、草皮地面高度 | 球场中心、草皮地面高度 |
| Y | 竖直向上 | 竖直向上 | 竖直向上 | 竖直向上 | 竖直向上 |
| X | Main 在负 X，Kenny 在正 X | Tribuna 在负 X，Lateral 在正 X | Oeste 在负 X，Este 在正 X | West 在负 X，East 在正 X | SAF 北看台负 X，SBC 南看台正 X |
| Z | Kop 在正 Z，Anfield Road 在负 Z | Gol Sud 在正 Z，Gol Nord 在负 Z | Sur 在正 Z，Norte 在负 Z | Süd 在正 Z，Nord 在负 Z | Stretford 西端正 Z，东端负 Z |
| 场地参考 | 长 101 米、宽 68 米 | 长 105 米、宽 68 米 | 长 105 米、宽 68 米 | 长 105 米、宽 68 米 | 长 105 米、宽 68 米 |

这些轴向是本应用的坐标约定，不代表地理北向。请在 Blender 等工具中先校准比例、朝向和原点，再导出模型。导入 GLB 只替换视觉几何，不会从模型自动推断官方座号、精确座位坐标或坐标映射。模型与座位数据未校准时，相机可能落入结构内部或看向错误位置。

公开网页中的模型“可以观看”不等于可复制并再分发。本项目没有捆绑第三方球场模型或真实座位全景图。已找到的模型候选及许可情况在 `SOURCES.md` 中记录；可后续使用有许可的模型提升材质、结构和遮挡准确度。

## 数据依据与实现

资料核查日期：2026-10-04。公开来源支持的分区结构与已测绘的空间坐标是两件不同的事。

- 官方确认球场容量为 61,276，但本程序生成的示意位置总数不代表官方容量：[LFC 容量公告](https://www.liverpoolfc.com/news/new-anfield-capacity-confirmed-ahead-2024-25)。
- 四看台建筑层数、无障碍入口与设施参考 [LFC 2026 年 3 月无障碍说明](https://backend.liverpoolfc.com/sites/default/files/2026-03/Access_Statement_-_LATEST__March_5a6934336def9e01eeef96e550620350.pdf)。
- 长 101 米、宽 68 米参考 [Premier League 2024/25 官方手册](https://resources.premierleague.pulselive.com/premierleague/document/2024/12/11/e9aa1b9e-a7d5-4788-8afe-6e07b8a5f5fc/TM1603-PL_Handbook-and-Collateral-2024-25_11.12_DIGITAL.pdf)。
- 扩建后分区代码参考 [Eventmasters 座位图](https://www.eventmasters.co.uk/event-guides/football-hospitality/liverpool-hospitality/anfield-seating-plan.pdf)，并用官方 hospitality 信息核对部分分区。
- Kop 栏杆座席参考 [LFC 安装公告](https://www.liverpoolfc.com/news/rail-seating-be-installed-remainder-kop)，安全站席政策参考 [LFC 试验与许可说明](https://www.liverpoolfc.com/news/lfc-completes-successful-rail-seating-trial-and-will-apply-safe-standing-licence)。
- Main/Kenny 独立包厢参考 [Main Executive Boxes](https://events.liverpoolfc.com/event-spaces/main-stand/main-stand-executive-boxes) 和 [Kenny Executive Boxes](https://events.liverpoolfc.com/event-spaces/sir-kenny-dalglish-stand/sir-kenny-dalglish-stand-executive-boxes)。
- 教练席位于 Main 场边的依据见 [LFC Main Stand Tour 公告](https://www.liverpoolfc.com/news/announcements/231108-reds-to-open-main-stand-for-stadium-tours)。Carlsberg Dugout 酒廊不等同球员/教练替补席。

前端使用原生 ES Modules 与随包提供的 Three.js；本地服务只使用 Node.js 标准库。Three.js 的 MIT 许可证保留在 `vendor/three/LICENSE`。

开发验证命令：

```sh
node --test
```

自动验证覆盖五馆看台坐标方向、排级升高、可选范围、坐姿/站姿眼高、坐标导入校验和原子替换，以及跨馆坐标隔离；还验证不等座数教练席各排的范围。服务验证覆盖 HTML/MIME、GET/HEAD、健康检查、端口参数、编码错误、路径越界、隐藏文件和链接越界。另有五馆地理朝向换算与 Google SDK 按需加载、单实例复用、网络/授权错误和组件清理的离线测试。离线测试不代表已经验证 Google 真实瓦片。健康检查地址为 `/api/health`。

## 更新：依据真实航拍改进鸟瞰，接入 Google 三维地图

鸟瞰默认展示完整的屋顶和建筑外壳。改版参考 [Liverpool FC 的 2024 年官方航拍](https://www.liverpoolfc.com/news/anfield-crowned-uks-best-landmark-remarkable-venue-awards-2024)，补充看台外立面、屋顶体量、角部连接和示意街区；“剖开屋顶”仅用于观察内部结构。本地模型及周边仍是重建，不能称为 Google 真实模型。

点击视野上方的 **Google 真实 3D** 或 **地图配置**，在本机输入自己的 Google Maps Platform 浏览器 key，然后点击加载。使用的是 Google 官方 `Map3DElement` 在线三维地图，地图瓦片不会下载为本地 GLB，也不随压缩包再分发。Google 的图像和数据署名由其地图组件显示。

原型阶段可自行申请 [Google 官方 Demo Key](https://developers.google.com/maps/documentation/javascript/demo-key)，支持官方列出的三维地图功能和有限额度，需要本人登录 Google 并接受其条款；正式项目使用标准 key，需启用 Maps JavaScript API 和计费。标准 key 应设置浏览器来源限制（例如 `http://127.0.0.1:5173/*`，使用其他端口时添加对应来源）。加载地图会按你的 key 类型产生配额消耗或费用，参见 [Google 使用与计费说明](https://developers.google.com/maps/documentation/javascript/usage-and-billing)。程序不替你开通账户或账单。

密钥只在当前页面会话内使用，不写到项目文件、地址栏或 localStorage。未配置密钥时，不请求 Google API；仍可打开 Google Earth 的公开参考入口。换一把 key 应刷新页面后重新输入。Google 模式需要你的网络能访问 Google Maps 服务，真实三维覆盖、影像时期及扩建版本由 Google 提供；本次未使用有效 key 验证安菲尔德瓦片。

Google 鸟瞰中的位置标记仍来自本项目的估算座位坐标。球场中心采用 `53.4308458, -2.9608203`，长轴按 OSM 球场几何推算为 Road 端 `39.74°`、Kop 端 `219.74°`；这改善地理配准，不会把估算座位变成实测座位。原点与朝向来源为 [OpenStreetMap 球场轮廓](https://www.openstreetmap.org/way/124589354)，© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)，ODbL。

进入“座位视角”会返回本地可控模型，因为外部航拍三维影像不提供当前真实座号、屋顶剖开或可验证的座椅内部测绘。“Google 真实 3D”不代表已把 Google 建筑几何导入本地选座模型。

## 更新：围栏、大门与入口近览

本地建筑模型增加 Shankly Gates、Paisley Gateway、四看台示范检票口、全高旋转检票闸、读卡面板、邻接铁栏和入口分流栏。两座纪念门依据官方位置图与公开照片复原，门宽、柱高、栏距和内部装饰仍为近似值；来源见 `SOURCES.md`。

在视野上方的 **外围入口近览** 下拉框选择大门或看台入口，可自动移到近距离视角，拖动旋转、滚轮缩放。选择 **球场全景** 返回鸟瞰，点击 **座位视角** 返回已选座位。入口近览使用本地建筑模型；导入外部 GLB 后需恢复本地模型才能使用这些预置入口定位。
