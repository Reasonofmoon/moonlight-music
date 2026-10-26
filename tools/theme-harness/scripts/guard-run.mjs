#!/usr/bin/env node
// Fixed typed adapters only. No arbitrary command or caller-selected gate.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { checkProject } from './gate.mjs';
export const ACTIONS=Object.freeze({'generate-keyframes':Object.freeze({gate:'mv',command:'keyframes'}),'generate-clips':Object.freeze({gate:'clips',command:'clips'})});
export function parseAction(args){const file=args.shift();if(!file||file.startsWith('--'))throw Error('Need project.json');let action=null,shots=null,execute=false;for(let i=0;i<args.length;i++){const k=args[i];if(k==='--action'&&action===null)action=args[++i];else if(k==='--shots'&&shots===null)shots=args[++i];else if(k==='--execute'&&!execute)execute=true;else throw Error('Unknown/duplicate flag or arbitrary command: '+k)}if(!ACTIONS[action])throw Error('Unknown typed action');if(shots!==null&&!/^\d+(,\d+)*$/.test(shots))throw Error('Invalid shot list');return{file,action,shots:shots===null?null:shots.split(',').map(Number),execute}}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export async function validateAdapter(projectFile,action,only){
 if(!ACTIONS[action])throw Error('Unknown typed action');
 const root=path.dirname(path.resolve(projectFile)),base=await fs.realpath(root),p=JSON.parse(await fs.readFile(projectFile,'utf8')),assets=new Map(p.assets.map(a=>[a.id,a]));
 const load=async(id,type)=>{const a=assets.get(id);if(!a||a.type!==type||path.isAbsolute(a.path))throw Error('Adapter asset missing/type mismatch: '+id);const real=await fs.realpath(path.resolve(root,a.path));if(!real.startsWith(base+path.sep))throw Error('Adapter path escapes project');const bytes=await fs.readFile(real);if(hash(bytes)!==a.sha256)throw Error('Adapter file changed: '+id);return{a,real,data:JSON.parse(bytes)}};
 const config=await load(p.mv.configId,'mv-config'),production=await load(p.mv.productionShotsId,'production-shots'),plan=await load(p.mv.shotPlanId,'shot-plan');
 if(path.basename(config.real)!=='mv.json'||production.real!==path.join(path.dirname(config.real),'shots.json'))throw Error('Fixed helper must read exact sealed mv.json/shots.json');
 if(!Array.isArray(production.data)||production.data.length!==plan.data.shots.length)throw Error('Production shot set differs from reviewed plan');
 const seen=new Set();for(const s of production.data){const approved=plan.data.shots.find(x=>x.id===s.id);if(!approved||!Number.isInteger(s.n)||s.n<1||seen.has(s.n)||s.from!==approved.start||s.to!==approved.end||s.cueId!==approved.cueId||s.continuityId!==approved.continuityId||!s.img||!s.vid)throw Error('Production timing/cue/prompts mismatch: '+s.id);seen.add(s.n)}
 const selected=only||[...seen].sort((a,b)=>a-b);if(selected.some(n=>!seen.has(n))||new Set(selected).size!==selected.length)throw Error('Unplanned/duplicate requested shot');
 const stage=ACTIONS[action].gate,expected={name:action,shotNumbers:[...selected].sort((a,b)=>a-b),configSha256:config.a.sha256,shotsSha256:production.a.sha256};
 const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;if(JSON.stringify(canon(p.spend[stage].action))!==JSON.stringify(canon(expected)))throw Error('Exact batch/config not covered by spend action');
 const records=[await load(p.mv.directionReviewId,'review')];if(action==='generate-clips')records.push(await load(p.approvals.style,'approval'));
 for(const r of records)for(const a of [config.a,production.a])if(r.data.targets?.[a.id]!==a.sha256||r.data.bindings?.[a.id]?.sha256!==a.sha256)throw Error('Review does not bind actual production inputs');
 return{helper:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../suno-musicvideo/scripts/hf-generate.js'),work:path.dirname(config.real),shots:selected,subcommand:ACTIONS[action].command};
}
export async function main(args){let o;try{o=parseAction([...args])}catch(e){console.error(e.message);return 64}const report=await checkProject(o.file,ACTIONS[o.action].gate);if(report.decision!=='PASS'){console.log(JSON.stringify({action:o.action,...report},null,2));return report.decision==='FAIL'?1:2}let a;try{a=await validateAdapter(o.file,o.action,o.shots)}catch(e){console.log(JSON.stringify({action:o.action,decision:'BLOCKED',stageReport:report,adapterIssue:e.message},null,2));return 2}console.log(JSON.stringify({action:o.action,...report,adapterValidated:true},null,2));if(!o.execute){console.log('Preflight only. No command executed.');return 0}const child=spawn(process.execPath,[a.helper,a.subcommand,a.work,a.shots.join(',')],{shell:false,stdio:'inherit'});return await new Promise(resolve=>{child.on('error',e=>{console.error(e.message);resolve(1)});child.on('exit',code=>resolve(Number.isInteger(code)?code:1))})}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main(process.argv.slice(2));
