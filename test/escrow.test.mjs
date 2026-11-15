import fs from 'node:fs';
import assert from 'node:assert/strict';
import solc from 'solc';
import ganache from 'ganache';
import { BrowserProvider, ContractFactory, parseEther, ZeroAddress } from 'ethers';

const read = p => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
const helper = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;
interface IE {
 function submitWork(uint256,string calldata) external;
 function raiseDispute(uint256,string calldata,string calldata) external;
 function resolveDispute(uint256,uint8,string calldata) external;
}
contract Recipient {
 IE public escrow; uint256 public jobId; uint256 public calls; bool public reentered; bool public reject;
 constructor(address e) {escrow=IE(e);}
 function setup(uint256 id,bool r) external {jobId=id;reject=r;}
 function submit() external {escrow.submitWork(jobId,"ipfs://proof");}
 receive() external payable {
  require(!reject,"reject payment"); calls++;
  (reentered,)=address(escrow).call(abi.encodeWithSignature("resolveDispute(uint256,uint8,string)",jobId,uint8(0),"again"));
 }
}
contract ReentrantAdmin {
 address public escrow; uint256 public attempts; bool public succeeded;
 function deploy(bytes memory code) external returns(address deployed) {
  assembly { deployed := create(0,add(code,32),mload(code)) }
  require(deployed != address(0)); escrow=deployed;
 }
 function resolve(uint256 id) external { IE(escrow).resolveDispute(id,0,"decision"); }
 function attack(uint256 id) external {
  attempts++;
  (succeeded,)=escrow.call(abi.encodeWithSignature("resolveDispute(uint256,uint8,string)",id,uint8(0),"again"));
 }
}
contract CallbackRecipient {
 ReentrantAdmin public controller; IE public escrow; uint256 public jobId;
 constructor(address c,address e){controller=ReentrantAdmin(c);escrow=IE(e);}
 function setup(uint256 id) external {jobId=id;}
 receive() external payable {controller.attack(jobId);}
}`;
const input = {language:'Solidity',sources:{'FreelanceEscrow.sol':{content:read('contracts/FreelanceEscrow.sol')},'Helpers.sol':{content:helper}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}};
const result = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (result.errors || []).filter(e=>e.severity==='error');
assert.equal(errors.length,0,errors.map(e=>e.formattedMessage).join('\n'));
const artifact = result.contracts['FreelanceEscrow.sol'].FreelanceEscrow;
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/FreelanceEscrow.json',JSON.stringify({compiler:solc.version(),optimizer:{enabled:true,runs:200},evmVersion:'shanghai',abi:artifact.abi,bytecode:'0x'+artifact.evm.bytecode.object},null,2));
const rpc = ganache.provider({logging:{quiet:true},wallet:{totalAccounts:5},chain:{hardfork:'shanghai'}});
const provider = new BrowserProvider(rpc,undefined,{cacheTimeout:-1});
provider.pollingInterval=10;
const [admin,employer,freelancer,outsider] = await Promise.all([0,1,2,3].map(i=>provider.getSigner(i)));
const [a,e,f,o] = await Promise.all([admin,employer,freelancer,outsider].map(s=>s.getAddress()));
const deploy = async (art,signer,args=[]) => {const c=await new ContractFactory(art.abi,'0x'+art.evm.bytecode.object,signer).deploy(...args);await c.waitForDeployment();return c;};
const c = await deploy(artifact,admin);
const ce=c.connect(employer), cf=c.connect(freelancer), co=c.connect(outsider);
const amount=parseEther('0.01');
const tx=async p=> (await p).wait();
let checks=0; const log=[];
async function check(name,fn){await fn();checks++;log.push('PASS '+name);console.log(log.at(-1));}
async function rejects(fn){await assert.rejects(async()=>{const r=await fn(); if(r?.wait) await r.wait();});}
async function create(recipient=f, value=amount){const block=await provider.getBlock('latest');await tx(ce.createJob('Website','Three responsive pages',value,block.timestamp+3600,recipient));return await c.jobCount();}
const fund=id=>tx(ce.depositPayment(id,{value:amount}));
const balance=address=>provider.getBalance(address);
try {
 await check('Deployer is admin',async()=>assert.equal(await c.admin(),a));
 await check('Reject invalid jobs and unknown IDs',async()=>{
  const future=(await provider.getBlock('latest')).timestamp+3600;
  for(const args of [['','desc',amount,future,f],['x','',amount,future,f],['x','d',0,future,f],['x','d',amount,1,f],['x','d',amount,future,ZeroAddress],['x','d',amount,future,e],['x','d',amount,future,a]]) await rejects(()=>ce.createJob(...args));
  await rejects(()=>c.createJob('x','d',amount,future,f));
  await rejects(()=>c.getJob(0)); await rejects(()=>c.getJob(999));
 });
 const id=await create();
 await check('Creation records agreement without funding',async()=>{const j=await c.getJob(id);assert.equal(j.employer,e);assert.equal(j.freelancer,f);assert.equal(j.amount,amount);assert.equal(j.status,0n);assert.equal(j.escrowBalance,0n);});
 await check('Reject unauthorized and incorrect deposits',async()=>{await rejects(()=>co.depositPayment(id,{value:amount}));await rejects(()=>ce.depositPayment(id,{value:amount-1n}));await rejects(()=>ce.depositPayment(id,{value:amount+1n}));});
 await check('Reject submission, approval and dispute before funding',async()=>{await rejects(()=>cf.submitWork(id,'proof'));await rejects(()=>ce.approveAndRelease(id));await rejects(()=>ce.raiseDispute(id,'reason',''));});
 await fund(id);
 await check('Funding locks exact amount and rejects repeat deposit',async()=>{assert.equal((await c.getJob(id)).escrowBalance,amount);assert.equal(await c.totalEscrow(),amount);await rejects(()=>ce.depositPayment(id,{value:amount}));});
 await check('Reject wrong sender, empty evidence and premature approval',async()=>{await rejects(()=>co.submitWork(id,'proof'));await rejects(()=>cf.submitWork(id,''));await rejects(()=>ce.approveAndRelease(id));await rejects(()=>co.raiseDispute(id,'reason',''));});
 await tx(cf.submitWork(id,'https://example.com/work'));
 await check('Submission records evidence and timestamp',async()=>{const j=await c.getJob(id);assert.equal(j.status,2n);assert.ok(j.submittedAt>0n);assert.equal(j.workReference,'https://example.com/work');await rejects(()=>cf.submitWork(id,'replacement'));await rejects(()=>co.approveAndRelease(id));});
 await check('Approval pays exactly once and emits payment event',async()=>{const before=await balance(f);const receipt=await tx(ce.approveAndRelease(id));assert.equal(await balance(f)-before,amount);assert.equal((await c.getJob(id)).status,4n);assert.equal((await c.getJob(id)).escrowBalance,0n);assert.equal(await c.totalEscrow(),0n);assert.ok(receipt.logs.some(l=>{try{return c.interface.parseLog(l)?.name==='PaymentReleased';}catch{return false;}}));});
 await check('Reject duplicate release/refund and post-completion disputes',async()=>{await rejects(()=>ce.approveAndRelease(id));await rejects(()=>c.resolveDispute(id,1,'refund'));await rejects(()=>cf.raiseDispute(id,'reason',''));});
 const refundId=await create(); await fund(refundId);
 await check('Admin cannot settle a non-disputed job',async()=>rejects(()=>c.resolveDispute(refundId,1,'refund')));
 await tx(ce.raiseDispute(refundId,'No delivery','https://example.com/evidence'));
 await check('Dispute freezes normal workflow and allows both parties evidence',async()=>{await rejects(()=>cf.submitWork(refundId,'proof'));await rejects(()=>ce.approveAndRelease(refundId));await rejects(()=>co.resolveDispute(refundId,1,'refund'));await tx(cf.addDisputeEvidence(refundId,'freelancer response'));await tx(ce.addDisputeEvidence(refundId,'employer response'));await rejects(()=>co.addDisputeEvidence(refundId,'outsider'));});
 await check('Admin refund pays employer and prevents repeat settlement',async()=>{const before=await balance(e);await tx(c.resolveDispute(refundId,1,'Non-delivery confirmed'));assert.equal(await balance(e)-before,amount);assert.equal((await c.getJob(refundId)).status,5n);await rejects(()=>c.resolveDispute(refundId,1,'again'));});
 const payId=await create();await fund(payId);await tx(cf.submitWork(payId,'proof'));await tx(cf.raiseDispute(payId,'Approval delayed',''));
 await check('Freelancer dispute can result in full payment',async()=>{await rejects(()=>c.resolveDispute(payId,0,''));const before=await balance(f);await tx(c.resolveDispute(payId,0,'Work meets agreement'));assert.equal(await balance(f)-before,amount);assert.equal((await c.getJob(payId)).resolutionReason,'Work meets agreement');});
 const one=await create(),two=await create();await fund(one);await fund(two);
 await check('Concurrent jobs maintain separate balances',async()=>{await tx(cf.submitWork(one,'proof'));await tx(ce.approveAndRelease(one));assert.equal((await c.getJob(two)).escrowBalance,amount);assert.equal(await c.totalEscrow(),amount);assert.equal(await balance(await c.getAddress()),amount);});
 await check('Late submissions allowed; no timed automatic release',async()=>{await rpc.request({method:'evm_increaseTime',params:[7200]});await rpc.request({method:'evm_mine',params:[]});assert.equal((await c.getJob(two)).status,1n);await tx(cf.submitWork(two,'late proof'));assert.ok((await c.getJob(two)).submittedAt>(await c.getJob(two)).deadline);await tx(ce.approveAndRelease(two));});
 await check('Direct ETH transfers are rejected',async()=>rejects(()=>employer.sendTransaction({to:c.target,value:1n})));
 const recipient=await deploy(result.contracts['Helpers.sol'].Recipient,outsider,[c.target]);
 const failedId=await create(recipient.target);await fund(failedId);await tx(recipient.setup(failedId,true));await tx(recipient.submit());
 await check('Failed transfer rolls back status and escrow',async()=>{await rejects(()=>ce.approveAndRelease(failedId,{gasLimit:500000}));const j=await c.getJob(failedId);assert.equal(j.status,2n);assert.equal(j.escrowBalance,amount);assert.equal(await c.totalEscrow(),amount);});
 await tx(recipient.setup(failedId,false));await tx(ce.approveAndRelease(failedId));
 await check('Retry after recipient accepts pays once',async()=>{assert.equal(await recipient.calls(),1n);assert.equal(await recipient.reentered(),false);assert.equal(await c.totalEscrow(),0n);});
 await check('Authorized callback cannot reenter settlement',async()=>{
  const controller=await deploy(result.contracts['Helpers.sol'].ReentrantAdmin,outsider);
  await tx(controller.deploy('0x'+artifact.evm.bytecode.object));
  const target=new (await import('ethers')).Contract(await controller.escrow(),artifact.abi,employer);
  const receiver=await deploy(result.contracts['Helpers.sol'].CallbackRecipient,outsider,[controller.target,target.target]);
  const now=(await provider.getBlock('latest')).timestamp;
  await tx(target.createJob('Attack test','Callback test',amount,now+3600,receiver.target));
  await tx(receiver.setup(1));await tx(target.depositPayment(1,{value:amount}));await tx(target.raiseDispute(1,'test',''));
  await tx(controller.resolve(1));assert.equal(await controller.attempts(),1n);assert.equal(await controller.succeeded(),false);assert.equal((await target.getJob(1)).status,4n);assert.equal(await balance(receiver.target),amount);
 });
 await check('History can be reconstructed from event logs',async()=>{const events=await c.queryFilter(c.filters.JobCreated(),0,'latest');assert.equal(BigInt(events.length),await c.jobCount());assert.ok(events.every(event=>/^0x[0-9a-f]{64}$/i.test(event.transactionHash)));});
 fs.writeFileSync('TEST-RESULTS.txt',`Local EVM verification (not Sepolia deployment)\nCompiler: ${solc.version()}\nEVM: Shanghai; optimizer: 200 runs\n${log.join('\n')}\n\n${checks} test groups passed.\n`);
 console.log(`\n${checks} test groups passed.`);
} finally {await rpc.disconnect();}
