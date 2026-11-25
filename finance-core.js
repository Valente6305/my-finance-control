/* My Finance Control · shared financial reconciliation v1
   No credentials, network activity, or localStorage writes. */
(function(root){
"use strict";
const round=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
const number=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v))?Number(v):null;
const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
const key=(bank,a)=>String(bank).toLowerCase()+"|"+String(a?.account_ref||"");
const cardMatch=t=>/CAIXA CLASSIC|C CLASSIC|PAGAMENTO CARTAO|CARTAO CREDITO|PAG CARTAO|PAG\. CARTAO/.test(norm(t.description));
const carMatch=t=>/CREDIBOM/.test(norm(t.description));
function uniqueTransactions(s){
 const map=new Map();
 for(const t of (s.transactions||[])){
  if(!t||!/^\d{4}-\d{2}-\d{2}/.test(String(t.date||""))||number(t.amount)===null)continue;
  const id=t.import_id||[t.date,t.account,t.description,t.amount].join("|");
  if(!map.has(id))map.set(id,t);
 }
 return [...map.values()];
}
function bankCash(s){
 const banks=s.bankSync?.banks||{},roles=s.accountRoles||{},items=[];
 for(const [bank,b] of Object.entries(banks))for(const a of (b.accounts||[])){
  const role=roles[key(bank,a)]||"unassigned",balance=number(a.balance?.amount);
  if((role==="current"||role==="savings")&&a.balance?.currency==="EUR"&&balance!==null)
   items.push({bank,account_ref:a.account_ref||"",role,balance});
 }
 if(items.length)return {value:round(items.reduce((x,a)=>x+a.balance,0)),count:items.length,items,asOf:s.bankSync?.generated_at||"",source:"bank"};
 return {value:number(s.balance)||0,count:0,items:[],asOf:s.bankSync?.generated_at||s.balanceDate||"",source:"legacy"};
}
function anchorEstimate(s,kind,rows){
 const a=s.debtAnchors?.[kind];
 if(!a||!/^\d{4}-\d{2}-\d{2}$/.test(String(a.date||""))||number(a.balance)===null||number(a.balance)<0)return null;
 const matches=rows.filter(t=>t.import_id&&String(t.date)>a.date&&number(t.amount)<0&&(kind==="card"?cardMatch(t):carMatch(t)));
 const paid=round(matches.reduce((x,t)=>x-Number(t.amount),0));
 const balance=Math.max(0,round(Number(a.balance)-paid)),asOf=matches.reduce((d,t)=>t.date>d?t.date:d,a.date);
 return {balance,anchorBalance:Number(a.balance),anchorDate:a.date,payments:paid,matches:matches.length,asOf,status:"estimated",source:"reference-minus-payments",settled:false};
}
function creditCard(s,rows){
 const policies=s.creditPolicies||{},banks=s.bankSync?.banks||{},roles=s.accountRoles||{};
 const verified=[];
 for(const [bank,b] of Object.entries(banks))for(const a of (b.accounts||[])){
  if(bank.toLowerCase()!=="cgd"||roles[key(bank,a)]!=="credit")continue;
  const p=policies[key(bank,a)];
  if(!p||p.meaning!=="available-credit"||p.userVerified!==true||number(p.limit)===null||number(p.limit)<=0)continue;
  if(a.balance?.currency!=="EUR"||number(a.balance?.amount)===null)continue;
  const available=number(a.balance.amount),limit=number(p.limit);
  if(available<0||available>limit+0.01)continue;
  verified.push({accountRef:a.account_ref||"",limit,available,asOf:s.bankSync?.generated_at||""});
 }
 if(verified.length===1){
  const v=verified[0],balance=Math.max(0,round(v.limit-v.available)),settled=balance<=0.01;
  return {balance,limit:v.limit,available:v.available,accountRef:v.accountRef,asOf:v.asOf,status:settled?"settled":"active",settled,settledAt:settled?String(v.asOf).slice(0,10):"",source:"verified-available-credit",confidence:"bank-balance-user-verified",payments:0,matches:0};
 }
 const estimate=anchorEstimate(s,"card",rows);
 if(estimate)return {...estimate,status:"unverified-estimate",confidence:"estimated-only"};
 const legacy=number(s.cardBalance);
 return {balance:legacy!==null?Math.max(0,legacy):null,status:"unverified",source:"legacy-unverified",confidence:"unverified",settled:false,payments:0,matches:0,asOf:""};
}
function debtState(s){
 const rows=uniqueTransactions(s),card=creditCard(s,rows);
 const car=anchorEstimate(s,"car",rows)||{balance:number(s.carBalance),status:"unverified-estimate",source:"legacy-unverified",settled:false,payments:0,matches:0,asOf:""};
 // No missing or legacy zero is evidence of debt settlement.
 const cardPayment=card.settled?0:(number(s.cardRegular)??231.25);
 const carPayment=car.settled?0:(number(s.carRegular)??210.74);
 return {card,car,cardPayment,carPayment,activeDebtTotal:(card.balance===null||car.balance===null)?null:round(card.balance+car.balance)};
}
function quality(s){
 const d=debtState(s),cash=bankCash(s),rows=uniqueTransactions(s).filter(t=>t.import_id);
 const accounts=Object.entries(s.bankSync?.banks||{}).flatMap(([bank,b])=>(b.accounts||[]).map(a=>({bank,role:s.accountRoles?.[key(bank,a)]||"unassigned"})));
 const unclassified=rows.filter(t=>["Uncategorised","Card purchase / review",""].includes(String(t.category||""))).length;
 const issues=[];
 if(!s.bankSync?.generated_at)issues.push("Snapshot bancário em falta");
 if(!cash.count)issues.push("Sem contas de caixa reconciliadas");
 if(accounts.some(a=>a.role==="unassigned"))issues.push("Existem contas não classificadas");
 if(d.card.source!=="verified-available-credit")issues.push("Semântica do saldo Caixa Classic por confirmar");
 if(unclassified)issues.push(unclassified+" movimento(s) por classificar");
 const t=Date.parse(s.bankSync?.generated_at||"");const days=Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/86400000)):null;
 if(days!==null&&days>2)issues.push("Snapshot desatualizado: "+days+" dia(s)");
 return {rows:rows.length,accounts:accounts.length,assigned:accounts.filter(a=>a.role!=="unassigned").length,cashCount:cash.count,unclassified,days,issues,status:issues.length?"attention":"reconciled"};
}
root.MFCFinance={version:"1.0.0",key,bankCash,debtState,quality,uniqueTransactions};
})(window);
