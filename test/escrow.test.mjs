import fs from 'node:fs';
import assert from 'node:assert/strict';
import solc from 'solc';
import ganache from 'ganache';
import { BrowserProvider, ContractFactory, parseEther, ZeroAddress } from 'ethers';

const source = fs.readFileSync('contracts/FreelanceEscrow.sol', 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'FreelanceEscrow.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'shanghai',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors || []).filter((error) => error.severity === 'error');
assert.equal(errors.length, 0, errors.map((error) => error.formattedMessage).join('\n'));
const artifact = output.contracts['FreelanceEscrow.sol'].FreelanceEscrow;
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/FreelanceEscrow.json', JSON.stringify({
  compiler: solc.version(),
  optimizer: { enabled: true, runs: 200 },
  evmVersion: 'shanghai',
  abi: artifact.abi,
  bytecode: `0x${artifact.evm.bytecode.object}`,
}, null, 2));

const rpc = ganache.provider({ logging: { quiet: true }, wallet: { totalAccounts: 4 }, chain: { hardfork: 'shanghai' } });
const provider = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
provider.pollingInterval = 10;
const [admin, employer, freelancer, outsider] = await Promise.all([0, 1, 2, 3].map((index) => provider.getSigner(index)));
const [adminAddress, employerAddress, freelancerAddress] = await Promise.all([admin, employer, freelancer].map((signer) => signer.getAddress()));
const contract = await new ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, admin).deploy();
await contract.waitForDeployment();
const employerContract = contract.connect(employer);
const freelancerContract = contract.connect(freelancer);
const outsiderContract = contract.connect(outsider);
const amount1 = parseEther('0.01');
const amount2 = parseEther('0.02');
const send = async (promise) => (await promise).wait();
const rejects = (callback) => assert.rejects(async () => {
  const response = await callback();
  if (response?.wait) await response.wait();
});
const latestDeadline = async (offset = 3600) => (await provider.getBlock('latest')).timestamp + offset;
const createJob = async (milestones = undefined) => {
  const due = await latestDeadline();
  const inputs = milestones || [
    { title: 'Wireframe', description: 'Homepage prototype', amount: amount1, deadline: BigInt(due) },
    { title: 'Frontend', description: 'Responsive preview', amount: amount2, deadline: BigInt(due + 3600) },
  ];
  const tx = await employerContract.createJob('Bike shop website', 'Build a responsive site', freelancerAddress, inputs);
  await tx.wait();
  return contract.jobCount();
};
const check = async (name, callback) => {
  await callback();
  console.log(`PASS ${name}`);
};

try {
  await check('compile and deploy; deployer is the immutable admin', async () => {
    assert.equal(await contract.admin(), adminAddress);
    assert.equal(await contract.MAX_MILESTONES(), 5n);
  });

  await check('enforce 2-5 milestones and reject invalid parties or amounts', async () => {
    const due = BigInt(await latestDeadline());
    const one = [{ title: 'Only one', description: 'x', amount: 1n, deadline: due }];
    await rejects(() => employerContract.createJob('x', 'y', freelancerAddress, one));
    const six = Array.from({ length: 6 }, (_, index) => ({ title: `m${index}`, description: 'x', amount: 1n, deadline: due }));
    await rejects(() => employerContract.createJob('x', 'y', freelancerAddress, six));
    const invalid = [{ title: 'x', description: 'y', amount: 0n, deadline: due }, { title: 'z', description: 'q', amount: 1n, deadline: due }];
    await rejects(() => employerContract.createJob('x', 'y', freelancerAddress, invalid));
    await rejects(() => employerContract.createJob('x', 'y', employerAddress, invalid.map((item) => ({ ...item, amount: 1n }))));
    await rejects(() => admin.createJob('x', 'y', freelancerAddress, invalid.map((item) => ({ ...item, amount: 1n }))));
    await rejects(() => employerContract.createJob('x', 'y', ZeroAddress, invalid.map((item) => ({ ...item, amount: 1n }))));
  });

  const jobId = await createJob();
  await check('store job summary and immutable milestone details', async () => {
    const job = await contract.getJob(jobId);
    const first = await contract.getMilestone(jobId, 1);
    const second = await contract.getMilestone(jobId, 2);
    assert.equal(job.employer, employerAddress);
    assert.equal(job.freelancer, freelancerAddress);
    assert.equal(job.totalAmount, amount1 + amount2);
    assert.equal(job.milestoneCount, 2n);
    assert.equal(first.title, 'Wireframe');
    assert.equal(first.status, 0n);
    assert.equal(second.amount, amount2);
    assert.equal(await contract.getJobStatus(jobId), 1n);
    await rejects(() => contract.getMilestone(jobId, 3));
  });

  await check('only employer can deposit the exact amount for a milestone', async () => {
    await rejects(() => freelancerContract.depositMilestonePayment(jobId, 1, { value: amount1 }));
    await rejects(() => outsiderContract.depositMilestonePayment(jobId, 1, { value: amount1 }));
    await rejects(() => employerContract.depositMilestonePayment(jobId, 1, { value: amount1 - 1n }));
    await rejects(() => employerContract.depositMilestonePayment(jobId, 1, { value: amount1 + 1n }));
  });

  await send(employerContract.depositMilestonePayment(jobId, 1, { value: amount1 }));
  await check('deposit and submit one milestone without changing the next', async () => {
    assert.equal((await contract.getMilestone(jobId, 1)).status, 1n);
    assert.equal((await contract.getMilestone(jobId, 2)).status, 0n);
    assert.equal(await contract.totalEscrow(), amount1);
    await rejects(() => employerContract.depositMilestonePayment(jobId, 1, { value: amount1 }));
    await rejects(() => outsiderContract.submitMilestoneWork(jobId, 1, 'https://example.com/proof'));
    await rejects(() => freelancerContract.submitMilestoneWork(jobId, 1, ''));
    await send(freelancerContract.submitMilestoneWork(jobId, 1, 'https://example.com/wireframe'));
    const milestone = await contract.getMilestone(jobId, 1);
    assert.equal(milestone.status, 2n);
    assert.equal(milestone.workReference, 'https://example.com/wireframe');
    assert.ok(milestone.submittedAt > 0n);
  });

  await check('employer approval transfers only that milestone once', async () => {
    const before = await provider.getBalance(freelancerAddress);
    await send(employerContract.approveMilestoneAndRelease(jobId, 1));
    assert.equal((await provider.getBalance(freelancerAddress)) - before, amount1);
    assert.equal((await contract.getMilestone(jobId, 1)).status, 4n);
    assert.equal((await contract.getMilestone(jobId, 2)).status, 0n);
    assert.equal(await contract.totalEscrow(), 0n);
    assert.equal(await contract.getJobStatus(jobId), 1n);
    await rejects(() => employerContract.approveMilestoneAndRelease(jobId, 1));
  });

  await send(employerContract.depositMilestonePayment(jobId, 2, { value: amount2 }));
  await send(employerContract.raiseMilestoneDispute(jobId, 2, 'Scope disagreement', 'https://example.com/brief'));
  await check('dispute is milestone-scoped; only admin resolves; refund returns that amount', async () => {
    assert.equal(await contract.getJobStatus(jobId), 2n);
    await rejects(() => outsiderContract.resolveMilestoneDispute(jobId, 2, 1, 'refund'));
    await send(freelancerContract.addMilestoneDisputeEvidence(jobId, 2, 'https://example.com/reply'));
    const before = await provider.getBalance(employerAddress);
    await send(contract.resolveMilestoneDispute(jobId, 2, 1, 'Deliverable not submitted'));
    assert.equal((await provider.getBalance(employerAddress)) - before, amount2);
    assert.equal((await contract.getMilestone(jobId, 2)).status, 5n);
    assert.equal((await contract.getMilestone(jobId, 1)).status, 4n);
    assert.equal(await contract.totalEscrow(), 0n);
    assert.equal(await contract.getJobStatus(jobId), 4n);
  });

  const releaseId = await createJob();
  await send(employerContract.depositMilestonePayment(releaseId, 1, { value: amount1 }));
  await send(freelancerContract.submitMilestoneWork(releaseId, 1, 'ipfs://milestone-proof'));
  await send(freelancerContract.raiseMilestoneDispute(releaseId, 1, 'Approval delayed', ''));
  await check('admin can resolve a dispute in favor of freelancer; all-paid job completes', async () => {
    await send(contract.resolveMilestoneDispute(releaseId, 1, 0, 'Work matches agreement'));
    const milestone = await contract.getMilestone(releaseId, 1);
    assert.equal(milestone.status, 4n);
    assert.equal(milestone.resolutionReason, 'Work matches agreement');
    assert.equal(await contract.getJobStatus(releaseId), 1n);
    await send(employerContract.depositMilestonePayment(releaseId, 2, { value: amount2 }));
    await send(freelancerContract.submitMilestoneWork(releaseId, 2, 'ipfs://final-proof'));
    await send(employerContract.approveMilestoneAndRelease(releaseId, 2));
    assert.equal(await contract.getJobStatus(releaseId), 3n);
  });

  await check('reject direct ETH transfers and preserve event identifiers', async () => {
    await rejects(() => employer.sendTransaction({ to: contract.target, value: 1n }));
    const created = await contract.queryFilter(contract.filters.MilestoneCreated(), 0, 'latest');
    assert.equal(created.length, 4);
    assert.ok(created.every((event) => event.args.milestoneId > 0n));
  });

  console.log('\nAll milestone escrow checks passed.');
} finally {
  await rpc.disconnect();
}
