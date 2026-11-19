/* ============================================================
   医药供应数字化平台 · 视图层（纯函数渲染，返回 HTML 字符串）
   ============================================================ */
'use strict';

/* ---------------- 小工具 ---------------- */
const tag = (txt, color) => `<span class="tag ${color}">${txt}</span>`;
const oTag = s => tag(ORDER_STATUS[s].label, ORDER_STATUS[s].tag);
const aTag = s => tag(AFTER_STATUS[s].label, AFTER_STATUS[s].tag);
const orderAmount = o => o.items.reduce((s,i)=>s+i.qty*i.price,0);
const receivedTime = o => { const t=(o.timeline||[]).find(x=>x.status==='received'); return t?t.time:''; };
const orderCustomer = o => customerById(o.customerId) || {name:'未知客户',level:'-'};
const flatCats = (nodes=DB.data.categories, d=0, out=[]) => {
  nodes.forEach(n=>{ out.push({id:n.id,name:n.name,d}); flatCats(n.children||[], d+1, out); });
  return out;
};
function priceFor(p, level){ return p.prices[level] != null ? p.prices[level] : p.prices.A; }

/* 列表筛选状态 */
const F = {
  products:{q:'',cat:'all',st:'all'},
  orders:{q:'',st:'all'},
  aftersales:{q:'',st:'all'},
  logs:{mod:'all',op:'all'}
};

/* ---------------- 登录页 ---------------- */
function vLogin(){
  const roles = Object.values(ROLES).map(r=>`
    <button class="role-item" data-action="switch-role" data-role="${r.id}">
      <span class="role-ava" style="background:${r.color}">${I(r.icon)}</span>
      <span><b>${r.name}</b><span>${r.desc}</span></span>
      <span class="chev">${I('chev')}</span>
    </button>`).join('');
  return { hideShell:true, html:`
    <div class="login">
      <div class="login-brand">
        <div class="login-logo">${I('cross')}</div>
        <h1>医药供应数字化平台</h1>
        <p>商品中心 · 订单系统 · 售后系统 一体化中台</p>
      </div>
      <div class="login-card">
        <h2>请选择演示角色进入系统</h2>
        <div class="role-list">${roles}</div>
      </div>
      <div class="login-foot">演示环境 · 数据为模拟数据，仅用于产品原型评审<br>紫色 #7C3AED / 蓝色 #2563EB 科技视觉体系</div>
    </div>` };
}

/* ---------------- 工作台 ---------------- */
function vDashboard(){
  const d = DB.data;
  const cnt = {
    pending: d.orders.filter(o=>o.status==='pending').length,
    toship: d.orders.filter(o=>o.status==='toship').length,
    shipped: d.orders.filter(o=>o.status==='shipped').length,
    after: d.aftersales.filter(a=>['qa_review','wh_receive','fin_refund'].includes(a.status)).length,
    nearExp: d.products.filter(p=>p.status==='active' && p.batches.some(b=>b.qty>0 && batchState(b).tag!=='success')).length,
    cert: d.products.flatMap(p=>p.certificates).filter(c=>certState(c).tag!=='success').length
  };
  const kpi = [
    {k:'pending', ic:'clock', c:'var(--warning-bg)', label:'待确认订单', n:cnt.pending, to:'#/orders'},
    {k:'toship', ic:'truck', c:'var(--info-bg)', label:'待出库订单', n:cnt.toship, to:'#/orders'},
    {k:'shipped', ic:'send', c:'var(--blue-light)', label:'已出库待签收', n:cnt.shipped, to:'#/orders'},
    {k:'after', ic:'refresh', c:'var(--primary-light)', label:'处理中售后', n:cnt.after, to:'#/aftersales'},
    {k:'nearExp', ic:'warn', c:'var(--danger-bg)', label:'近效期商品', n:cnt.nearExp, to:'#/products'},
    {k:'cert', ic:'shield', c:'var(--success-bg)', label:'证照临期/过期', n:cnt.cert, to:'#/products'}
  ].map(x=>`
    <div class="kpi" data-action="nav" data-to="${x.to}">
      <div class="ic" style="background:${x.c};color:var(--primary-dark)">${I(x.ic)}</div>
      <b>${x.n}</b><span>${x.label}</span>
    </div>`).join('');

  /* 近 7 日订单柱状图（真实统计当前数据） */
  const days = [];
  for(let i=6;i>=0;i--){
    const dt = new Date(Date.now()-i*86400000);
    const key = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
    days.push({key, label:`${dt.getMonth()+1}/${dt.getDate()}`, n:0, today:i===0});
  }
  d.orders.forEach(o=>{ const k=o.createdAt.slice(0,10); const day=days.find(x=>x.key===k); if(day) day.n++; });
  const maxN = Math.max(1, ...days.map(x=>x.n));
  const bars = days.map(x=>`
    <div class="bar-col ${x.today?'today':''}">
      <span class="v">${x.n||''}</span>
      <div class="bar" style="height:${Math.max(6, x.n/maxN*100)}%"></div>
      <span>${x.label}</span>
    </div>`).join('');

  /* 待办 */
  const todos = [];
  d.orders.filter(o=>o.status==='pending').slice(0,3).forEach(o=>
    todos.push({ic:'file',c:'var(--warning-bg)',t:`订单 ${o.id} 待审核`,s:`${orderCustomer(o).name} · ${fmtMoney(orderAmount(o))}`,to:`#/orders/${o.id}`}));
  d.orders.filter(o=>o.status==='cancel_reviewing').forEach(o=>
    todos.push({ic:'warn',c:'var(--danger-bg)',t:`订单 ${o.id} 取消审批中`,s:`${orderCustomer(o).name} · 需主管审批`,to:`#/orders/${o.id}`}));
  d.aftersales.filter(a=>a.status==='qa_review').slice(0,2).forEach(a=>
    todos.push({ic:'shield',c:'var(--primary-light)',t:`售后 ${a.id} 待质管审核`,s:`${a.type} · ${customerById(a.customerId)?.name||''}`,to:`#/aftersales/${a.id}`}));
  const todoHTML = todos.length ? todos.map(t=>`
    <div class="todo-item" data-action="nav" data-to="${t.to}">
      <span class="ic" style="background:${t.c};color:var(--primary-dark)">${I(t.ic)}</span>
      <span class="t"><b>${t.t}</b><span>${t.s}</span></span><span class="n">›</span>
    </div>`).join('') : `<div class="empty" style="padding:26px">${I('check','lg')}<p>暂无待办事项</p></div>`;

  /* 预警提醒 */
  const alerts = [];
  d.products.forEach(p=>{
    p.certificates.forEach(c=>{ const cs=certState(c);
      if(cs.tag!=='success') alerts.push({color:cs.tag==='danger'?'var(--danger)':'var(--warning)', st:tag(cs.label,cs.tag),
        t:`${p.name} · ${c.type}（${fmtD(c.expiry)}）`, to:`#/products/${p.id}`}); });
    p.batches.forEach(b=>{ const bs=batchState(b); if(b.qty>0 && bs.tag!=='success')
      alerts.push({color:'var(--warning)', st:tag(bs.label,bs.tag), t:`${p.name} · 批号 ${b.batchNo}（效期 ${fmtD(b.expiry)}）`, to:`#/products/${p.id}`}); });
  });
  const alertHTML = alerts.length ? alerts.slice(0,6).map(a=>`
    <div class="alert-item" data-action="nav" data-to="${a.to}">
      <span class="dot2" style="background:${a.color}"></span>
      <span class="t">${a.t}</span>${a.st}
    </div>`).join('') + (alerts.length>6?`<div class="small" style="padding:8px 4px">还有 ${alerts.length-6} 条预警，前往商品中心查看</div>`:'')
    : `<div class="empty" style="padding:26px">${I('check','lg')}<p>暂无库存与证照预警</p></div>`;

  const quick = [];
  if(can('order.create')) quick.push({ic:'cart',t:'创建订单',to:'#/orders/new'});
  if(can('after.create')) quick.push({ic:'refresh',t:'售后申请',to:'#/aftersales/new'});
  if(can('product.edit')) quick.push({ic:'plus',t:'新建商品',to:'#/products/new'});
  if(can('cert.review')) quick.push({ic:'shield',t:'证照审核',to:'#/products'});
  if(can('after.qa')) quick.push({ic:'shield',t:'质量判定',to:'#/aftersales'});
  if(can('after.refund')) quick.push({ic:'card',t:'退款办理',to:'#/aftersales'});
  if(can('*')) quick.push({ic:'file',t:'操作日志',to:'#/logs'});
  if(can('*')) quick.push({ic:'users',t:'权限管理',to:'#/permissions'});
  const quickHTML = `<div class="quick-grid">${quick.slice(0,4).map(q=>`
    <button data-action="nav" data-to="${q.to}">${I(q.ic,'lg')}${q.t}</button>`).join('')}</div>`;

  return { title:'工作台', menu:'dashboard', html:`
    <div class="page-card">
      <div class="kpi-grid">${kpi}</div>
      <div class="dash-grid">
        <div class="card"><div class="card-h"><b>待办事项</b><span class="more" data-action="nav" data-to="#/orders">全部订单 ${I('chev','sm')}</span></div>${todoHTML}</div>
        <div class="card"><div class="card-h"><b>近 7 日订单量</b></div><div class="bars">${bars}</div></div>
        <div class="card"><div class="card-h"><b>库存 / 证照预警</b><span class="more" data-action="nav" data-to="#/products">商品中心 ${I('chev','sm')}</span></div>${alertHTML}</div>
        <div class="card"><div class="card-h"><b>快捷入口</b></div>${quickHTML}</div>
      </div>
      <div class="small" style="margin-top:6px">数据规模：商品 ${d.products.length} · 客户 ${d.customers.length} · 订单 ${d.orders.length} · 售后单 ${d.aftersales.length} · 操作日志 ${d.logs.length} 条</div>
    </div>` };
}

/* ---------------- 商品中心 ---------------- */
/* 证照展示状态（pending = 待质管审核） */
function certDisplay(c){
  if(c.status==='pending') return { label:'待质管审核', tag:'info', cls:'' };
  return certState(c);
}
function productTags(p){
  const tags = [];
  if(p.status==='disabled') tags.push(tag('已停用','gray'));
  if(avail(p)<=0 && p.status==='active') tags.push(tag('无货','danger'));
  p.batches.forEach(b=>{ if(b.qty>0){ const bs=batchState(b); if(bs.tag!=='success') tags.push(tag(`批号${bs.label}`,'warning')); }});
  p.certificates.forEach(c=>{ const cs=certDisplay(c); if(cs.tag==='warning') tags.push(tag('证照临期','warning'));
    if(cs.tag==='danger') tags.push(tag('证照过期','danger'));
    if(cs.tag==='info') tags.push(tag('证照待审核','info')); });
  return tags.join('');
}
function productListHTML(){
  const list = filteredProducts();
  App.lastCount = list.length;
  if(!list.length) return `<div class="empty">${I('box','lg')}<p>没有符合条件的商品</p></div>`;
  return list.map(p=>{
    return `
    <div class="list-item" data-action="nav" data-to="#/products/${p.id}">
      <div class="li-top"><span class="t">${esc(p.name)}<small>${esc(p.spec)} · ${esc(p.manufacturer)}</small></span>
        ${p.status==='active'?tag('在售','success'):tag('已停用','gray')}</div>
      <div class="li-tags">${productTags(p)||''}</div>
      <div class="meta-grid">
        <div class="meta-item">商品编码<b>${p.code}</b></div>
        <div class="meta-item">批准文号<b>${esc(p.approvalNo)}</b></div>
        <div class="meta-item">分类<b>${esc(catPath(p.categoryId))}</b></div>
        <div class="meta-item">可用库存<b class="${avail(p)<=0?'':'hl'}">${avail(p)} ${p.unit}</b></div>
        <div class="meta-item">A级协议价<b class="money">${fmtMoney(p.prices.A)}</b></div>
        <div class="meta-item">证照<b>${p.certificates.length} 项</b></div>
      </div>
      <div class="li-foot">
        ${can('product.edit')?`<button class="btn btn-ghost btn-sm" data-action="product-edit" data-id="${p.id}">${I('edit','sm')}编辑</button>`:''}
        ${can('product.toggle')?`<button class="btn btn-ghost btn-sm" data-action="product-toggle" data-id="${p.id}">${p.status==='active'?'停用':'启用'}</button>`:''}
        <button class="btn btn-pri btn-sm" data-action="nav" data-to="#/products/${p.id}">详情</button>
      </div>
    </div>`;}).join('');
}
function filteredProducts(){
  const f = F.products;
  return DB.data.products.filter(p=>{
    if(f.q && !(p.name+p.code+p.approvalNo+p.manufacturer).toLowerCase().includes(f.q.toLowerCase())) return false;
    if(f.cat!=='all' && p.categoryId!==f.cat) return false;
    if(f.st==='active' && p.status!=='active') return false;
    if(f.st==='disabled' && p.status!=='disabled') return false;
    if(f.st==='stock' && !(avail(p)<=0 || p.batches.some(b=>b.qty>0 && batchState(b).tag!=='success'))) return false;
    if(f.st==='cert' && !p.certificates.some(c=>certState(c).tag!=='success')) return false;
    return true;
  });
}
function vProducts(){
  const catOpts = ['<option value="all">全部分类</option>'].concat(
    flatCats().map(c=>`<option value="${c.id}" ${F.products.cat===c.id?'selected':''}>${'　'.repeat(c.d)}${c.name}</option>`)).join('');
  const chips = [['all','全部'],['active','在售'],['disabled','已停用'],['stock','库存预警'],['cert','证照预警']].map(([v,l])=>
    `<button class="chip ${F.products.st===v?'active':''}" data-action="chip" data-page="products" data-val="${v}">${l}</button>`).join('');
  App.listFn = productListHTML;
  return { title:'商品中心', menu:'products', html:`
    <div class="page-card">
      <div class="filter-bar">
        <div class="search-box">${I('search')}<input data-fp="products" data-fk="q" value="${esc(F.products.q)}" placeholder="搜索商品名称 / 编码 / 批准文号 / 厂商"></div>
        <div class="filter-row2"><select data-fp="products" data-fk="cat">${catOpts}</select></div>
        <div class="chips">${chips}</div>
      </div>
      <div class="count-bar">共 <b id="cnt"></b> 个商品</div>
      ${can('product.edit')?`<div class="btn-row" style="margin-bottom:12px"><button class="btn btn-pri" data-action="nav" data-to="#/products/new">${I('plus','sm')}新建商品</button></div>`:''}
      <div id="list-region">${productListHTML()}</div>
    </div>` };
}

/* ---------------- 商品详情 ---------------- */
function vProductDetail(id){
  const p = productById(id);
  if(!p) return { title:'商品详情', html:`<div class="empty">${I('warn','lg')}<p>商品不存在</p></div>` };
  const priceRows = Object.keys(CUSTOMER_LEVELS).map(lv=>`
    <tr><td>${CUSTOMER_LEVELS[lv]}（${lv} 级）</td><td class="num money"><b>${fmtMoney(p.prices[lv])}</b>/ ${p.unit}</td></tr>`).join('');
  const priceHistory = p.priceHistory.length ? p.priceHistory.map(h=>`
    <div class="alert-item" style="cursor:default"><span class="dot2" style="background:var(--primary)"></span>
      <span class="t">${h.date} · ${fmtMoney(h.from)} → ${fmtMoney(h.to)}（${esc(h.operator)}）</span>${tag('留痕','gray')}</div>`).join('')
    : `<div class="small" style="padding:6px 0">暂无价格变更记录</div>`;
  const batchRows = p.batches.map(b=>{ const bs=batchState(b); return `
    <tr><td><b>${b.batchNo}</b></td><td>${fmtD(b.expiry)}</td><td class="num">${b.qty} ${p.unit}</td><td>${tag(bs.label,bs.tag)}</td></tr>`; }).join('');
  const certs = p.certificates.map(c=>{ const cs=certDisplay(c); return `
    <div class="cert-item ${cs.cls}">
      <span class="ic" style="background:var(--primary-soft);color:var(--primary)">${I('shield')}</span>
      <span class="t"><b>${esc(c.type)}</b><span>证号：${esc(c.no)} · 有效期至 ${fmtD(c.expiry)}</span></span>
      ${tag(cs.label,cs.tag)}
      ${can('cert.review')?`<button class="btn btn-ghost btn-sm" data-action="cert-review" data-pid="${p.id}" data-cid="${c.id}">审核</button>`:''}
    </div>`; }).join('');
  const stockCls = avail(p)<=0?'danger':(avail(p)<100?'warning':'hl');
  return { title:'商品详情', menu:'products', back:true, html:`
    <div class="page-card">
      <div class="card">
        <div class="detail-head">
          <div class="t"><h2>${esc(p.name)}</h2><div class="sub">${esc(p.spec)} · ${esc(p.dosageForm)} · ${esc(p.approvalNo)}</div></div>
          ${p.status==='active'?tag('在售','success'):tag('已停用','gray')}
        </div>
        <div class="kv c4">
          <div><div class="k">商品编码</div><div class="v">${p.code}</div></div>
          <div><div class="k">条形码</div><div class="v">${p.barcode}</div></div>
          <div><div class="k">分类</div><div class="v">${esc(catPath(p.categoryId))}</div></div>
          <div><div class="k">基本单位</div><div class="v">${p.unit}</div></div>
          <div><div class="k">生产厂商</div><div class="v">${esc(p.manufacturer)}</div></div>
          <div><div class="k">产地</div><div class="v">${esc(p.origin)}</div></div>
          <div><div class="k">可用库存</div><div class="v" style="color:var(--${stockCls==='hl'?'text':stockCls})">${avail(p)} ${p.unit}</div></div>
          <div><div class="k">在途库存</div><div class="v">${p.stock.transit} ${p.unit}</div></div>
        </div>
        <div class="divider"></div>
        <div class="btn-row">
          ${can('product.edit')?`<button class="btn btn-pri" data-action="product-edit" data-id="${p.id}">${I('edit','sm')}编辑商品</button>`:''}
          ${can('product.toggle')?`<button class="btn btn-ghost" data-action="product-toggle" data-id="${p.id}">${p.status==='active'?'停用商品':'启用商品'}</button>`:''}
          ${p.status==='disabled'?`<div class="flex" style="color:var(--text-3);font-size:12.5px">${I('warn','sm')} 停用后不可被新订单选用，历史订单可查</div>`:''}
        </div>
      </div>
      <div class="card"><div class="card-h"><b>资质证照</b><span class="more">${p.certificates.length} 项</span></div>
        <div class="banner info" style="margin-bottom:12px">${I('clock','sm')}<span>证照到期前 30 天自动预警；质管人员负责审核证照有效性（GSP 要求）</span></div>
        ${certs}</div>
      <div class="card"><div class="card-h"><b>价格体系</b></div>
        <div class="table-wrap"><table class="tb"><thead><tr><th>客户等级</th><th class="num">协议单价</th></tr></thead><tbody>${priceRows}</tbody></table></div>
        <div class="section-title">价格变更记录</div>${priceHistory}</div>
      <div class="card"><div class="card-h"><b>库存与批号（WMS 同步）</b></div>
        <div class="kv c4" style="margin-top:0">
          <div><div class="k">可用库存</div><div class="v">${avail(p)} ${p.unit}</div></div>
          <div><div class="k">锁定库存</div><div class="v">${p.stock.locked} ${p.unit}</div></div>
          <div><div class="k">在途库存</div><div class="v">${p.stock.transit} ${p.unit}</div></div>
          <div><div class="k">批号数</div><div class="v">${p.batches.length} 个</div></div>
        </div>
        <div class="table-wrap mt14"><table class="tb"><thead><tr><th>批号</th><th>有效期至</th><th class="num">库存</th><th>效期状态</th></tr></thead><tbody>${batchRows}</tbody></table></div>
        <div class="small mt8">${I('warn','sm')} 出库时按 FIFO（近效期先出）自动推荐批号；近效期（180 天内）醒目提醒</div></div>
    </div>` };
}

/* ---------------- 商品新建 / 编辑 ---------------- */
function vProductForm(id){
  const p = id ? productById(id) : null;
  const catOpts = flatCats().map(c=>`<option value="${c.id}" ${p&&p.categoryId===c.id?'selected':''}>${'　'.repeat(c.d)}${c.name}</option>`).join('');
  const v = k => p ? esc(p[k]) : '';
  return { title: p?'编辑商品':'新建商品', menu:'products', back:true, html:`
    <div class="page-card" style="max-width:720px">
      <form data-form="product_save" data-id="${id||''}">
      <div class="card"><div class="card-h"><b>基础信息</b><span class="more">* 为必填</span></div>
        <div class="form-grid">
          <div class="form-item"><label>通用名（药品名称）<span class="req">*</span></label><input name="name" required value="${v('name')}" placeholder="如：阿莫西林胶囊"></div>
          <div class="form-item"><label>规格<span class="req">*</span></label><input name="spec" required value="${v('spec')}" placeholder="如：0.25g×24粒"></div>
          <div class="form-item"><label>剂型<span class="req">*</span></label>
            <select name="dosageForm">${['胶囊剂','片剂','注射剂','颗粒剂','散剂','缓释片','缓释胶囊','肠溶胶囊','口服液'].map(x=>`<option ${p&&p.dosageForm===x?'selected':''}>${x}</option>`).join('')}</select></div>
          <div class="form-item"><label>基本单位<span class="req">*</span></label><input name="unit" required value="${v('unit')}" placeholder="如：盒"></div>
          <div class="form-item"><label>批准文号<span class="req">*</span></label><input name="approvalNo" required value="${v('approvalNo')}" placeholder="国药准字H12345678">
            <div class="tip">格式：国药准字 + H/Z/S + 8 位数字，保存时自动校验</div></div>
          <div class="form-item"><label>条形码</label><input name="barcode" value="${v('barcode')}"></div>
          <div class="form-item"><label>生产厂商<span class="req">*</span></label><input name="manufacturer" required value="${v('manufacturer')}"></div>
          <div class="form-item"><label>产地</label><input name="origin" value="${v('origin')}"></div>
          <div class="form-item"><label>商品分类<span class="req">*</span></label><select name="categoryId" required>${catOpts}</select></div>
          <div class="form-item"><label>商品编码</label><input name="code" value="${v('code')||('SP-'+(1000+DB.data.products.length+1))}"></div>
        </div></div>
      <div class="card"><div class="card-h"><b>价格与库存</b></div>
        <div class="form-grid">
          <div class="form-item"><label>A 级客户价（¥）<span class="req">*</span></label><input name="pa" type="number" step="0.01" min="0" required value="${p?p.prices.A:''}"></div>
          <div class="form-item"><label>B 级客户价（¥）<span class="req">*</span></label><input name="pb" type="number" step="0.01" min="0" required value="${p?p.prices.B:''}"></div>
          <div class="form-item"><label>C 级客户价（¥）<span class="req">*</span></label><input name="pc" type="number" step="0.01" min="0" required value="${p?p.prices.C:''}"></div>
          ${p?'':`<div class="form-item"><label>期初库存</label><input name="stock" type="number" min="0" value="0"></div>`}
        </div>
        <div class="tip">${p?`价格修改将留痕并记入变更历史（正式环境需双人确认）`:`库存数据正式环境由 WMS 接口同步（延迟 ≤ 5 分钟），此处为期初演示值`}</div></div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" data-action="back">取消</button>
        <button type="submit" class="btn btn-pri">${I('check','sm')}保存${p?'修改':'商品'}</button>
      </div>
      </form>
    </div>` };
}

/* ---------------- 分类管理 ---------------- */
function catCount(id){ return DB.data.products.filter(p=>p.categoryId===id).length; }
function catTreeHTML(nodes){
  return nodes.map(n=>`
    <div class="cat-node">
      <span class="nm">${I('layers','sm')} ${esc(n.name)}</span>
      <span class="cnt">${catCount(n.id)} 个商品 · ${(n.children||[]).length} 个子分类</span>
      ${can('product.edit')?`
        <button class="btn btn-ghost btn-sm" data-action="cat-add" data-pid="${n.id}">${I('plus','sm')}子分类</button>
        <button class="btn btn-ghost btn-sm" data-action="cat-del" data-id="${n.id}">${I('x','sm')}删除</button>`:''}
    </div>
    ${(n.children&&n.children.length)?`<div class="cat-children">${catTreeHTML(n.children)}</div>`:''}
  `).join('');
}
function vCategories(){
  return { title:'分类管理', menu:'categories', back:true, html:`
    <div class="page-card">
      <div class="banner info">${I('layers','sm')}<span>支持最多 3 级树形分类；删除分类时若有关联商品，系统将阻止删除</span></div>
      ${can('product.edit')?`<div class="btn-row" style="margin-bottom:14px"><button class="btn btn-pri" data-action="cat-add">${I('plus','sm')}新建一级分类</button></div>`:''}
      <div class="card">${catTreeHTML(DB.data.categories)}</div>
    </div>` };
}

/* ---------------- 订单列表 ---------------- */
function orderCardHTML(o){
  const c = orderCustomer(o);
  const quick = [];
  if(o.status==='pending' && can('order.review')) quick.push(`<button class="btn btn-pri btn-sm" data-action="order-review" data-id="${o.id}">审核</button>`);
  if(o.status==='toship' && can('order.ship')) quick.push(`<button class="btn btn-blue btn-sm" data-action="nav" data-to="#/orders/${o.id}">出库</button>`);
  return `
    <div class="list-item" data-action="nav" data-to="#/orders/${o.id}">
      <div class="li-top"><span class="t">${o.id}<small>${esc(c.name)} · ${c.level} 级</small></span>${oTag(o.status)}</div>
      ${(o.abnormalType||o.status==='cancel_reviewing')?`<div class="li-tags">${o.abnormalType?tag('异常：'+esc(o.abnormalType),'danger'):''}${o.status==='cancel_reviewing'?tag('取消申请：'+esc(o.cancelReason||''),'warning'):''}</div>`:''}
      <div class="meta-grid">
        <div class="meta-item">商品<b>${o.items.length} 种</b></div>
        <div class="meta-item">订单金额<b class="money">${fmtMoney(orderAmount(o))}</b></div>
        <div class="meta-item">创建时间<b>${fmtDT(o.createdAt)}</b></div>
        <div class="meta-item">操作人<b>${esc((o.timeline[0]||{}).operator||'—')}</b></div>
      </div>
      <div class="li-foot">
        ${(o.status==='shipped'||o.status==='received')&&can('order.receive')?`<button class="btn btn-ghost btn-sm" data-action="order-print" data-id="${o.id}">${I('print','sm')}随货同行单</button>`:''}
        ${quick.join('')}
        <button class="btn btn-ghost btn-sm" data-action="nav" data-to="#/orders/${o.id}">详情</button>
      </div>
    </div>`;
}
function orderListHTML(){
  const f = F.orders;
  const list = DB.data.orders.filter(o=>{
    const c = orderCustomer(o);
    if(f.q && !(o.id+' '+c.name).toLowerCase().includes(f.q.toLowerCase())) return false;
    if(f.st!=='all' && o.status!==f.st) return false;
    return true;
  });
  if(!list.length) return `<div class="empty">${I('cart','lg')}<p>没有符合条件的订单</p></div>`;
  App.lastCount = list.length;
  return list.map(orderCardHTML).join('');
}
function vOrders(){
  const chips = [['all','全部'],['pending','待确认'],['toship','待出库'],['shipped','已出库'],['received','已签收'],['cancel_reviewing','取消审批'],['cancelled','已取消'],['abnormal','异常']]
    .map(([v,l])=>`<button class="chip ${F.orders.st===v?'active':''}" data-action="chip" data-page="orders" data-val="${v}">${l}</button>`).join('');
  App.listFn = orderListHTML;
  return { title:'订单管理', menu:'orders', html:`
    <div class="page-card">
      <div class="filter-bar">
        <div class="search-box">${I('search')}<input data-fp="orders" data-fk="q" value="${esc(F.orders.q)}" placeholder="搜索订单号 / 客户名称"></div>
        <div class="chips">${chips}</div>
      </div>
      ${can('order.create')?`<div class="btn-row" style="margin-bottom:12px"><button class="btn btn-pri" data-action="nav" data-to="#/orders/new">${I('plus','sm')}创建订单</button></div>`:''}
      <div class="count-bar">共 <b></b> 个订单</div>
      <div id="list-region">${orderListHTML()}</div>
    </div>` };
}

/* ---------------- 订单详情 ---------------- */
function vOrderDetail(id){
  const o = orderById(id);
  if(!o) return { title:'订单详情', html:`<div class="empty">${I('warn','lg')}<p>订单不存在</p></div>` };
  const c = orderCustomer(o);
  const items = o.items.map(i=>{
    const p = productById(i.productId);
    return `<tr>
      <td><b>${esc(i.name)}</b><div class="sub">${esc(i.spec)}</div></td>
      <td>${i.unit}</td><td class="num">${i.qty}</td><td class="num money">${fmtMoney(i.price)}</td>
      <td class="num money">${fmtMoney(i.qty*i.price)}</td>
      <td>${i.batchNo?`<span class="batch-tag" style="background:var(--primary-light);color:var(--primary-dark)">${i.batchNo}</span>`:'<span class="sub">出库后分配</span>'}</td>
    </tr>`; }).join('');
  const curIdx = ['pending','toship','shipped','received'].indexOf(o.status);
  const flow = curIdx>=0 ? ['pending','toship','shipped','received'].map((s,i)=>{
    const t = (o.timeline||[]).find(x=>x.status===s);
    const cls = i<curIdx?'done':(i===curIdx?(o.status==='received'?'done':'current'):'');
    return `<div class="tl-item ${cls}"><span class="dot"></span>
      <div class="tt">${ORDER_STATUS[s].label}</div>
      <div class="td">${t?fmtDT(t.time)+' · '+esc(t.operator||''):''}</div>
      ${t&&t.note?`<div class="note">${esc(t.note)}</div>`:''}</div>`; }).join('')
    : `<div class="tl-item done"><span class="dot"></span><div class="tt">正常流程已终止</div><div class="td">当前状态：${ORDER_STATUS[o.status].label}</div></div>`;
  /* 附加时间线：取消 / 异常等事件 */
  let extraTL = '';
  (o.timeline||[]).forEach(t=>{
    if(['cancelled','cancel_reviewing','abnormal'].includes(t.status))
      extraTL += `<div class="tl-item ${t.status==='cancelled'?'done':'current'}"><span class="dot"></span>
        <div class="tt">${ORDER_STATUS[t.status]?ORDER_STATUS[t.status].label:t.status}</div>
        <div class="td">${fmtDT(t.time)} · ${esc(t.operator||'')}</div>
        ${t.note?`<div class="note">${esc(t.note)}</div>`:''}</div>`;
  });
  const btns = [];
  if(o.status==='pending'){
    if(can('order.review')){ btns.push(`<button class="btn btn-pri" data-action="order-review-pass" data-id="${o.id}">${I('check','sm')}审核通过</button>`);
      btns.push(`<button class="btn btn-warn" data-action="order-review-reject" data-id="${o.id}">审核驳回</button>`); }
    if(can('order.cancel')) btns.push(`<button class="btn btn-ghost" data-action="order-cancel" data-id="${o.id}">取消订单</button>`);
  }
  if(o.status==='toship'){
    if(can('order.ship')) btns.push(`<button class="btn btn-blue" data-action="order-ship" data-id="${o.id}">${I('truck','sm')}出库发货（FIFO 推荐）</button>`);
    if(can('order.cancel')) btns.push(`<button class="btn btn-ghost" data-action="order-cancel" data-id="${o.id}">申请取消</button>`);
  }
  if(o.status==='shipped' && can('order.receive')) btns.push(`<button class="btn btn-pri" data-action="order-receive" data-id="${o.id}">${I('check','sm')}确认签收</button>`);
  if(o.status==='cancel_reviewing' && can('*')){
    btns.push(`<button class="btn btn-success" data-action="order-cancel-approve" data-id="${o.id}">同意取消</button>`);
    btns.push(`<button class="btn btn-danger-solid" data-action="order-cancel-reject" data-id="${o.id}">驳回申请</button>`);
  }
  if(o.status==='abnormal' && can('order.abnormal')){
    btns.push(`<button class="btn btn-pri" data-action="order-restore" data-id="${o.id}">恢复正常流程</button>`);
    btns.push(`<button class="btn btn-ghost" data-action="order-cancel" data-id="${o.id}">取消订单</button>`);
  }
  if(o.status==='received' && can('after.create')){
    const rt = receivedTime(o);
    const overdue = rt && daysUntil(rt) < -30;
    btns.push(overdue
      ? `<button class="btn btn-ghost" disabled>申请售后（已超 30 天时限，需主管审批）</button>`
      : `<button class="btn btn-ghost" data-action="nav" data-to="#/aftersales/new?order=${o.id}">申请售后</button>`);
  }
  if((o.status==='shipped'||o.status==='received')) btns.push(`<button class="btn btn-ghost" data-action="order-print" data-id="${o.id}">${I('print','sm')}打印随货同行单</button>`);

  return { title:'订单详情', menu:'orders', back:true, html:`
    <div class="page-card">
      ${o.status==='abnormal'?`<div class="banner danger">${I('warn','sm')}<span><b>异常订单（${esc(o.abnormalType||'待人工介入')}）</b>：${esc(o.remark||'需人工确认处理方式')}</span></div>`:''}
      ${o.status==='cancel_reviewing'?`<div class="banner warn">${I('clock','sm')}<span><b>取消审批中</b>：${esc(o.cancelReason||'')} —— 等待主管审批，审批通过后锁定库存将自动释放</span></div>`:''}
      <div class="card">
        <div class="detail-head"><div class="t"><h2>${o.id}</h2>
          <div class="sub">${esc(c.name)} · ${c.level} 级客户（${CUSTOMER_LEVELS[c.level]||'-'}）</div></div>${oTag(o.status)}</div>
        <div class="kv c4">
          <div><div class="k">订单金额</div><div class="v money" style="color:var(--primary-dark);font-size:16px">${fmtMoney(orderAmount(o))}</div></div>
          <div><div class="k">创建时间</div><div class="v">${fmtDT(o.createdAt)}</div></div>
          <div><div class="k">创建人</div><div class="v">${esc((o.timeline[0]||{}).operator||'—')}</div></div>
          <div><div class="k">商品种数</div><div class="v">${o.items.length} 种</div></div>
        </div>
        ${o.remark?`<div class="kv full" style="margin-top:10px"><div><div class="k">订单备注</div><div class="v">${esc(o.remark)}</div></div></div>`:''}
        ${o.cancelReason&&o.status!=='cancel_reviewing'?`<div class="kv full" style="margin-top:10px"><div><div class="k">取消原因</div><div class="v">${esc(o.cancelReason)}</div></div></div>`:''}
        <div class="divider"></div>
        <div class="btn-row">${btns.join('')||'<span class="small">当前状态下无可用操作</span>'}</div>
      </div>
      <div class="card"><div class="card-h"><b>商品明细</b><span class="more">${can('order.create')&&o.status==='pending'?'':'价格已按客户协议价自动匹配'}</span></div>
        <div class="table-wrap"><table class="tb">
          <thead><tr><th>商品</th><th>单位</th><th class="num">数量</th><th class="num">单价</th><th class="num">金额</th><th>出库批号</th></tr></thead>
          <tbody>${items}</tbody></table></div>
      </div>
      <div class="card"><div class="card-h"><b>状态时间线</b></div>
        <div class="tl">${flow}${extraTL}</div>
        <div class="small mt8">${I('warn','sm')} 审核通过后锁定库存；取消订单将自动释放锁定库存；操作全程留痕（GSP 记录要求，日志留存 ≥ 5 年）</div></div>
    </div>` };
}

/* ---------------- 创建订单 ---------------- */
function vOrderCreate(){
  const draft = App.draft;
  const custOpts = ['<option value="">请选择客户</option>'].concat(DB.data.customers.map(c=>
    `<option value="${c.id}" ${draft.customerId===c.id?'selected':''} ${c.status==='paused'?'disabled':''}>${esc(c.name)}（${c.level} 级${c.status==='paused'?' · 暂停交易':''}）</option>`)).join('');
  const cust = customerById(draft.customerId);
  const custLevel = cust?cust.level:'A';
  const prodOpts = ['<option value="">请选择商品</option>'].concat(DB.data.products.filter(p=>p.status==='active').map(p=>{
    const a = avail(p);
    const dis = a<=0;
    return `<option value="${p.id}" ${dis?'disabled':''}>${esc(p.name)}（${esc(p.spec)}）· 可用 ${a} ${p.unit}${dis?' · 无货':''}</option>`; })).join('');
  const items = draft.items.map((i,idx)=>{
    const p = productById(i.productId);
    return `<div class="cat-node" style="flex-wrap:wrap">
      <span class="nm">${esc(i.name)}<span class="small" style="display:block">${esc(i.spec)} · 协议价 ${fmtMoney(i.price)}/${i.unit} · 可用库存 ${avail(p)}</span></span>
      <span class="flex"><input type="number" min="1" value="${i.qty}" data-oc-qty="${idx}" style="width:86px;padding:8px 10px;border:1px solid var(--border);border-radius:9px">
      <b class="money" style="min-width:88px;text-align:right">${fmtMoney(i.qty*i.price)}</b>
      <button class="btn btn-danger btn-sm" data-action="oc-remove" data-i="${idx}">移除</button></span>
    </div>`; }).join('');
  const total = draft.items.reduce((s,i)=>s+i.qty*i.price,0);
  return { title:'创建订单', menu:'orders', back:true, html:`
    <div class="page-card" style="max-width:720px">
      <form data-form="order_create">
      <div class="card"><div class="card-h"><b>客户信息</b></div>
        <div class="form-item"><label>客户<span class="req">*</span></label>
          <select name="customerId" data-change="oc-customer" required>${custOpts}</select>
          <div class="tip">客户状态为「暂停交易」时不可下单（PRD-ORDER-001）；下单自动匹配该客户等级协议价</div></div>
      </div>
      <div class="card"><div class="card-h"><b>添加商品</b></div>
        <div class="form-grid">
          <div class="form-item" style="grid-column:1/-1"><label>选择商品</label><select id="oc-product">${prodOpts}</select></div>
          <div class="form-item"><label>数量</label><input id="oc-qty" type="number" min="1" value="10"></div>
          <div class="form-item"><label>&nbsp;</label><button type="button" class="btn btn-blue btn-lg" style="width:100%" data-action="oc-add">${I('plus','sm')}添加商品</button></div>
        </div>
        ${items?`<div class="section-title">已选商品（${draft.items.length}）</div>${items}
          <div class="flex-between mt14" style="padding:12px;background:var(--primary-soft);border-radius:12px">
            <span style="font-size:13.5px;color:var(--text-2)">订单金额合计</span>
            <b class="money" style="font-size:18px;color:var(--primary-dark)">${fmtMoney(total)}</b></div>`
        :`<div class="empty" style="padding:22px">${I('box','lg')}<p>尚未添加商品，无货商品不可选（PRD-PROD-005）</p></div>`}
      </div>
      <div class="card"><div class="form-item"><label>订单备注</label><textarea name="remark" placeholder="选填，如：月度补货 / 客户特殊要求"></textarea></div></div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" data-action="back">取消</button>
        <button type="submit" class="btn btn-pri" ${draft.items.length?'':'disabled'}>${I('send','sm')}提交订单（进入待确认）</button>
      </div>
      </form>
    </div>` };
}

/* ---------------- 售后列表 ---------------- */
function afterCardHTML(a){
  const o = orderById(a.orderId);
  return `
    <div class="list-item" data-action="nav" data-to="#/aftersales/${a.id}">
      <div class="li-top"><span class="t">${a.id}<small>${esc(customerById(a.customerId)?.name||'')}</small></span>${aTag(a.status)}</div>
      <div class="li-tags">${a.type==='退货'?tag('退货','info'):tag('换货','pri')}${a.qaResult?tag('判定：'+a.qaResult, a.qaResult==='质量问题'?'danger':'gray'):''}</div>
      <div class="meta-grid">
        <div class="meta-item">关联订单<b>${a.orderId}</b></div>
        <div class="meta-item">商品<b>${a.items.length} 种</b></div>
        <div class="meta-item">退款/换货金额<b class="money">${fmtMoney(a.items.reduce((s,i)=>s+i.qty*i.price,0))}</b></div>
        <div class="meta-item">申请时间<b>${fmtDT(a.createdAt)}</b></div>
      </div>
      <div class="li-foot">
        ${a.status==='qa_review'&&can('after.qa')?`<button class="btn btn-pri btn-sm" data-action="after-qa" data-id="${a.id}">质管审核</button>`:''}
        ${a.status==='wh_receive'&&can('after.receive')?`<button class="btn btn-blue btn-sm" data-action="after-receive" data-id="${a.id}">入库确认</button>`:''}
        ${a.status==='fin_refund'&&can('after.refund')?`<button class="btn btn-pri btn-sm" data-action="after-refund" data-id="${a.id}">办理退款</button>`:''}
        <button class="btn btn-ghost btn-sm" data-action="nav" data-to="#/aftersales/${a.id}">详情</button>
      </div>
    </div>`;
}
function afterListHTML(){
  const f = F.aftersales;
  const list = DB.data.aftersales.filter(a=>{
    if(f.q && !(a.id+' '+(customerById(a.customerId)?.name||'')+' '+a.orderId).toLowerCase().includes(f.q.toLowerCase())) return false;
    if(f.st==='open' && !['qa_review','wh_receive','fin_refund'].includes(a.status)) return false;
    if(f.st!=='open' && f.st!=='all' && a.status!==f.st) return false;
    return true;
  });
  if(!list.length) return `<div class="empty">${I('refresh','lg')}<p>没有符合条件的售后单</p></div>`;
  App.lastCount = list.length;
  return list.map(afterCardHTML).join('');
}
function vAftersales(){
  const chips = [['all','全部'],['open','处理中'],['qa_review','待质管审核'],['wh_receive','待仓库入库'],['fin_refund','待财务退款'],['done','已完成'],['rejected','已拒绝']]
    .map(([v,l])=>`<button class="chip ${F.aftersales.st===v?'active':''}" data-action="chip" data-page="aftersales" data-val="${v}">${l}</button>`).join('');
  App.listFn = afterListHTML;
  return { title:'售后管理', menu:'aftersales', html:`
    <div class="page-card">
      <div class="filter-bar">
        <div class="search-box">${I('search')}<input data-fp="aftersales" data-fk="q" value="${esc(F.aftersales.q)}" placeholder="搜索单号 / 客户 / 关联订单"></div>
        <div class="chips">${chips}</div>
      </div>
      ${can('after.create')?`<div class="btn-row" style="margin-bottom:12px"><button class="btn btn-pri" data-action="nav" data-to="#/aftersales/new">${I('plus','sm')}发起售后申请</button></div>`:''}
      <div class="count-bar">流程：申请 → 质管审核 → 仓库入库 → 财务退款（换货在入库后自动生成换货出库单）</div>
      <div id="list-region">${afterListHTML()}</div>
    </div>` };
}

/* ---------------- 售后详情 ---------------- */
function vAfterDetail(id){
  const a = afterById(id);
  if(!a) return { title:'售后详情', html:`<div class="empty">${I('warn','lg')}<p>售后单不存在</p></div>` };
  const o = orderById(a.orderId);
  const items = a.items.map(i=>`
    <tr><td><b>${esc(i.name)}</b><div class="sub">${esc(i.spec)}</div></td>
      <td>${i.unit}</td><td class="num">${i.qty}</td><td class="num money">${fmtMoney(i.price)}</td>
      <td class="num money">${fmtMoney(i.qty*i.price)}</td></tr>`).join('');
  const total = a.items.reduce((s,i)=>s+i.qty*i.price,0);
  const flowDefs = a.type==='退货'
    ? [['qa_review','质管审核'],['wh_receive','仓库入库'],['fin_refund','财务退款'],['done','售后完成']]
    : [['qa_review','质管审核'],['wh_receive','仓库入库'],['done','换货出库/完成']];
  const idx = flowDefs.findIndex(([k])=>k===a.status);
  const flow = flowDefs.map(([k,label],i)=>{
    const t = (a.timeline||[]).find(x=>x.status===k);
    let state;
    if(a.status==='done') state = 'done';
    else if(a.status==='rejected') state = i===0 ? 'current' : '';
    else state = i<idx?'done':(i===idx?'current':'');
    return `<div class="tl-item ${state}"><span class="dot"></span>
      <div class="tt">${label}</div>
      <div class="td">${t?fmtDT(t.time)+' · '+esc(t.operator||''):''}</div>
      ${t&&t.note?`<div class="note">${esc(t.note)}</div>`:''}</div>`; }).join('');
  const extra = (a.timeline||[]).filter(t=>['rejected'].includes(t.status)).map(t=>`
    <div class="tl-item"><span class="dot"></span><div class="tt">已拒绝</div>
      <div class="td">${fmtDT(t.time)} · ${esc(t.operator||'')}</div>${t.note?`<div class="note">${esc(t.note)}</div>`:''}</div>`).join('');
  const btns = [];
  if(a.status==='qa_review' && can('after.qa')) btns.push(`<button class="btn btn-pri" data-action="after-qa" data-id="${a.id}">${I('shield','sm')}质管审核（质量判定）</button>`);
  if(a.status==='wh_receive' && can('after.receive')) btns.push(`<button class="btn btn-blue" data-action="after-receive" data-id="${a.id}">${I('truck','sm')}仓库入库确认</button>`);
  if(a.status==='fin_refund' && can('after.refund')) btns.push(`<button class="btn btn-pri" data-action="after-refund" data-id="${a.id}">${I('card','sm')}办理退款</button>`);
  return { title:'售后详情', menu:'aftersales', back:true, html:`
    <div class="page-card">
      <div class="card">
        <div class="detail-head"><div class="t"><h2>${a.id}</h2>
          <div class="sub">${esc(customerById(a.customerId)?.name||'')} · 关联订单
            <a data-action="nav" data-to="#/orders/${a.orderId}" style="color:var(--blue)">${a.orderId} ›</a></div></div>
          <div class="flex">${a.type==='退货'?tag('退货','info'):tag('换货','pri')}${aTag(a.status)}</div></div>
        <div class="kv c4">
          <div><div class="k">申请时间</div><div class="v">${fmtDT(a.createdAt)}</div></div>
          <div><div class="k">申请金额</div><div class="v money" style="color:var(--primary-dark)">${fmtMoney(total)}</div></div>
          <div><div class="k">凭证照片</div><div class="v">${a.hasPhoto?'已上传':'未上传（选填）'}</div></div>
          <div><div class="k">处理结果</div><div class="v">${a.qaResult?esc(a.qaResult):'—'}</div></div>
        </div>
        <div class="kv full" style="margin-top:10px"><div><div class="k">退换原因</div><div class="v">${esc(a.reason)}</div></div></div>
        ${a.qaNote?`<div class="kv full" style="margin-top:10px"><div><div class="k">质管审核意见</div><div class="v">${esc(a.qaNote)}</div></div></div>`:''}
        ${a.receiveResult?`<div class="kv full" style="margin-top:10px"><div><div class="k">入库结果</div><div class="v">实收 ${a.receiveResult.qty} ${a.items[0].unit} · ${esc(a.receiveResult.condition)}${a.receiveResult.note?' · '+esc(a.receiveResult.note):''}</div></div></div>`:''}
        ${a.refundMethod?`<div class="kv full" style="margin-top:10px"><div><div class="k">退款信息</div><div class="v">${esc(a.refundMethod)} · ${fmtMoney(a.refundAmount||total)} · 财务留痕可查</div></div></div>`:''}
        <div class="divider"></div>
        <div class="btn-row">${btns.join('')||'<span class="small">当前环节无待办操作</span>'}</div>
      </div>
      <div class="card"><div class="card-h"><b>退换商品明细</b></div>
        <div class="table-wrap"><table class="tb">
          <thead><tr><th>商品</th><th>单位</th><th class="num">数量</th><th class="num">单价</th><th class="num">金额</th></tr></thead>
          <tbody>${items}</tbody></table></div></div>
      <div class="card"><div class="card-h"><b>售后流程</b></div>
        <div class="tl">${flow}${extra}</div>
        <div class="small mt8">${I('warn','sm')} 质量问题与非质量问题走不同后续流程；退回商品按「可二次销售 / 报废」分类入库；签收超 30 天默认拒绝售后</div></div>
    </div>` };
}

/* ---------------- 发起售后 ---------------- */
function vAfterCreate(params){
  const preOrder = params.get('order');
  const eligible = DB.data.orders.filter(o=>{
    if(o.status!=='received') return false;
    const rt = receivedTime(o);
    if(!rt || daysUntil(rt) < -30) return false;
    if(DB.data.aftersales.some(a=>a.orderId===o.id && a.status!=='rejected' && a.status!=='done')) return false;
    return true;
  });
  const opts = ['<option value="">请选择已签收订单</option>'].concat(eligible.map(o=>
    `<option value="${o.id}" ${preOrder===o.id?'selected':''}>${o.id} · ${esc(orderCustomer(o).name)} · ${fmtD(receivedTime(o))} 签收</option>`)).join('');
  const sel = orderById(preOrder) && eligible.some(o=>o.id===preOrder) ? orderById(preOrder) : null;
  const itemsHTML = sel ? sel.items.map((i,idx)=>`
    <div class="cat-node" style="flex-wrap:wrap">
      <span class="nm">${esc(i.name)}<span class="small" style="display:block">${esc(i.spec)} · 订单数量 ${i.qty} ${i.unit} · 单价 ${fmtMoney(i.price)}</span></span>
      <span class="flex">${tag('退换数量','gray')}<input type="number" min="1" max="${i.qty}" value="${i.qty}" data-ai-qty="${idx}" style="width:86px;padding:8px 10px;border:1px solid var(--border);border-radius:9px"></span>
    </div>`).join('') : '';
  return { title:'发起售后申请', menu:'aftersales', back:true, html:`
    <div class="page-card" style="max-width:720px">
      <form data-form="after_create">
      <div class="banner info">${I('clock','sm')}<span>仅「已签收」订单可申请售后（签收后 30 天内）；超时需主管特批。申请通过质管审核后进入入库与退款环节。</span></div>
      <div class="card"><div class="card-h"><b>关联订单</b></div>
        <div class="form-item"><label>选择订单<span class="req">*</span></label><select name="orderId" data-change="ac-order" required>${opts}</select>
        ${eligible.length===0?'<div class="err">当前没有可申请售后的订单（需已签收且在 30 天内）</div>':''}</div>
      </div>
      ${sel?`
      <div class="card"><div class="card-h"><b>退换商品与数量</b></div>${itemsHTML}</div>
      <div class="card"><div class="card-h"><b>申请信息</b></div>
        <div class="form-item"><label>类型<span class="req">*</span></label>
          <div class="seg" id="ac-type">
            <button type="button" class="${App.afterDraft.type==='退货'?'active':''}" data-v="退货" data-action="ac-type">退货退款</button>
            <button type="button" class="${App.afterDraft.type==='换货'?'active':''}" data-v="换货" data-action="ac-type">换货</button>
          </div></div>
        <div class="form-item"><label>退换原因<span class="req">*</span></label>
          <textarea name="reason" required placeholder="如：外包装破损 / 数量修正 / 临期调换……（质量问题将由质管判定）"></textarea></div>
        <div class="form-item"><label>凭证照片</label>
          <div class="seg" id="ac-photo">
            <button type="button" class="${App.afterDraft.photo==='no'?'active':''}" data-v="no" data-action="ac-photo">未上传</button>
            <button type="button" class="${App.afterDraft.photo==='yes'?'active':''}" data-v="yes" data-action="ac-photo">已上传</button>
          </div>
          <div class="tip">演示环境模拟上传；正式环境支持问题照片/凭证附件</div></div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" data-action="back">取消</button>
        <button type="submit" class="btn btn-pri">${I('send','sm')}提交申请（进入质管审核）</button>
      </div>`:`
      <div class="card"><div class="empty" style="padding:30px">${I('cart','lg')}<p>请先选择要售后的订单，或先完成订单签收</p></div></div>`}
      </form>
    </div>` };
}

/* ---------------- 操作日志 ---------------- */
function logListHTML(){
  const f = F.logs;
  const list = DB.data.logs.filter(l=>{
    if(f.mod!=='all' && l.module!==f.mod) return false;
    if(f.op!=='all' && l.operator!==f.op) return false;
    return true;
  });
  if(!list.length) return `<div class="empty">${I('file','lg')}<p>暂无日志记录</p></div>`;
  App.lastCount = list.length;
  return `<div class="table-wrap"><table class="tb" style="min-width:640px">
    <thead><tr><th>时间</th><th>模块</th><th>操作人</th><th>操作</th><th>明细</th></tr></thead>
    <tbody>${list.map(l=>`<tr>
      <td style="white-space:nowrap">${fmtDT(l.time)}</td>
      <td>${tag(l.module,l.module==='订单系统'?'info':(l.module==='售后系统'?'pri':'gray'))}</td>
      <td>${esc(l.operator)}<div class="sub">${(ROLES[l.role]||{}).name||'系统'}</div></td>
      <td><b>${esc(l.action)}</b></td><td class="small">${esc(l.detail)}</td></tr>`).join('')}</tbody></table></div>`;
}
function vLogs(){
  const mods = ['all','商品中心','订单系统','售后系统','基础支撑'];
  const ops = ['all', ...new Set(DB.data.logs.map(l=>l.operator))];
  App.listFn = logListHTML;
  return { title:'操作日志', menu:'logs', html:`
    <div class="page-card">
      <div class="banner info">${I('shield','sm')}<span>日志记录关键操作的操作人、时间与内容变更，<b>不可删除与篡改</b>；按 GSP 要求留存不少于 5 年</span></div>
      <div class="filter-bar">
        <div class="filter-row2">
          <select data-fp="logs" data-fk="mod">${mods.map(m=>`<option value="${m}" ${F.logs.mod===m?'selected':''}>${m==='all'?'全部模块':m}</option>`).join('')}</select>
          <select data-fp="logs" data-fk="op">${ops.map(o=>`<option value="${o}" ${F.logs.op===o?'selected':''}>${o==='all'?'全部操作人':o}</option>`).join('')}</select>
        </div>
      </div>
      <div class="count-bar">共 <b></b> 条日志</div>
      <div class="card" id="list-region">${logListHTML()}</div>
    </div>` };
}

/* ---------------- 角色权限 ---------------- */
const PERM_ROWS = [
  ['商品档案管理（新建/编辑）','product.edit'], ['商品停用 / 启用','product.toggle'],
  ['资质证照审核','cert.review'], ['创建订单','order.create'],
  ['订单审核（通过/驳回）','order.review'], ['订单出库（FIFO）','order.ship'],
  ['确认签收','order.receive'], ['订单取消 / 取消审批','order.cancel'],
  ['售后申请','after.create'], ['售后质管审核','after.qa'],
  ['退货入库确认','after.receive'], ['退款办理','after.refund'],
  ['操作日志审计','@logs'], ['角色权限配置','@permissions']
];
function vPermissions(){
  const roleCols = Object.values(ROLES);
  const head = `<tr><th style="min-width:150px">功能点</th>${roleCols.map(r=>`<th style="text-align:center">${r.name}</th>`).join('')}</tr>`;
  const rows = PERM_ROWS.map(([label,perm])=>{
    const cells = roleCols.map(r=>{
      const ok = perm.startsWith('@') ? r.menus.includes(perm.slice(1)) : (r.perms.includes('*')||r.perms.includes(perm));
      return `<td style="text-align:center"><span class="${ok?'perm-yes':'perm-no'}">${ok?'✓':'—'}</span></td>`; }).join('');
    return `<tr><td><b>${label}</b></td>${cells}</tr>`; }).join('');
  const cards = roleCols.map(r=>`
    <div class="cat-node"><span class="role-ava" style="background:${r.color};width:34px;height:34px;border-radius:10px">${I(r.icon)}</span>
      <span class="nm">${r.name}<span class="small" style="display:block">${r.desc}</span></span>
      <span class="cnt">${r.menus.length} 个菜单</span></div>`).join('');
  return { title:'角色权限', menu:'permissions', html:`
    <div class="page-card">
      <div class="banner info">${I('users','sm')}<span>预置运营 / 商务 / 质管 / 财务 / 管理员 5 种角色；不同角色登录后仅可见授权功能菜单，数据权限按部门与客户范围隔离</span></div>
      <div class="card"><div class="card-h"><b>角色一览</b></div>${cards}</div>
      <div class="card"><div class="card-h"><b>权限矩阵</b></div>
        <div class="table-wrap"><table class="tb" style="min-width:640px"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
        <div class="small mt8">${I('warn','sm')} 敏感操作（取消审批、退款办理、日志审计）需二次确认；本页为只读展示，正式环境支持自定义角色与权限点配置</div></div>
    </div>` };
}

/* ---------------- 我的 ---------------- */
function vProfile(){
  const r = App.role();
  const roleBtns = Object.values(ROLES).map(x=>`
    <button class="radio-pill ${x.id===r.id?'active':''}" data-action="switch-role" data-role="${x.id}">${x.name}</button>`).join('');
  return { title:'我的', menu:'profile', html:`
    <div class="page-card" style="max-width:640px">
      <div class="card">
        <div class="detail-head">
          <span class="role-ava" style="background:${r.color};width:52px;height:52px;border-radius:14px">${I(r.icon,'lg')}</span>
          <div class="t"><h2>${r.name}</h2><div class="sub">${r.desc}</div></div>
          ${tag('演示角色','pri')}
        </div>
        <div class="divider"></div>
        <div class="form-item"><label>切换演示角色</label><div class="radio-row">${roleBtns}</div>
          <div class="tip">切换后仅可见该角色权限范围内的功能菜单（PRD-SYS-001）</div></div>
      </div>
      <div class="card">
        <div class="card-h"><b>系统功能</b></div>
        ${can('*')?`
        <div class="todo-item" data-action="nav" data-to="#/logs"><span class="ic" style="background:var(--primary-light);color:var(--primary-dark)">${I('file')}</span>
          <span class="t"><b>操作日志</b><span>关键操作留痕 · 不可篡改 · 留存 ≥ 5 年</span></span><span class="n">›</span></div>
        <div class="todo-item" data-action="nav" data-to="#/permissions"><span class="ic" style="background:var(--blue-light);color:var(--blue)">${I('users')}</span>
          <span class="t"><b>角色权限</b><span>5 种预置角色 · 权限矩阵</span></span><span class="n">›</span></div>`:''}
        <div class="todo-item" data-action="reset-data"><span class="ic" style="background:var(--danger-bg);color:var(--danger)">${I('reset')}</span>
          <span class="t"><b>重置演示数据</b><span>恢复到初始种子数据（清空本机操作痕迹）</span></span><span class="n">›</span></div>
      </div>
      <div class="card">
        <div class="card-h"><b>关于本平台</b></div>
        <div class="small" style="line-height:2">
          医药批发供应链数字化中台 · 演示版 V1.0<br>
          覆盖 PRD 范围：商品中心（档案/分类/价格/证照/库存）· 订单系统（全生命周期）· 售后系统（退换货闭环）· 用户权限 · 操作日志<br>
          合规说明：符合 GSP 药品经营质量管理规范记录保存要求；数据为模拟数据，仅供产品原型评审使用
        </div>
      </div>
      <button class="btn btn-ghost btn-lg" data-action="logout" style="width:100%">${I('logout','sm')}退出登录</button>
    </div>` };
}
