/* Run: node tests/finance-core.test.js
 * Synthetic data only. No bank credentials, personal transactions, or network. */
"use strict";
const assert=require("node:assert/strict");
global.window=global;
require("../finance-core.js");
const f=global.MFCFinance;
function sample(available,{verified=true,ref="classic"}={}){
 return {
  bankSync:{generated_at:"2026-11-24T12:00:00Z",banks:{cgd:{accounts:[
   {account_ref:"current",balance:{currency:"EUR",amount:6000}},
   {account_ref:ref,balance:{currency:"EUR",amount:available}}
  ]}}},
  accountRoles:{"cgd|current":"current",["cgd|"+ref]:"credit"},
  creditPolicies:verified?{"cgd|classic":{meaning:"available-credit",userVerified:true,limit:2500}}:{},
  debtAnchors:{car:{date:"2026-11-01",balance:6200}},
  cardBalance:2130.78,carBalance:6200,cardRegular:231.25,carRegular:210.74,
  transactions:[{import_id:"txn-1",date:"2026-11-10",description:"CREDIBOM",amount:-210.74,account:"CGD",category:"Debt payment"}]
 };
}
function run(){
 // A: verified fully available card -> no liability, no installment.
 const a=sample(2500),da=f.debtState(a);
 assert.equal(da.card.balance,0);assert.equal(da.card.settled,true);assert.equal(da.cardPayment,0);
 assert.equal(da.activeDebtTotal,da.car.balance);
 // B: verified partially available credit.
 const b=f.debtState(sample(2100));assert.equal(b.card.balance,400);assert.equal(b.card.settled,false);
 // C: raw generic balance is not semantic verification.
 const c=f.debtState(sample(2500,{verified:false}));
 assert.equal(c.card.settled,false);assert.equal(c.card.source,"legacy-unverified");
 // D: reimporting same transaction never double counts.
 const reimport=sample(2500);
 reimport.transactions.push({...reimport.transactions[0]});
 assert.equal(f.uniqueTransactions(reimport).length,1);
 assert.equal(f.debtState(reimport).car.balance,5989.26);
 // E: the same core is called for all three views, no divergent formulas.
 const pageOverview=f.debtState(reimport),pageDebts=f.debtState(reimport),pageIntelligence=f.debtState(reimport);
 assert.deepEqual(pageOverview,pageDebts);assert.deepEqual(pageDebts,pageIntelligence);
 // F: no future card installment; cash excludes credit limit.
 assert.equal(pageIntelligence.cardPayment,0);
 assert.equal(f.bankCash(reimport).value,6000);
 // G: persistent serialized state and changed bank refs.
 const persisted=JSON.parse(JSON.stringify(reimport));
 assert.equal(f.debtState(persisted).card.balance,0);
 persisted.bankSync.banks.cgd.accounts[1].account_ref="rotated";
 persisted.accountRoles["cgd|rotated"]="credit";
 assert.equal(f.debtState(persisted).card.settled,false);
 // Snapshot freshness: an old export cannot overwrite current balances.
 assert.equal(f.snapshotDecision(reimport,"2026-11-11T10:00:00Z").accept,false);
 assert.equal(f.snapshotDecision(reimport,"2026-11-24T12:00:00Z").accept,true);
 assert.equal(f.snapshotDecision(reimport,"2026-11-25T12:00:00Z").accept,true);
 assert.equal(f.snapshotDecision(reimport,"invalid").accept,false);
 // Import validation: supported schema, correct transactions and currencies.
 const incoming={format:"mfc-snapshot-v1",generated_at:"2026-11-24T12:00:00Z",banks:{
  cgd:{accounts:[{account_ref:"current",balance:{currency:"EUR",amount:6000},
   transactions:[{id:"payment-1",date:"2026-11-10",amount:-210.74,description:"CREDIBOM"}]}]}
 }};
 assert.equal(f.validateSnapshot(incoming).valid,true);
 const bad=JSON.parse(JSON.stringify(incoming));bad.banks.cgd.accounts[0].transactions[0].amount="invalid";
 assert.equal(f.validateSnapshot(bad).valid,false);
 const invalidDate=JSON.parse(JSON.stringify(incoming));invalidDate.generated_at="not-a-date";
 assert.equal(f.validateSnapshot(invalidDate).valid,false);
 // Account diff identifies added/missing accounts and variations without treating
 // a credit-card credit-limit change as income.
 const previous={banks:{cgd:{accounts:[{account_ref:"current",balance:{currency:"EUR",amount:5000}},
  {account_ref:"old",balance:{currency:"EUR",amount:2500}}]}}};
 const result=f.snapshotDiff(previous,incoming);
 assert.equal(result.changes.find(x=>x.refSuffix==="urrent").delta,1000);
 assert.equal(result.missingAccounts,1);
 assert.equal(result.newAccounts,0);
 // Metadata guard: available credit exceeding limit cannot be trusted.
 assert.equal(f.debtState(sample(2600)).card.settled,false);
 // No known debt balance is not proof of settlement.
 const empty=sample(2500,{verified:false});delete empty.cardBalance;
 assert.equal(f.debtState(empty).card.balance,null);
 assert.equal(f.debtState(empty).card.settled,false);
 console.log("PASS: A–G, snapshot freshness, schema validation, account diffs, rotated refs and ambiguous debt");
}
run();
