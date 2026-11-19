/* ============================================================
   医药供应数字化平台 · 控制器（路由 / 弹窗 / 事件委托 / 业务动作）
   ============================================================ */
'use strict';

/* ---------------- 应用状态 ---------------- */
const App = {
  draft: { customerId:'', items:[] },          // 创建订单草稿
  afterDraft: { type:'退货', photo:'no' },      // 售后申请草稿
  listFn: null, lastCount: 0, printDoc: '',
  role(){ return ROLES[localStorage.getItem('medplat_role')] || null; },
  render(){ renderApp(); }
};

/* ---------------- 弹窗 / 轻提示 ---------------- */
function openModal(title, bodyHTML, footHTML, wide){
  $('#modal-root').innerHTML = `
    <div class="modal-overlay" data-action="modal-overlay">
      <div class="modal-dialog ${wide?'wide':''}">
        <div class="modal-head"><b>${title}</b><button class="x" data-action="modal-x">${I('x')}</button></div>
        <div class="modal-body">${bodyHTML}</div>
        ${footHTML?`<div class="modal-foot">${footHTML}</div>`:''}
      </div>
    </div>`;
}
function closeModal(){ $('#modal-root').innerHTML = ''; }
function toast(msg, type){
  const el = document.createElement('div');
  el.className = `toast ${type||'success'}`;
  el.innerHTML = `${I(type==='error'?'x':'check')}<span>${esc(msg)}</span>`;
  $('#toast-root').appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),320); }, 2300);
}
function segVal(sel){ const a = document.querySelector(`${sel} button.active`); return a ? a.dataset.v : ''; }
function setSeg(el){ [...el.parentElement.querySelectorAll('button')].forEach(b=>b.classList.toggle('active', b===el)); }
function refreshList(){
  if(App.listFn){ const r = $('#list-region'); if(r){ r.innerHTML = App.listFn(); fillCounts(); } }
}
function fillCounts(){ document.querySelectorAll('.count-bar b').forEach(b=>{ b.textContent = App.lastCount; }); }

/* ---------------- 分类辅助 ---------------- */
function findCat(nodes, id){ for(const n of nodes){ if(n.id===id) return n; const r=findCat(n.children||[],id); if(r) return r; } return null; }
function catDepth(nodes, id, d=1){ for(const n of nodes){ if(n.id===id) return d; const r=catDepth(n.children||[],id,d+1); if(r) return r; } return 0; }
function removeCat(nodes, id){ for(let i=0;i<nodes.length;i++){ if(nodes[i].id===id){ nodes.splice(i,1); return true; } if(removeCat(nodes[i].children||[], id)) return true; } return false; }

/* ---------------- 业务动作 ---------------- */
const ACTIONS = {
  nav: d => { location.hash = d.to; },
  back: () => { if(history.length>1) history.back(); else location.hash='#/dashboard'; },
  'switch-role': d => {
    localStorage.setItem('medplat_role', d.role);
    App.draft = { customerId:'', items:[] };
    location.hash = '#/dashboard'; App.render();
    toast(`已以「${ROLES[d.role].name}」身份进入系统`);
  },
  logout: () => { localStorage.removeItem('medplat_role'); location.hash=''; App.render(); },
  'modal-overlay': (d, el, e) => { if(!e.target.closest('.modal-dialog')) closeModal(); },
  'modal-x': () => closeModal(),
  chip: d => { F[d.page].st = d.val; App.render(); },

  /* 商品 */
  'product-edit': d => { location.hash = `#/products/${d.id}/edit`; },
  'product-toggle': d => {
    const p = productById(d.id); if(!p) return;
    const disabling = p.status==='active';
    openModal(disabling?'停用商品':'启用商品', `
      <p style="font-size:14.5px;line-height:1.8">${disabling
        ?`确认停用「<b>${esc(p.name)}</b>」？<br>停用后该商品不可被新订单选用，历史订单与详情仍可查（PRD-PROD-001）。`
        :`确认恢复「<b>${esc(p.name)}</b>」为在售状态？`}</p>
      <div class="banner warn mt14">${I('warn','sm')}<span>敏感操作需二次确认，操作将记入系统日志（不可删除）</span></div>`,
      `<button class="btn btn-ghost" data-action="modal-x">再想想</button>
       <button class="btn btn-pri" data-action="product-toggle-ok" data-id="${p.id}" data-to="${disabling?'disabled':'active'}">确认${disabling?'停用':'启用'}</button>`);
  },
  'product-toggle-ok': d => {
    const p = productById(d.id); p.status = d.to;
    addLog('商品中心', d.to==='disabled'?'停用商品':'启用商品', `商品 ${p.name}（${p.code}）状态变更为「${d.to==='disabled'?'停用':'在售'}」`);
    closeModal(); App.render(); toast('操作成功，已留痕');
  },
  'cert-review': d => {
    const p = productById(d.pid); const c = p.certificates.find(x=>x.id===d.cid); if(!c) return;
    openModal('证照审核（质管）', `
      <div class="kv full">
        <div><div class="k">商品</div><div class="v">${esc(p.name)}（${esc(p.spec)}）</div></div>
        <div><div class="k">证照类型</div><div class="v">${c.type}</div></div>
        <div><div class="k">证号</div><div class="v">${esc(c.no)}</div></div>
        <div><div class="k">有效期至</div><div class="v">${fmtD(c.expiry)}（${certState(c).label}）</div></div>
      </div>
      <div class="form-item mt14"><label>审核意见</label><textarea id="cert-note" placeholder="选填，如：证照原件核对一致，在有效期内"></textarea></div>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-pri" data-action="cert-review-ok" data-pid="${p.id}" data-cid="${c.id}">${I('check','sm')}确认证照有效</button>`);
  },
  'cert-review-ok': d => {
    const p = productById(d.pid); const c = p.certificates.find(x=>x.id===d.cid);
    c.status = 'approved';
    const note = ($('#cert-note')||{}).value || '';
    addLog('商品中心','证照审核', `${p.name}《${c.type}》（${c.no}）质管复核通过${note?'：'+esc(note):''}`);
    closeModal(); App.render(); toast('证照审核通过');
  },

  /* 分类 */
  'cat-add': d => {
    const cats = flatCats().filter(c=>c.d<2);
    openModal('新建分类', `
      <div class="form-item"><label>分类名称<span class="req">*</span></label><input id="cat-name" placeholder="请输入分类名称"></div>
      ${d.pid?`<div class="tip">将创建在「${esc((findCat(DB.data.categories,d.pid)||{}).name||'')}」之下</div>`
        :`<div class="form-item"><label>父级分类</label><select id="cat-parent">
            <option value="">（作为一级分类）</option>
            ${cats.map(c=>`<option value="${c.id}">${'　'.repeat(c.d)}${c.name}</option>`).join('')}</select>
          <div class="tip">分类树最多支持 3 级（PRD-PROD-002）</div></div>`}`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-pri" data-action="cat-add-ok" ${d.pid?`data-pid="${d.pid}"`:''}>确认创建</button>`);
  },
  'cat-add-ok': d => {
    const name = ($('#cat-name')||{}).value?.trim?.();
    if(!name){ toast('请输入分类名称','error'); return; }
    const node = { id:'G'+Date.now(), name, children:[] };
    const pid = d.pid || (($('#cat-parent')||{}).value || '');
    if(pid){
      if(catDepth(DB.data.categories, pid) >= 3){ toast('最多支持 3 级分类','error'); return; }
      findCat(DB.data.categories, pid).children.push(node);
      addLog('商品中心','新建分类', `创建分类「${name}」（父级：${findCat(DB.data.categories,pid).name}）`);
    } else {
      DB.data.categories.push(node);
      addLog('商品中心','新建分类', `创建一级分类「${name}」`);
    }
    DB.save(); closeModal(); App.render(); toast('分类已创建');
  },
  'cat-del': d => {
    const node = findCat(DB.data.categories, d.id); if(!node) return;
    const used = catCount(d.id);
    if(used>0){ toast(`分类「${node.name}」关联 ${used} 个商品，不可删除`,'error'); return; }
    if((node.children||[]).length>0){ toast(`分类「${node.name}」下存在子分类，不可删除`,'error'); return; }
    openModal('删除分类', `<p style="font-size:14.5px">确认删除分类「<b>${esc(node.name)}</b>」？该操作将记入日志。</p>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-danger-solid" data-action="cat-del-ok" data-id="${d.id}">确认删除</button>`);
  },
  'cat-del-ok': d => {
    const node = findCat(DB.data.categories, d.id);
    removeCat(DB.data.categories, d.id);
    addLog('商品中心','删除分类', `删除分类「${node.name}」`);
    DB.save(); closeModal(); App.render(); toast('分类已删除');
  },

  /* 创建订单 */
  'oc-add': () => {
    const pid = ($('#oc-product')||{}).value;
    const qty = Math.max(1, Math.floor(+($('#oc-qty')||{}).value || 0));
    if(!pid){ toast('请选择商品','error'); return; }
    const p = productById(pid);
    if(p.status!=='active'){ toast('该商品已停用，不可下单','error'); return; }
    if(qty > avail(p)){ toast(`「${p.name}」可用库存仅 ${avail(p)} ${p.unit}，已锁定可售数量`,'error'); return; }
    const exist = App.draft.items.find(i=>i.productId===pid);
    if(exist){ exist.qty += qty; } else {
      App.draft.items.push({ productId:pid, name:p.name, spec:p.spec, unit:p.unit, qty, price:priceFor(p, customerById(App.draft.customerId)?.level||'A'), batchNo:'' });
    }
    App.render(); toast('已添加');
  },
  'oc-remove': d => { App.draft.items.splice(+d.i,1); App.render(); },
  'oc-customer': (d, el) => { App.draft.customerId = el.value; App.render(); },
  'ac-order': (d, el) => { location.hash = '#/aftersales/new?order='+el.value; },
  'ac-type': (d, el) => { App.afterDraft.type = d.v; setSeg(el); },
  'ac-photo': (d, el) => { App.afterDraft.photo = d.v; setSeg(el); },

  /* 订单流程 */
  'order-review-pass': d => {
    const o = orderById(d.id); if(!o) return;
    openModal('订单审核', `
      <div class="kv full">
        <div><div class="k">订单</div><div class="v">${o.id} · ${esc(orderCustomer(o).name)}</div></div>
        <div><div class="k">金额</div><div class="v money">${fmtMoney(orderAmount(o))}</div></div>
      </div>
      <div class="banner info mt14">${I('warn','sm')}<span>审核通过后将锁定各商品对应库存，状态不可逆（除非走取消流程）</span></div>
      <div class="form-item mt14"><label>审核备注</label><textarea id="rv-note" placeholder="选填"></textarea></div>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-pri" data-action="order-review-ok" data-id="${o.id}">${I('check','sm')}确认通过</button>`);
  },
  'order-review-ok': d => {
    const o = orderById(d.id);
    const note = ($('#rv-note')||{}).value || '';
    let short = false;
    o.items.forEach(i=>{ const p = productById(i.productId); if(avail(p) < i.qty) short = true; });
    if(short){ toast('库存不足，无法通过审核（可转异常处理）','error'); return; }
    o.items.forEach(i=>{ productById(i.productId).stock.locked += i.qty; });
    o.status = 'toship';
    o.timeline.push({ status:'toship', time:nowISO(), operator:App.role().name, note:'审核通过，库存已锁定'+(note?'：'+esc(note):'') });
    addLog('订单系统','订单审核', `订单 ${o.id} 审核通过，锁定库存`);
    closeModal(); App.render(); toast('审核通过，进入待出库');
  },
  'order-review-reject': d => {
    const o = orderById(d.id);
    openModal('审核驳回', `
      <div class="form-item"><label>驳回原因<span class="req">*</span></label><textarea id="rj-reason" placeholder="必填，如：价格与协议不符 / 客户资质待确认"></textarea></div>
      <div class="tip">驳回后订单将关闭（取消），原因全程留痕（PRD-ORDER-002）</div>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-danger-solid" data-action="order-reject-ok" data-id="${o.id}">确认驳回</button>`);
  },
  'order-reject-ok': d => {
    const o = orderById(d.id);
    const reason = ($('#rj-reason')||{}).value?.trim?.();
    if(!reason){ toast('请填写驳回原因','error'); return; }
    o.status = 'cancelled'; o.cancelReason = reason;
    o.timeline.push({ status:'cancelled', time:nowISO(), operator:App.role().name, note:'审核驳回：'+esc(reason) });
    addLog('订单系统','订单审核', `订单 ${o.id} 审核驳回：${esc(reason)}`);
    closeModal(); App.render(); toast('已驳回，订单关闭');
  },
  'order-cancel': d => {
    const o = orderById(d.id);
    const direct = o.status==='pending';
    openModal('取消订单', `
      <div class="banner ${direct?'info':'warn'}">${I('clock','sm')}<span>${direct
        ?'待确认订单将直接取消，无需审批（PRD-ORDER-004）。'
        :'已确认订单需走取消申请并经主管审批，审批通过后锁定库存自动释放。'}</span></div>
      <div class="form-item mt14"><label>取消原因<span class="req">*</span></label><textarea id="cc-reason" placeholder="必填，如：客户需求变更 / 库存无法满足"></textarea></div>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-pri" data-action="order-cancel-ok" data-id="${o.id}">提交${direct?'取消':'取消申请'}</button>`);
  },
  'order-cancel-ok': d => {
    const o = orderById(d.id);
    const reason = ($('#cc-reason')||{}).value?.trim?.();
    if(!reason){ toast('请填写取消原因','error'); return; }
    if(o.status==='pending'){
      o.status='cancelled'; o.cancelReason=reason;
      o.timeline.push({ status:'cancelled', time:nowISO(), operator:App.role().name, note:'订单取消：'+esc(reason) });
      addLog('订单系统','取消订单', `订单 ${o.id} 取消：${esc(reason)}`);
    } else {
      o.status='cancel_reviewing'; o.cancelReason=reason;
      o.timeline.push({ status:'cancel_reviewing', time:nowISO(), operator:App.role().name, note:'提交取消申请，等待主管审批' });
      addLog('订单系统','提交取消申请', `订单 ${o.id} 提交取消申请：${esc(reason)}`);
    }
    closeModal(); App.render(); toast('操作成功');
  },
  'order-cancel-approve': d => {
    const o = orderById(d.id);
    o.items.forEach(i=>{ const p = productById(i.productId); p.stock.locked = Math.max(0, p.stock.locked - i.qty); });
    o.status='cancelled';
    o.timeline.push({ status:'cancelled', time:nowISO(), operator:App.role().name, note:'取消审批通过，锁定库存已释放' });
    addLog('订单系统','取消审批', `订单 ${o.id} 取消审批通过，库存释放`);
    App.render(); toast('已取消，库存已释放');
  },
  'order-cancel-reject': d => {
    const o = orderById(d.id);
    o.status='toship';
    o.timeline.push({ status:'toship', time:nowISO(), operator:App.role().name, note:'取消申请被主管驳回，订单恢复待出库' });
    addLog('订单系统','取消审批', `订单 ${o.id} 取消申请被驳回，恢复待出库`);
    App.render(); toast('已驳回，订单恢复待出库');
  },
  'order-ship': d => {
    const o = orderById(d.id); if(!o) return;
    const rows = o.items.map((i,idx)=>{
      const p = productById(i.productId);
      const usable = p.batches.filter(b=>b.qty>=i.qty).sort((a,b)=>new Date(a.expiry)-new Date(b.expiry));
      const rec = usable[0];
      if(!rec) return `<div class="form-item"><label>${esc(i.name)} × ${i.qty} ${i.unit}</label><div class="err">批号库存不足，无法出库（建议转异常处理）</div></div>`;
      return `<div class="form-item"><label>${esc(i.name)} × ${i.qty} ${i.unit}</label>
        <select data-ship-idx="${idx}">${usable.map(b=>`<option value="${b.batchNo}" ${b===rec?'selected':''}>${b.batchNo}（效期 ${fmtD(b.expiry)} · 库存 ${b.qty}）</option>`).join('')}</select>
        <div class="tip">FIFO 推荐：${rec.batchNo}（最早效期优先出库 · PRD-PROD-006）</div></div>`; }).join('');
    openModal('出库发货 · 批号选择', `
      <div class="banner info">${I('truck','sm')}<span>系统按 FIFO（近效期先出）自动推荐批号，可手动调整</span></div>${rows}`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-blue" data-action="order-ship-ok" data-id="${o.id}">${I('truck','sm')}确认出库</button>`);
  },
  'order-ship-ok': d => {
    const o = orderById(d.id);
    for(let idx=0; idx<o.items.length; idx++){
      const sel = document.querySelector(`[data-ship-idx="${idx}"]`);
      if(!sel){ toast('存在批号库存不足的商品，无法出库','error'); return; }
      const i = o.items[idx]; const p = productById(i.productId);
      const b = p.batches.find(x=>x.batchNo===sel.value);
      if(!b || b.qty < i.qty){ toast(`批号 ${sel?sel.value:''} 库存不足`,'error'); return; }
      b.qty -= i.qty; p.stock.total -= i.qty; p.stock.locked = Math.max(0, p.stock.locked - i.qty);
      i.batchNo = b.batchNo;
    }
    o.status='shipped';
    o.timeline.push({ status:'shipped', time:nowISO(), operator:App.role().name, note:'按FIFO推荐批号出库发货' });
    addLog('订单系统','订单出库', `订单 ${o.id} 出库发货，批号：${o.items.map(i=>i.batchNo).join('、')}`);
    closeModal(); App.render(); toast('出库成功，等待签收');
  },
  'order-receive': d => {
    const o = orderById(d.id);
    openModal('确认签收', `<p style="font-size:14.5px;line-height:1.8">确认订单 <b>${o.id}</b> 已由客户签收？<br>签收后订单进入终态，客户可在签收后 30 天内申请售后。</p>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-pri" data-action="order-receive-ok" data-id="${o.id}">${I('check','sm')}确认签收</button>`);
  },
  'order-receive-ok': d => {
    const o = orderById(d.id);
    o.status='received';
    o.timeline.push({ status:'received', time:nowISO(), operator:App.role().name, note:'客户确认签收' });
    addLog('订单系统','确认签收', `订单 ${o.id} 已签收`);
    App.render(); toast('签收成功，订单闭环');
  },
  'order-restore': d => {
    const o = orderById(d.id);
    o.status='pending';
    o.timeline.push({ status:'pending', time:nowISO(), operator:App.role().name, note:'异常已处理，恢复正常审核流程' });
    addLog('订单系统','异常处理', `订单 ${o.id} 异常已处理，恢复正常流程`);
    App.render(); toast('已恢复正常流程');
  },
  'order-print': d => {
    const o = orderById(d.id); const c = orderCustomer(o);
    const rows = o.items.map(i=>{
      const p = productById(i.productId);
      const b = p ? p.batches.find(x=>x.batchNo===i.batchNo) : null;
      return `<tr><td>${esc(i.name)}</td><td>${esc(i.spec)}</td><td>${p?p.dosageForm:'—'}</td><td>${i.batchNo||'—'}</td><td>${b?fmtD(b.expiry):'—'}</td><td>${p?esc(p.manufacturer):'—'}</td><td class="num">${i.qty}</td><td class="num">${i.price.toFixed(2)}</td><td class="num">${(i.qty*i.price).toFixed(2)}</td></tr>`; }).join('');
    App.printDoc = `<div class="print-doc">
      <div class="ph">康诺医药供应链有限公司</div>
      <h2>随 货 同 行 单</h2>
      <div class="meta"><span>单号：${o.id}</span><span>打印时间：${fmtDT(nowISO())}</span></div>
      <div class="meta"><span>收货单位：${esc(c.name)}（${c.level} 级）</span><span>订单日期：${fmtD(o.createdAt)}</span></div>
      <table><thead><tr><th>通用名</th><th>规格</th><th>剂型</th><th>批号</th><th>效期至</th><th>生产厂商</th><th>数量</th><th>单价</th><th>金额</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="meta" style="margin-top:8px"><span>合计金额：¥${orderAmount(o).toFixed(2)}</span><span>单据类型：销售出库 · 随货同行联</span></div>
      <div class="sign"><span>发货人：__________</span><span>质检员：__________</span><span>收货人：__________</span></div>
      <div class="fn">依据 GSP 要求随货同行 · 含通用名/规格/批号/效期/生产厂商合规字段（PRD-ORDER-006）· 演示环境模拟打印</div></div>`;
    openModal('随货同行单 · 打印预览', `<div class="print-preview">${App.printDoc}</div>`,
      `<button class="btn btn-ghost" data-action="modal-x">关闭</button>
       <button class="btn btn-pri" data-action="print-now">${I('print','sm')}打印</button>`, true);
  },
  'print-now': () => {
    document.body.classList.add('printing');
    const area = document.getElementById('print-area');
    if(area) area.innerHTML = App.printDoc || '';
    window.print();
    setTimeout(()=>document.body.classList.remove('printing'), 400);
  },

  /* 售后 */
  'after-qa': d => {
    const a = afterById(d.id); if(!a) return;
    openModal('质管审核 · 质量判定', `
      <div class="banner info">${I('shield','sm')}<span>质量问题与非质量问题走不同后续流程；审核结果记录在案，作为统计依据（PRD-AFTER-002）</span></div>
      <div class="form-item"><label>质量判定<span class="req">*</span></label>
        <div class="seg" id="qa-type">
          <button type="button" class="active" data-v="非质量问题" data-action="qa-type">非质量问题</button>
          <button type="button" data-v="质量问题" data-action="qa-type">质量问题</button>
        </div></div>
      <div class="form-item"><label>审核意见</label><textarea id="qa-note" placeholder="如：商品外观完好，批号一致，符合退货条件"></textarea></div>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-danger" data-action="after-qa-reject" data-id="${a.id}">驳回申请</button>
       <button class="btn btn-pri" data-action="after-qa-ok" data-id="${a.id}">${I('check','sm')}审核通过</button>`);
  },
  'qa-type': (d, el) => setSeg(el),
  'after-qa-ok': d => {
    const a = afterById(d.id);
    a.qaResult = segVal('#qa-type') || '非质量问题';
    a.qaNote = ($('#qa-note')||{}).value || '';
    a.status = 'wh_receive';
    a.timeline.push({ status:'wh_receive', time:nowISO(), operator:App.role().name, note:`质管审核通过（${a.qaResult}）${a.qaNote?'：'+esc(a.qaNote):''}` });
    addLog('售后系统','质管审核', `售后单 ${a.id} 判定为${a.qaResult}，审核通过`);
    closeModal(); App.render(); toast('审核通过，进入仓库入库环节');
  },
  'after-qa-reject': d => {
    const a = afterById(d.id);
    a.qaResult = segVal('#qa-type') || '';
    a.qaNote = ($('#qa-note')||{}).value || '';
    a.status = 'rejected';
    a.timeline.push({ status:'rejected', time:nowISO(), operator:App.role().name, note:'质管审核未通过'+(a.qaNote?'：'+esc(a.qaNote):'') });
    addLog('售后系统','质管审核', `售后单 ${a.id} 审核驳回`);
    closeModal(); App.render(); toast('已驳回该售后申请');
  },
  'after-receive': d => {
    const a = afterById(d.id); if(!a) return;
    const it = a.items[0];
    openModal('仓库入库确认', `
      <div class="form-item"><label>实收数量（申请 ${it.qty} ${it.unit}）<span class="req">*</span></label>
        <input id="rc-qty" type="number" min="0" max="${it.qty}" value="${it.qty}">
        <div class="tip">入库数量与申请数量不一致时，需填写差异说明（PRD-AFTER-003）</div></div>
      <div class="form-item"><label>商品状态分类<span class="req">*</span></label>
        <div class="seg" id="rc-cond">
          <button type="button" class="active" data-v="可二次销售" data-action="rc-cond">可二次销售</button>
          <button type="button" data-v="报废" data-action="rc-cond">报废</button>
        </div>
        <div class="tip">判定为不可二次销售的直接走报废流程，不计入可售库存</div></div>
      <div class="form-item"><label>差异说明 / 备注</label><textarea id="rc-note" placeholder="选填"></textarea></div>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-blue" data-action="after-receive-ok" data-id="${a.id}">${I('truck','sm')}确认入库</button>`);
  },
  'rc-cond': (d, el) => setSeg(el),
  'after-receive-ok': d => {
    const a = afterById(d.id);
    const qty = Math.max(0, Math.min(a.items[0].qty, +($('#rc-qty')||{}).value || 0));
    const cond = segVal('#rc-cond') || '可二次销售';
    const note = ($('#rc-note')||{}).value || '';
    if(qty !== a.items[0].qty && !note){ toast('实收数量与申请不一致，必须填写差异说明','error'); return; }
    a.receiveResult = { qty, condition:cond, note };
    if(a.type === '退货'){
      a.status = 'fin_refund';
      a.timeline.push({ status:'fin_refund', time:nowISO(), operator:App.role().name, note:`仓库收货入库：${qty} ${a.items[0].unit} / ${cond}${note?' · '+esc(note):''}` });
      addLog('售后系统','退货入库', `售后单 ${a.id} 入库 ${qty} ${a.items[0].unit}（${cond}）`);
      closeModal(); App.render(); toast('入库确认，进入财务退款环节');
    } else {
      /* 换货：生成换货出库订单并闭环 */
      const ex = { id: genNo('SO'), customerId: a.customerId,
        items: a.items.map(i=>({ ...i, batchNo:'' })),
        status:'toship', createdAt: nowISO(), remark:`换货出库单（关联售后单 ${a.id}）`,
        timeline: [ {status:'pending', time:nowISO(), operator:App.role().name, note:`换货出库单创建（关联售后单 ${a.id}）`},
                    {status:'toship', time:nowISO(), operator:'系统', note:'换货流程自动进入待出库，库存已锁定'} ] };
      ex.items.forEach(i=>{ const p = productById(i.productId); if(p) p.stock.locked += i.qty; });
      DB.data.orders.unshift(ex);
      a.status = 'done';
      a.timeline.push({ status:'done', time:nowISO(), operator:App.role().name, note:`换货出库单 ${ex.id} 已生成，售后闭环` });
      addLog('售后系统','换货出库', `售后单 ${a.id} 生成换货出库单 ${ex.id}`);
      closeModal(); App.render(); toast(`换货出库单 ${ex.id} 已生成`);
    }
  },
  'after-refund': d => {
    const a = afterById(d.id); if(!a) return;
    const total = a.items.reduce((s,i)=>s+i.qty*i.price,0);
    openModal('财务退款', `
      <div class="kv full"><div><div class="k">应退金额</div><div class="v money" style="font-size:22px;color:var(--primary-dark)">${fmtMoney(total)}</div></div></div>
      <div class="form-item mt14"><label>退款方式<span class="req">*</span></label>
        <div class="seg" id="rf-method">
          <button type="button" class="active" data-v="原路退回" data-action="rf-method">原路退回</button>
          <button type="button" data-v="冲抵应收" data-action="rf-method">冲抵应收</button>
        </div></div>
      <div class="tip">退款金额与审批一致；退款完成后售后单闭环，财务留痕可查（PRD-AFTER-004）</div>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-pri" data-action="after-refund-ok" data-id="${a.id}">${I('card','sm')}确认退款</button>`);
  },
  'rf-method': (d, el) => setSeg(el),
  'after-refund-ok': d => {
    const a = afterById(d.id);
    const total = a.items.reduce((s,i)=>s+i.qty*i.price,0);
    a.refundMethod = segVal('#rf-method') || '原路退回';
    a.refundAmount = total;
    a.status = 'done';
    a.timeline.push({ status:'done', time:nowISO(), operator:App.role().name, note:`退款完成：${a.refundMethod} ${fmtMoney(total)}` });
    addLog('售后系统','退款办理', `售后单 ${a.id} 退款完成（${a.refundMethod} ${fmtMoney(total)}），售后闭环`);
    closeModal(); App.render(); toast('退款完成，售后单已闭环');
  },

  /* 系统 */
  'reset-data': () => {
    openModal('重置演示数据', `<p style="font-size:14.5px;line-height:1.8">将清空本机全部操作痕迹，恢复到初始种子数据。<br><b>该操作不可撤销。</b></p>`,
      `<button class="btn btn-ghost" data-action="modal-x">取消</button>
       <button class="btn btn-danger-solid" data-action="reset-ok">确认重置</button>`);
  },
  'reset-ok': () => {
    DB.reset(); closeModal();
    location.hash='#/dashboard'; App.render();
    toast('演示数据已重置');
  }
};

/* ---------------- 表单提交 ---------------- */
const FORMS = {
  product_save(form){
    const fd = new FormData(form);
    const id = form.dataset.id;
    const approvalNo = (fd.get('approvalNo')||'').trim();
    if(!/^国药准字[HZS]\d{8}$/.test(approvalNo)){ toast('批准文号格式不正确：国药准字 + H/Z/S + 8 位数字','error'); return; }
    const prices = { A:+fd.get('pa'), B:+fd.get('pb'), C:+fd.get('pc') };
    const base = {
      name:(fd.get('name')||'').trim(), spec:(fd.get('spec')||'').trim(), dosageForm:fd.get('dosageForm'),
      unit:(fd.get('unit')||'').trim(), approvalNo, barcode:(fd.get('barcode')||'').trim(),
      manufacturer:(fd.get('manufacturer')||'').trim(), origin:(fd.get('origin')||'').trim(),
      categoryId:fd.get('categoryId'), code:(fd.get('code')||'').trim()
    };
    if(id){
      const p = productById(id); if(!p) return;
      ['A','B','C'].forEach(lv=>{
        if(p.prices[lv] !== prices[lv])
          p.priceHistory.push({ date:fmtD(nowISO()), level:lv, from:p.prices[lv], to:prices[lv], operator:App.role().name });
      });
      const priceChanged = JSON.stringify(p.prices)!==JSON.stringify(prices);
      Object.assign(p, base, { prices });
      addLog('商品中心','编辑商品', `商品 ${p.name}（${p.code}）档案更新${priceChanged?'，价格变更已留痕（正式环境需双人确认）':''}`);
      DB.save(); location.hash = `#/products/${id}`; toast('商品已保存');
    } else {
      const total = Math.max(0, +fd.get('stock') || 0);
      const d = new Date(Date.now()+365*86400000);
      const p = { ...base, id:'P'+Date.now().toString(36), status:'active',
        stock:{ total, locked:0, transit:0 },
        batches: total>0 ? [{ batchNo:'N'+String(Date.now()).slice(-6), expiry:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, qty:total }] : [],
        prices, priceHistory:[], certificates:[] };
      DB.data.products.unshift(p);
      addLog('商品中心','新建商品', `新建商品 ${p.name}（${p.code}），期初库存 ${total} ${p.unit}`);
      DB.save(); location.hash = `#/products/${p.id}`; toast('商品创建成功');
    }
  },
  order_create(form){
    const fd = new FormData(form);
    const cid = fd.get('customerId') || App.draft.customerId;
    if(!cid){ toast('请选择客户','error'); return; }
    const c = customerById(cid);
    if(c.status==='paused'){ toast('客户「'+c.name+'」已暂停交易，不可下单','error'); return; }
    document.querySelectorAll('[data-oc-qty]').forEach(inp=>{
      const i = +inp.dataset.ocQty; if(App.draft.items[i]) App.draft.items[i].qty = Math.max(1, Math.floor(+inp.value||1));
    });
    if(!App.draft.items.length){ toast('请至少添加一个商品','error'); return; }
    for(const it of App.draft.items){
      const p = productById(it.productId);
      if(!p || p.status!=='active'){ toast('存在已停用商品，请移除后提交','error'); return; }
      if(it.qty > avail(p)){ toast(`「${p.name}」可用库存不足（当前 ${avail(p)}）`,'error'); return; }
    }
    const o = { id: genNo('SO'), customerId: cid, items: App.draft.items.map(i=>({ ...i })),
      status:'pending', createdAt: nowISO(), remark:(fd.get('remark')||'').trim(),
      timeline:[{ status:'pending', time:nowISO(), operator:App.role().name, note:'订单创建，等待运营审核' }] };
    DB.data.orders.unshift(o);
    addLog('订单系统','创建订单', `新建订单 ${o.id}，客户：${c.name}，金额 ${fmtMoney(orderAmount(o))}`);
    App.draft = { customerId:'', items:[] };
    DB.save(); location.hash = `#/orders/${o.id}`; toast('订单创建成功，进入待确认');
  },
  after_create(form){
    const fd = new FormData(form);
    const oid = fd.get('orderId');
    if(!oid){ toast('请选择要售后的订单','error'); return; }
    const o = orderById(oid); if(!o) return;
    const reason = (fd.get('reason')||'').trim();
    if(!reason){ toast('请填写退换原因','error'); return; }
    const items = o.items.map((i,idx)=>{
      const inp = document.querySelector(`[data-ai-qty="${idx}"]`);
      const qty = Math.max(1, Math.min(i.qty, Math.floor(+inp?.value || i.qty)));
      return { productId:i.productId, name:i.name, spec:i.spec, unit:i.unit, qty, price:i.price };
    });
    const a = { id: genNo('SH'), orderId: oid, customerId: o.customerId,
      type: App.afterDraft.type, reason, hasPhoto: App.afterDraft.photo==='yes',
      items, status:'qa_review', createdAt: nowISO(),
      timeline:[{ status:'qa_review', time:nowISO(), operator:App.role().name, note:'售后申请提交' }] };
    DB.data.aftersales.unshift(a);
    addLog('售后系统','提交售后申请', `售后单 ${a.id}（${a.type}），关联订单 ${oid}`);
    DB.save(); location.hash = `#/aftersales/${a.id}`; toast('售后申请已提交，等待质管审核');
  }
};

/* ---------------- 事件委托 ---------------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const fn = ACTIONS[el.dataset.action];
  if(fn){ if(el.tagName==='A') e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-fp]');
  if(el){ F[el.dataset.fp][el.dataset.fk] = el.value; refreshList(); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-fp]');
  if(el){ F[el.dataset.fp][el.dataset.fk] = el.value; refreshList(); return; }
  const el2 = e.target.closest('[data-change]');
  if(el2){ const fn = ACTIONS[el2.dataset.change]; if(fn) fn(el2.dataset, el2, e); }
});
document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-form]');
  if(form){ e.preventDefault(); const fn = FORMS[form.dataset.form]; if(fn) fn(form); }
});

/* ---------------- 路由与渲染 ---------------- */
function currentSegs(){
  return (location.hash||'#/dashboard').split('?')[0].replace(/^#\/?/, '').split('/').filter(Boolean);
}
const noPerm = () => ({ title:'无权访问', html:`<div class="empty">${I('shield','lg')}<p>当前角色无权访问该模块<br><span class="small">可在「我的」中切换演示角色</span></p></div>` });

function renderApp(){
  const role = App.role();
  if(!role){ $('#app').innerHTML = vLogin().html; return; }
  const segs = currentSegs();
  const p0 = segs[0] || 'dashboard';
  const menuOf = { dashboard:'dashboard', products:'products', categories:'categories', orders:'orders', aftersales:'aftersales', logs:'logs', permissions:'permissions', profile:'profile' };
  let view;
  if(menuOf[p0] && !role.menus.includes(menuOf[p0])){ view = noPerm(); }
  else if(p0==='products'){
    if(segs.length===1) view = vProducts();
    else if(segs[1]==='new') view = can('product.edit') ? vProductForm(null) : noPerm();
    else if(segs[2]==='edit') view = can('product.edit') ? vProductForm(segs[1]) : noPerm();
    else view = vProductDetail(segs[1]);
  }
  else if(p0==='orders'){
    if(segs.length===1) view = vOrders();
    else if(segs[1]==='new') view = can('order.create') ? vOrderCreate() : noPerm();
    else view = vOrderDetail(segs[1]);
  }
  else if(p0==='aftersales'){
    if(segs.length===1) view = vAftersales();
    else if(segs[1]==='new') view = can('after.create') ? vAfterCreate(new URLSearchParams(location.hash.split('?')[1]||'')) : noPerm();
    else view = vAfterDetail(segs[1]);
  }
  else if(p0==='categories') view = vCategories();
  else if(p0==='logs') view = vLogs();
  else if(p0==='permissions') view = vPermissions();
  else if(p0==='profile') view = vProfile();
  else view = vDashboard();

  /* 预警与角标 */
  const certAlerts = DB.data.products.flatMap(p=>p.certificates).filter(c=>certState(c).tag!=='success').length;
  const stockAlerts = DB.data.products.filter(p=>p.status==='active' && p.batches.some(b=>b.qty>0 && batchState(b).tag!=='success')).length;
  const alertCount = certAlerts + stockAlerts;
  const orderBadge = DB.data.orders.filter(o=>['pending','cancel_reviewing','abnormal'].includes(o.status)).length;
  const afterBadge = DB.data.aftersales.filter(a=>['qa_review','wh_receive','fin_refund'].includes(a.status)).length;

  /* 桌面端侧边栏 */
  const SIDE = [
    { g:'业务中台', items:[
      {k:'dashboard', i:'home', t:'工作台'},
      {k:'products', i:'box', t:'商品中心'},
      {k:'orders', i:'cart', t:'订单管理', b:orderBadge},
      {k:'aftersales', i:'refresh', t:'售后服务', b:afterBadge} ]},
    { g:'基础数据', items:[ {k:'categories', i:'layers', t:'分类管理'} ]},
    { g:'系统管理', items:[
      {k:'logs', i:'file', t:'操作日志'},
      {k:'permissions', i:'users', t:'角色权限'} ]}
  ];
  const sideHTML = SIDE.map(g=>{
    const items = g.items.filter(it=>role.menus.includes(it.k)).map(it=>`
      <button class="side-item ${view.menu===it.k?'active':''}" data-action="nav" data-to="#/${it.k}">
        ${I(it.i)}${it.t}${it.b?`<span class="badge">${it.b}</span>`:''}
      </button>`).join('');
    return items ? `<div class="side-group">${g.g}</div>${items}` : '';
  }).join('');

  /* 移动端底部导航 */
  const BN = [
    {k:'dashboard', i:'home', t:'工作台'},
    {k:'products', i:'box', t:'商品'},
    {k:'orders', i:'cart', t:'订单', b:orderBadge},
    {k:'aftersales', i:'refresh', t:'售后', b:afterBadge},
    {k:'profile', i:'user', t:'我的'}
  ];
  const bnHTML = BN.map(it=>`
    <button class="bn-item ${view.menu===it.k?'active':''}" data-action="nav" data-to="#/${it.k}">
      ${I(it.i)}${it.t}${it.b?`<span class="bn-badge">${it.b}</span>`:''}
    </button>`).join('');

  $('#app').innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="side-logo"><span class="mark">${I('cross')}</span><span><b>医药供应数字化平台</b><span>MedSupply · 中台 V1.0</span></span></div>
      ${sideHTML}
      <div class="side-role">
        <div class="role-card">
          <span class="role-ava" style="background:${role.color}">${I(role.icon)}</span>
          <span><b>${role.name}</b><span>${role.desc}</span></span>
        </div>
        <div class="row">
          <button class="btn btn-ghost btn-sm" data-action="nav" data-to="#/profile">${I('user','sm')}我的</button>
          <button class="btn btn-ghost btn-sm" data-action="logout">${I('logout','sm')}退出</button>
        </div>
      </div>
    </aside>
    <div class="main">
      <header class="header">
        ${view.back?`<button class="h-back" data-action="back">${I('back')}</button>`:''}
        <h1>${view.title}</h1>
        <button class="h-bell" data-action="nav" data-to="#/dashboard" title="预警提醒">${I('bell')}${alertCount?`<span class="dot">${alertCount}</span>`:''}</button>
        <div class="h-user">${tag(role.name,'pri')}<span class="u-name">演示账号</span></div>
      </header>
      <div class="content">${view.html}</div>
    </div>
    <nav class="bottom-nav">${bnHTML}</nav>
  </div>`;
  fillCounts();
  window.scrollTo(0,0);
}

/* ---------------- 启动 ---------------- */
DB.load();
window.addEventListener('hashchange', () => App.render());
App.render();
