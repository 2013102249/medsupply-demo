/* ============================================================
   医药供应数字化平台 · 数据层（演示数据 + localStorage 持久化）
   ============================================================ */
'use strict';

/* ---------------- 图标（Feather 风格线性图标） ---------------- */
const I = (name, cls) => `<svg class="icon ${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`;
const ICONS = {
  home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  box:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  cart:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  back:'<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  print:'<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  warn:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  sliders:'<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  card:'<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  brief:'<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  activity:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  truck:'<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  chev:'<polyline points="9 18 15 12 9 6"/>',
  reset:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  layers:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  cross:'<rect x="3" y="3" width="18" height="18" rx="5" fill="#fff" stroke="none" opacity=".95"/><path d="M12 7v10M7 12h10" stroke="#7C3AED" stroke-width="3.2" stroke-linecap="round" fill="none"/>',
  edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'
};

/* ---------------- 角色与权限 ---------------- */
const ROLES = {
  ops:  { id:'ops',  name:'运营人员', desc:'订单处理 · 商品上下架 · 库存跟进', color:'#7C3AED', icon:'activity',
          menus:['dashboard','products','categories','orders','aftersales','profile'],
          perms:['order.create','order.review','order.ship','order.receive','order.cancel','order.abnormal','product.edit','product.toggle','after.create','after.receive'] },
  biz:  { id:'biz',  name:'商务人员', desc:'客户档案 · 价格管理 · 销售查询', color:'#2563EB', icon:'brief',
          menus:['dashboard','products','orders','aftersales','profile'],
          perms:['order.create','after.create'] },
  qa:   { id:'qa',   name:'质管人员', desc:'资质审核 · 质量判定 · 效期管理', color:'#0D9488', icon:'shield',
          menus:['dashboard','products','orders','aftersales','profile'],
          perms:['cert.review','after.qa'] },
  fin:  { id:'fin',  name:'财务人员', desc:'订单对账 · 退款审批 · 发票管理', color:'#D97706', icon:'card',
          menus:['dashboard','orders','aftersales','profile'],
          perms:['after.refund'] },
  admin:{ id:'admin',name:'系统管理员', desc:'权限配置 · 基础数据 · 日志审计', color:'#4F46E5', icon:'sliders',
          menus:['dashboard','products','categories','orders','aftersales','logs','permissions','profile'],
          perms:['*'] }
};

/* ---------------- 状态字典 ---------------- */
const ORDER_STATUS = {
  pending:        { label:'待确认',   tag:'warning' },
  toship:         { label:'待出库',   tag:'info'    },
  shipped:        { label:'已出库',   tag:'blue'    },
  received:       { label:'已签收',   tag:'success' },
  cancel_reviewing:{ label:'取消审批中', tag:'warning' },
  cancelled:      { label:'已取消',   tag:'gray'    },
  abnormal:       { label:'异常',     tag:'danger'  }
};
const AFTER_STATUS = {
  qa_review:  { label:'待质管审核', tag:'warning' },
  wh_receive: { label:'待仓库入库', tag:'info'    },
  fin_refund: { label:'待财务退款', tag:'blue'    },
  done:       { label:'已完成',     tag:'success' },
  rejected:   { label:'已拒绝',     tag:'gray'    }
};
const CERT_TYPES = ['药品注册证','GMP证书','检验报告'];
const CUSTOMER_LEVELS = { A:'A级客户', B:'B级客户', C:'C级客户' };

/* ---------------- 工具函数 ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtMoney = n => '¥' + Number(n||0).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const pad = n => String(n).padStart(2,'0');
const fmtDT = iso => { if(!iso) return '—'; const d=new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtD = iso => iso ? String(iso).slice(0,10) : '—';
const daysUntil = iso => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
const nowISO = () => new Date().toISOString();
function genNo(prefix){
  const d = new Date();
  const ymd = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const seq = DB.data[prefix==='SO'?'orders':'aftersales'].length + 101;
  return prefix + ymd + seq;
}
function addLog(module, action, detail){
  DB.data.logs.unshift({ id:Date.now()+''+Math.floor(Math.random()*1000), time:nowISO(),
    module, operator: App.role().name, role: App.role().id, action, detail });
  DB.save();
}
/* 证照状态：过期 / 临期（30 天内）/ 有效 */
function certState(cert){
  const days = daysUntil(cert.expiry);
  if(days < 0) return { label:'已过期', tag:'danger', cls:'expired' };
  if(days <= 30) return { label:`临期(${days}天)`, tag:'warning', cls:'soon' };
  return { label:'有效', tag:'success', cls:'' };
}
/* 批号效期状态：过期 / 近效期（180 天内）/ 正常 */
function batchState(b){
  const days = daysUntil(b.expiry);
  if(days < 0) return { label:'已过期', tag:'danger' };
  if(days <= 180) return { label:`近效期(${days}天)`, tag:'warning' };
  return { label:'正常', tag:'success' };
}
const avail = p => (p.stock.total - p.stock.locked);
const productById = id => DB.data.products.find(p=>p.id===id);
const customerById = id => DB.data.customers.find(c=>c.id===id);
const orderById = id => DB.data.orders.find(o=>o.id===id);
const afterById = id => DB.data.aftersales.find(a=>a.id===id);
const catPath = id => {
  const find = (nodes, trail) => {
    for(const n of nodes){
      if(n.id===id) return [...trail, n.name];
      const r = find(n.children||[], [...trail, n.name]);
      if(r) return r;
    }
    return null;
  };
  return (find(DB.data.categories,[])||[]).join(' / ') || '未分类';
};
function can(perm){ const ps = App.role().perms; return ps.includes('*') || ps.includes(perm); }

/* ---------------- 数据库 ---------------- */
const DB = {
  KEY: 'medplat_v1',
  data: null,
  load(){
    try{
      const raw = localStorage.getItem(this.KEY);
      if(raw){ this.data = JSON.parse(raw); return; }
    }catch(e){}
    this.seed(); this.save();
  },
  save(){ try{ localStorage.setItem(this.KEY, JSON.stringify(this.data)); }catch(e){} },
  reset(){ localStorage.removeItem(this.KEY); this.seed(); this.save(); },
  seed(){ this.data = JSON.parse(JSON.stringify(SEED)); }
};

/* ---------------- 种子数据（模拟数据，基准日 2026-10-11） ---------------- */
const SEED = {
  customers:[
    { id:'C01', name:'郑州康民大药房连锁', level:'A', status:'active',  contact:'王经理', phone:'13803710001' },
    { id:'C02', name:'河南百姓缘医药',     level:'B', status:'active',  contact:'李经理', phone:'13803710002' },
    { id:'C03', name:'洛阳仁济医院',       level:'C', status:'active',  contact:'赵主任', phone:'13803710003' },
    { id:'C04', name:'新乡健康源药业',     level:'A', status:'paused',  contact:'孙经理', phone:'13803710004' },
    { id:'C05', name:'开封惠民诊所',       level:'B', status:'active',  contact:'周医生', phone:'13803710005' },
    { id:'C06', name:'南阳华康医药',       level:'C', status:'active',  contact:'吴经理', phone:'13803710006' }
  ],
  categories:[
    { id:'G1', name:'化学药品', children:[
      { id:'G1-1', name:'抗感染类', children:[ { id:'G1-1-1', name:'青霉素类', children:[] }, { id:'G1-1-2', name:'头孢菌素类', children:[] } ] },
      { id:'G1-2', name:'解热镇痛类', children:[] },
      { id:'G1-3', name:'消化系统类', children:[] },
      { id:'G1-4', name:'心血管类', children:[] }
    ]},
    { id:'G2', name:'生物制品', children:[ { id:'G2-1', name:'胰岛素类', children:[] } ]},
    { id:'G3', name:'中成药', children:[] }
  ],
  products:[
    { id:'P01', code:'SP-1001', name:'阿莫西林胶囊', spec:'0.25g×24粒', dosageForm:'胶囊剂', approvalNo:'国药准字H44021818',
      manufacturer:'华南制药股份有限公司', origin:'广东广州', barcode:'6945832100126', categoryId:'G1-1-1', unit:'盒',
      status:'active', stock:{ total:2400, locked:150, transit:500 },
      batches:[ {batchNo:'A20260412', expiry:'2027-04-12', qty:1650}, {batchNo:'A20250830', expiry:'2026-09-30', qty:0} ],
      prices:{A:8.5,B:9.2,C:9.8}, priceHistory:[{date:'2026-08-01',from:8.0,to:8.5,operator:'李商务'}],
      certificates:[ {id:'CT01',type:'药品注册证',no:'国药准字H44021818',expiry:'2028-05-20',status:'approved'},
                     {id:'CT02',type:'GMP证书',no:'GMP-Hen-2025-0331',expiry:'2027-06-15',status:'approved'},
                     {id:'CT03',type:'检验报告',no:'BG-2026-0912',expiry:'2027-03-10',status:'approved'} ] },
    { id:'P02', code:'SP-1002', name:'布洛芬缓释胶囊', spec:'0.3g×20粒', dosageForm:'缓释胶囊', approvalNo:'国药准字H20013062',
      manufacturer:'津门史克制药有限公司', origin:'天津', barcode:'6945832100133', categoryId:'G1-2', unit:'盒',
      status:'active', stock:{ total:1800, locked:0, transit:0 },
      batches:[ {batchNo:'B20260220', expiry:'2028-02-20', qty:1800} ],
      prices:{A:12.6,B:13.5,C:14.2}, priceHistory:[], 
      certificates:[ {id:'CT04',type:'药品注册证',no:'国药准字H20013062',expiry:'2027-12-01',status:'approved'},
                     {id:'CT05',type:'检验报告',no:'BG-2026-0822',expiry:'2027-02-18',status:'approved'} ] },
    { id:'P03', code:'SP-1003', name:'注射用头孢曲松钠', spec:'1.0g×10支', dosageForm:'注射剂', approvalNo:'国药准字H20033363',
      manufacturer:'沪上罗氏制药有限公司', origin:'上海', barcode:'6945832100140', categoryId:'G1-1-2', unit:'盒',
      status:'active', stock:{ total:320, locked:80, transit:200 },
      batches:[ {batchNo:'C20260115', expiry:'2027-03-15', qty:400} ],
      prices:{A:38.0,B:41.0,C:45.0}, priceHistory:[],
      certificates:[ {id:'CT06',type:'药品注册证',no:'国药准字H20033363',expiry:'2027-09-10',status:'approved'},
                     {id:'CT07',type:'GMP证书',no:'GMP-SH-2024-1108',expiry:'2026-11-08',status:'approved'} ] },
    { id:'P04', code:'SP-1004', name:'奥美拉唑肠溶胶囊', spec:'20mg×14粒', dosageForm:'肠溶胶囊', approvalNo:'国药准字H19990114',
      manufacturer:'常州第四制药有限公司', origin:'江苏常州', barcode:'6945832100157', categoryId:'G1-3', unit:'盒',
      status:'active', stock:{ total:3600, locked:0, transit:1000 },
      batches:[ {batchNo:'D20260301', expiry:'2028-03-01', qty:3600} ],
      prices:{A:15.8,B:16.9,C:17.5}, priceHistory:[],
      certificates:[ {id:'CT08',type:'药品注册证',no:'国药准字H19990114',expiry:'2029-01-15',status:'approved'} ] },
    { id:'P05', code:'SP-1005', name:'氯雷他定片', spec:'10mg×6片', dosageForm:'片剂', approvalNo:'国药准字H10970364',
      manufacturer:'上海先灵药业', origin:'上海', barcode:'6945832100164', categoryId:'G1-4', unit:'盒',
      status:'active', stock:{ total:900, locked:60, transit:0 },
      batches:[ {batchNo:'E20260510', expiry:'2027-05-10', qty:960} ],
      prices:{A:16.0,B:17.2,C:18.0}, priceHistory:[],
      certificates:[ {id:'CT09',type:'药品注册证',no:'国药准字H10970364',expiry:'2028-03-30',status:'approved'} ] },
    { id:'P06', code:'SP-1006', name:'甘精胰岛素注射液', spec:'3ml:300单位', dosageForm:'注射剂', approvalNo:'国药准字S20050051',
      manufacturer:'赛诺菲(北京)制药', origin:'北京', barcode:'6945832100171', categoryId:'G2-1', unit:'支',
      status:'active', stock:{ total:56, locked:10, transit:100 },
      batches:[ {batchNo:'F20260601', expiry:'2027-06-01', qty:66} ],
      prices:{A:158.0,B:165.0,C:172.0}, priceHistory:[],
      certificates:[ {id:'CT10',type:'药品注册证',no:'国药准字S20050051',expiry:'2027-10-25',status:'approved'},
                     {id:'CT11',type:'检验报告',no:'BG-2025-1015',expiry:'2026-11-05',status:'pending'} ] },
    { id:'P07', code:'SP-1007', name:'苯磺酸氨氯地平片', spec:'5mg×7片', dosageForm:'片剂', approvalNo:'国药准字H10950224',
      manufacturer:'辉瑞制药有限公司', origin:'辽宁大连', barcode:'6945832100188', categoryId:'G1-4', unit:'盒',
      status:'active', stock:{ total:5200, locked:200, transit:0 },
      batches:[ {batchNo:'G20260418', expiry:'2027-10-18', qty:5400} ],
      prices:{A:23.5,B:25.0,C:26.5}, priceHistory:[],
      certificates:[ {id:'CT12',type:'药品注册证',no:'国药准字H10950224',expiry:'2028-08-12',status:'approved'},
                     {id:'CT13',type:'GMP证书',no:'GMP-LN-2025-0522',expiry:'2027-05-22',status:'approved'} ] },
    { id:'P08', code:'SP-1008', name:'阿托伐他汀钙片', spec:'20mg×7片', dosageForm:'片剂', approvalNo:'国药准字H19990258',
      manufacturer:'北京嘉林药业', origin:'北京', barcode:'6945832100195', categoryId:'G1-4', unit:'盒',
      status:'active', stock:{ total:2100, locked:0, transit:300 },
      batches:[ {batchNo:'H20260228', expiry:'2028-02-28', qty:2400} ],
      prices:{A:31.2,B:33.0,C:35.0}, priceHistory:[],
      certificates:[ {id:'CT14',type:'药品注册证',no:'国药准字H19990258',expiry:'2027-07-20',status:'approved'} ] },
    { id:'P09', code:'SP-1009', name:'蒙脱石散', spec:'3g×10袋', dosageForm:'散剂', approvalNo:'国药准字H19980007',
      manufacturer:'博福-益普生(天津)', origin:'天津', barcode:'6945832100201', categoryId:'G1-3', unit:'盒',
      status:'active', stock:{ total:0, locked:0, transit:800 },
      batches:[ {batchNo:'J20260701', expiry:'2028-07-01', qty:0} ],
      prices:{A:22.0,B:23.6,C:24.8}, priceHistory:[],
      certificates:[ {id:'CT15',type:'药品注册证',no:'国药准字H19980007',expiry:'2028-11-02',status:'approved'} ] },
    { id:'P10', code:'SP-1010', name:'注射用头孢哌酮钠舒巴坦钠', spec:'1.5g×10支', dosageForm:'注射剂', approvalNo:'国药准字H19990552',
      manufacturer:'辉阳制药有限公司', origin:'浙江杭州', barcode:'6945832100218', categoryId:'G1-1-2', unit:'盒',
      status:'active', stock:{ total:150, locked:0, transit:0 },
      batches:[ {batchNo:'K20260320', expiry:'2027-09-20', qty:150} ],
      prices:{A:52.0,B:55.5,C:58.0}, priceHistory:[],
      certificates:[ {id:'CT16',type:'GMP证书',no:'GMP-ZJ-2023-0905',expiry:'2026-09-30',status:'approved'},
                     {id:'CT17',type:'药品注册证',no:'国药准字H19990552',expiry:'2027-11-15',status:'approved'} ] },
    { id:'P11', code:'SP-1011', name:'复方甘草片', spec:'100片/瓶', dosageForm:'片剂', approvalNo:'国药准字H62020068',
      manufacturer:'陇原药业有限公司', origin:'甘肃兰州', barcode:'6945832100225', categoryId:'G3', unit:'瓶',
      status:'disabled', stock:{ total:600, locked:0, transit:0 },
      batches:[ {batchNo:'L20260110', expiry:'2027-01-10', qty:600} ],
      prices:{A:6.5,B:7.0,C:7.5}, priceHistory:[],
      certificates:[ {id:'CT18',type:'药品注册证',no:'国药准字H62020068',expiry:'2026-12-20',status:'approved'} ] },
    { id:'P12', code:'SP-1012', name:'盐酸二甲双胍缓释片', spec:'0.5g×30片', dosageForm:'缓释片', approvalNo:'国药准字H20023370',
      manufacturer:'中美华东制药', origin:'浙江杭州', barcode:'6945832100232', categoryId:'G1-4', unit:'盒',
      status:'active', stock:{ total:3000, locked:120, transit:0 },
      batches:[ {batchNo:'M20260615', expiry:'2027-12-15', qty:3120} ],
      prices:{A:9.8,B:10.5,C:11.2}, priceHistory:[],
      certificates:[ {id:'CT19',type:'药品注册证',no:'国药准字H20023370',expiry:'2028-04-08',status:'approved'},
                     {id:'CT20',type:'检验报告',no:'BG-2026-0730',expiry:'2027-07-30',status:'approved'} ] }
  ],
  orders:[
    { id:'SO20261011001', customerId:'C01', items:[
        {productId:'P01', name:'阿莫西林胶囊', spec:'0.25g×24粒', unit:'盒', qty:200, price:8.5, batchNo:''},
        {productId:'P12', name:'盐酸二甲双胍缓释片', spec:'0.5g×30片', unit:'盒', qty:120, price:9.8, batchNo:''} ],
      status:'pending', createdAt:'2026-10-11T09:12:00+08:00', remark:'连锁门店月度补货',
      timeline:[ {status:'pending', time:'2026-10-11T09:12:00+08:00', operator:'李商务', note:'订单创建'} ] },
    { id:'SO20261011002', customerId:'C02', items:[
        {productId:'P04', name:'奥美拉唑肠溶胶囊', spec:'20mg×14粒', unit:'盒', qty:300, price:16.9, batchNo:''} ],
      status:'pending', createdAt:'2026-10-11T10:05:00+08:00', remark:'',
      timeline:[ {status:'pending', time:'2026-10-11T10:05:00+08:00', operator:'王运营', note:'订单创建'} ] },
    { id:'SO20261010003', customerId:'C03', items:[
        {productId:'P03', name:'注射用头孢曲松钠', spec:'1.0g×10支', unit:'盒', qty:80, price:45.0, batchNo:''},
        {productId:'P10', name:'注射用头孢哌酮钠舒巴坦钠', spec:'1.5g×10支', unit:'盒', qty:20, price:58.0, batchNo:''} ],
      status:'toship', createdAt:'2026-10-10T14:30:00+08:00', remark:'医院药剂科采购',
      timeline:[ {status:'pending', time:'2026-10-10T14:30:00+08:00', operator:'赵主任', note:'订单创建'},
                 {status:'toship', time:'2026-10-10T16:20:00+08:00', operator:'王运营', note:'审核通过，库存已锁定'} ] },
    { id:'SO20261009004', customerId:'C05', items:[
        {productId:'P02', name:'布洛芬缓释胶囊', spec:'0.3g×20粒', unit:'盒', qty:150, price:13.5, batchNo:''} ],
      status:'toship', createdAt:'2026-10-09T11:00:00+08:00', remark:'',
      timeline:[ {status:'pending', time:'2026-10-09T11:00:00+08:00', operator:'周医生', note:'订单创建'},
                 {status:'toship', time:'2026-10-09T15:40:00+08:00', operator:'王运营', note:'审核通过，库存已锁定'} ] },
    { id:'SO20261008005', customerId:'C01', items:[
        {productId:'P07', name:'苯磺酸氨氯地平片', spec:'5mg×7片', unit:'盒', qty:400, price:23.5, batchNo:'G20260418'},
        {productId:'P05', name:'氯雷他定片', spec:'10mg×6片', unit:'盒', qty:100, price:16.0, batchNo:'E20260510'} ],
      status:'shipped', createdAt:'2026-10-08T09:20:00+08:00', remark:'',
      timeline:[ {status:'pending', time:'2026-10-08T09:20:00+08:00', operator:'李商务', note:'订单创建'},
                 {status:'toship', time:'2026-10-08T10:15:00+08:00', operator:'王运营', note:'审核通过，库存已锁定'},
                 {status:'shipped', time:'2026-10-09T09:05:00+08:00', operator:'王运营', note:'按FIFO推荐批号出库'} ] },
    { id:'SO20261006006', customerId:'C01', items:[
        {productId:'P01', name:'阿莫西林胶囊', spec:'0.25g×24粒', unit:'盒', qty:150, price:8.5, batchNo:'A20260412'},
        {productId:'P08', name:'阿托伐他汀钙片', spec:'20mg×7片', unit:'盒', qty:80, price:31.2, batchNo:'H20260228'} ],
      status:'received', createdAt:'2026-10-04T10:40:00+08:00', remark:'',
      timeline:[ {status:'pending', time:'2026-10-04T10:40:00+08:00', operator:'李商务', note:'订单创建'},
                 {status:'toship', time:'2026-10-04T14:10:00+08:00', operator:'王运营', note:'审核通过，库存已锁定'},
                 {status:'shipped', time:'2026-10-05T09:30:00+08:00', operator:'王运营', note:'出库发货'},
                 {status:'received', time:'2026-10-06T15:20:00+08:00', operator:'王经理', note:'客户确认签收'} ] },
    { id:'SO20260928007', customerId:'C06', items:[
        {productId:'P01', name:'阿莫西林胶囊', spec:'0.25g×24粒', unit:'盒', qty:100, price:9.8, batchNo:'A20260412'} ],
      status:'received', createdAt:'2026-09-26T09:00:00+08:00', remark:'',
      timeline:[ {status:'pending', time:'2026-09-26T09:00:00+08:00', operator:'吴经理', note:'订单创建'},
                 {status:'toship', time:'2026-09-26T11:30:00+08:00', operator:'王运营', note:'审核通过，库存已锁定'},
                 {status:'shipped', time:'2026-09-27T10:00:00+08:00', operator:'王运营', note:'出库发货'},
                 {status:'received', time:'2026-09-28T14:00:00+08:00', operator:'吴经理', note:'客户确认签收'} ] },
    { id:'SO20261010008', customerId:'C03', items:[
        {productId:'P09', name:'蒙脱石散', spec:'3g×10袋', unit:'盒', qty:200, price:24.8, batchNo:''} ],
      status:'abnormal', abnormalType:'库存不足', createdAt:'2026-10-10T16:45:00+08:00',
      remark:'可用库存 0，WMS 在途 800 盒预计 10-13 到仓',
      timeline:[ {status:'pending', time:'2026-10-10T16:45:00+08:00', operator:'赵主任', note:'订单创建'},
                 {status:'abnormal', time:'2026-10-10T16:46:00+08:00', operator:'系统', note:'库存不足，自动标记异常，通知运营处理'} ] },
    { id:'SO20261009009', customerId:'C02', items:[
        {productId:'P06', name:'甘精胰岛素注射液', spec:'3ml:300单位', unit:'支', qty:30, price:165.0, batchNo:''} ],
      status:'cancel_reviewing', createdAt:'2026-10-09T08:30:00+08:00',
      cancelReason:'客户终端需求变更，申请取消', remark:'',
      timeline:[ {status:'pending', time:'2026-10-09T08:30:00+08:00', operator:'李经理', note:'订单创建'},
                 {status:'toship', time:'2026-10-09T09:50:00+08:00', operator:'王运营', note:'审核通过，库存已锁定'},
                 {status:'cancel_reviewing', time:'2026-10-09T17:00:00+08:00', operator:'王运营', note:'提交取消申请，等待主管审批'} ] },
    { id:'SO20261001010', customerId:'C05', items:[
        {productId:'P11', name:'复方甘草片', spec:'100片/瓶', unit:'瓶', qty:50, price:7.0, batchNo:''} ],
      status:'cancelled', createdAt:'2026-10-01T10:00:00+08:00',
      cancelReason:'商品已停用，无法发货', remark:'',
      timeline:[ {status:'pending', time:'2026-10-01T10:00:00+08:00', operator:'周医生', note:'订单创建'},
                 {status:'cancelled', time:'2026-10-01T10:35:00+08:00', operator:'王运营', note:'订单取消：商品已停用，无法发货'} ] }
  ],
  aftersales:[
    { id:'SH20261009001', orderId:'SO20261010003', customerId:'C03', type:'退货',
      reason:'外包装破损，影响二次销售', hasPhoto:true, items:[ {productId:'P10', name:'注射用头孢哌酮钠舒巴坦钠', spec:'1.5g×10支', unit:'盒', qty:2, price:58.0} ],
      status:'qa_review', createdAt:'2026-10-10T18:20:00+08:00',
      timeline:[ {status:'qa_review', time:'2026-10-10T18:20:00+08:00', operator:'王运营', note:'售后申请提交'} ] },
    { id:'SH20261007002', orderId:'SO20261006006', customerId:'C01', type:'退货',
      reason:'客户采购数量修正，退回多余库存', hasPhoto:false, items:[ {productId:'P08', name:'阿托伐他汀钙片', spec:'20mg×7片', unit:'盒', qty:10, price:31.2} ],
      status:'fin_refund', qaResult:'非质量问题', qaNote:'商品外观完好，符合退货条件',
      createdAt:'2026-10-07T10:10:00+08:00',
      timeline:[ {status:'qa_review', time:'2026-10-07T10:10:00+08:00', operator:'王运营', note:'售后申请提交'},
                 {status:'wh_receive', time:'2026-10-07T14:30:00+08:00', operator:'刘质管', note:'质管审核通过（非质量问题）'},
                 {status:'fin_refund', time:'2026-10-08T09:40:00+08:00', operator:'王运营', note:'仓库收货入库：10盒 / 可二次销售'} ] },
    { id:'SH20260930003', orderId:'SO20260928007', customerId:'C06', type:'换货',
      reason:'客户误订规格，需更换为同厂其他规格', hasPhoto:false, items:[ {productId:'P01', name:'阿莫西林胶囊', spec:'0.25g×24粒', unit:'盒', qty:10, price:9.8} ],
      status:'wh_receive', qaResult:'非质量问题', qaNote:'批号一致、外观完好，同意换货',
      createdAt:'2026-09-30T11:00:00+08:00',
      timeline:[ {status:'qa_review', time:'2026-09-30T11:00:00+08:00', operator:'王运营', note:'售后申请提交'},
                 {status:'wh_receive', time:'2026-09-30T15:20:00+08:00', operator:'刘质管', note:'质管审核通过（非质量问题）'} ] }
  ],
  logs:[
    { id:'L1', time:'2026-10-11T10:05:00+08:00', module:'订单系统', operator:'王运营', role:'ops', action:'创建订单', detail:'新建订单 SO20261011002，客户：河南百姓缘医药' },
    { id:'L2', time:'2026-10-11T09:12:00+08:00', module:'订单系统', operator:'李商务', role:'biz', action:'创建订单', detail:'新建订单 SO20261011001，客户：郑州康民大药房连锁' },
    { id:'L3', time:'2026-10-10T18:20:00+08:00', module:'售后系统', operator:'王运营', role:'ops', action:'提交售后申请', detail:'售后单 SH20261009001，关联订单 SO20261010003' },
    { id:'L4', time:'2026-10-10T16:46:00+08:00', module:'订单系统', operator:'系统', role:'admin', action:'异常标记', detail:'订单 SO20261010008 因库存不足自动标记为异常' },
    { id:'L5', time:'2026-10-09T17:00:00+08:00', module:'订单系统', operator:'王运营', role:'ops', action:'提交取消申请', detail:'订单 SO20261009009 提交取消，等待主管审批' },
    { id:'L6', time:'2026-10-08T09:40:00+08:00', module:'售后系统', operator:'王运营', role:'ops', action:'退货入库', detail:'售后单 SH20261007002 入库 10 盒（可二次销售）' },
    { id:'L7', time:'2026-10-08T01:00:00+08:00', module:'商品中心', operator:'系统', role:'admin', action:'库存同步', detail:'WMS 库存同步完成，同步 12 个商品、19 条批号记录' },
    { id:'L8', time:'2026-10-07T14:30:00+08:00', module:'售后系统', operator:'刘质管', role:'qa', action:'质管审核', detail:'售后单 SH20261007002 判定为非质量问题，审核通过' },
    { id:'L9', time:'2026-10-01T10:35:00+08:00', module:'订单系统', operator:'王运营', role:'ops', action:'取消订单', detail:'订单 SO20261001010 取消：商品已停用' },
    { id:'L10', time:'2026-09-30T15:20:00+08:00', module:'售后系统', operator:'刘质管', role:'qa', action:'质管审核', detail:'售后单 SH20260930003 判定为非质量问题，审核通过（换货）' }
  ]
};
