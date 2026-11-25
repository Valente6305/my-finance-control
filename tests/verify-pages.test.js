/* Structural browser-page regression checks — no production banking data. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=path.join(__dirname,"..");
for(const file of ["index.html","bank-accounts.html","financial-intelligence.html"]){
 const html=fs.readFileSync(path.join(root,file),"utf8");
 assert.match(html,/<script src="\.\/finance-core\.js\?v=\d+"><\/script>/,"shared module missing in "+file);
 const match=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.ok(match.length,"inline application script missing from "+file);
 for(const [_,js] of match)new vm.Script(js,{filename:file});
 assert.match(html,/MFCFinance\.debtState\(/,"shared debt source missing in "+file);
}
const account=fs.readFileSync(path.join(root,"bank-accounts.html"),"utf8");
assert.match(account,/userVerified:true/,"credit-balance interpretation requires user validation");
assert.match(account,/snapshotDecision\(/,"older snapshot protection missing");
const intelligence=fs.readFileSync(path.join(root,"financial-intelligence.html"),"utf8");
assert.match(intelligence,/debts\.cardPayment/,"future card payment not derived from verified engine");
console.log("PASS: three pages parse, share financial engine, and expose validation controls");
