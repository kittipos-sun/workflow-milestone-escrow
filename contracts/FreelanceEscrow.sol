// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/// @title Freelance escrow for a Sepolia classroom demonstration.
/// @notice No fees or partial payouts. Public data must not contain secrets.
contract FreelanceEscrow {
    enum Status { Created, Funded, Submitted, Disputed, Completed, Refunded }
    enum Decision { PayFreelancer, RefundEmployer }

    struct Job {
        address employer;
        address freelancer;
        string title;
        string description;
        uint256 amount;
        uint256 deadline;
        Status status;
        uint256 escrowBalance;
        string workReference;
        uint256 submittedAt;
        string disputeReason;
        string disputeEvidence;
        address disputeOpenedBy;
        string resolutionReason;
    }

    address public immutable admin;
    uint256 public jobCount;
    uint256 public totalEscrow;
    mapping(uint256 => Job) private jobs;
    uint256 private unlocked = 1;

    event JobCreated(uint256 indexed jobId, address indexed employer, address indexed freelancer, uint256 amount, uint256 deadline);
    event PaymentDeposited(uint256 indexed jobId, address indexed employer, uint256 amount);
    event WorkSubmitted(uint256 indexed jobId, address indexed freelancer, string workReference);
    event DisputeRaised(uint256 indexed jobId, address indexed openedBy, string reason, string evidence);
    event DisputeEvidenceAdded(uint256 indexed jobId, address indexed submittedBy, string evidence);
    event DisputeResolved(uint256 indexed jobId, Decision decision, string reason);
    event PaymentReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount);
    event PaymentRefunded(uint256 indexed jobId, address indexed employer, uint256 amount);

    modifier nonReentrant() {
        require(unlocked == 1, "Reentrant call");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor() { admin = msg.sender; }

    function createJob(
        string calldata title,
        string calldata description,
        uint256 amount,
        uint256 deadline,
        address freelancer
    ) external returns (uint256 jobId) {
        require(msg.sender != admin && freelancer != admin, "Admin cannot be a party");
        require(freelancer != address(0) && freelancer != msg.sender && freelancer != address(this), "Invalid freelancer");
        _checkText(title, 200);
        _checkText(description, 4000);
        require(amount > 0, "Zero amount");
        require(deadline > block.timestamp, "Deadline must be future");
        jobId = ++jobCount;
        Job storage job = jobs[jobId];
        job.employer = msg.sender;
        job.freelancer = freelancer;
        job.title = title;
        job.description = description;
        job.amount = amount;
        job.deadline = deadline;
        emit JobCreated(jobId, msg.sender, freelancer, amount, deadline);
    }

    function depositPayment(uint256 jobId) external payable nonReentrant {
        Job storage job = _job(jobId);
        require(msg.sender == job.employer, "Only employer");
        require(job.status == Status.Created, "Invalid status");
        require(msg.value == job.amount, "Incorrect payment");
        job.status = Status.Funded;
        job.escrowBalance = msg.value;
        totalEscrow += msg.value;
        emit PaymentDeposited(jobId, msg.sender, msg.value);
    }

    /// @notice Late submissions are allowed until a dispute is opened.
    function submitWork(uint256 jobId, string calldata workRef) external {
        Job storage job = _job(jobId);
        require(msg.sender == job.freelancer, "Only freelancer");
        require(job.status == Status.Funded, "Invalid status");
        _checkText(workRef, 2000);
        job.workReference = workRef;
        job.submittedAt = block.timestamp;
        job.status = Status.Submitted;
        emit WorkSubmitted(jobId, msg.sender, workRef);
    }

    function approveAndRelease(uint256 jobId) external nonReentrant {
        Job storage job = _job(jobId);
        require(msg.sender == job.employer, "Only employer");
        require(job.status == Status.Submitted, "Invalid status");
        _settle(jobId, job, true);
    }

    function raiseDispute(uint256 jobId, string calldata reason, string calldata evidence) external {
        Job storage job = _job(jobId);
        _onlyParty(job);
        require(job.status == Status.Funded || job.status == Status.Submitted, "Invalid status");
        _checkText(reason, 2000);
        require(bytes(evidence).length <= 2000, "Evidence too long");
        job.disputeReason = reason;
        job.disputeEvidence = evidence;
        job.disputeOpenedBy = msg.sender;
        job.status = Status.Disputed;
        emit DisputeRaised(jobId, msg.sender, reason, evidence);
    }

    /// @notice Both parties can append evidence while disputed. Read it from logs.
    function addDisputeEvidence(uint256 jobId, string calldata evidence) external {
        Job storage job = _job(jobId);
        _onlyParty(job);
        require(job.status == Status.Disputed, "Invalid status");
        _checkText(evidence, 2000);
        emit DisputeEvidenceAdded(jobId, msg.sender, evidence);
    }

    function resolveDispute(uint256 jobId, Decision decision, string calldata reason) external nonReentrant {
        require(msg.sender == admin, "Only admin");
        Job storage job = _job(jobId);
        require(job.status == Status.Disputed, "Invalid status");
        _checkText(reason, 2000);
        job.resolutionReason = reason;
        emit DisputeResolved(jobId, decision, reason);
        _settle(jobId, job, decision == Decision.PayFreelancer);
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return _job(jobId);
    }

    function _job(uint256 jobId) private view returns (Job storage) {
        require(jobId > 0 && jobId <= jobCount, "Unknown job");
        return jobs[jobId];
    }

    function _onlyParty(Job storage job) private view {
        require(msg.sender == job.employer || msg.sender == job.freelancer, "Only job parties");
    }

    function _checkText(string calldata value, uint256 maxBytes) private pure {
        require(bytes(value).length > 0 && bytes(value).length <= maxBytes, "Invalid text length");
    }

    function _settle(uint256 jobId, Job storage job, bool payFreelancer) private {
        uint256 amount = job.escrowBalance;
        require(amount > 0 && amount == job.amount, "Invalid escrow");
        address recipient = payFreelancer ? job.freelancer : job.employer;
        job.escrowBalance = 0;
        totalEscrow -= amount;
        job.status = payFreelancer ? Status.Completed : Status.Refunded;
        (bool success,) = payable(recipient).call{value: amount}("");
        require(success, "Transfer failed");
        if (payFreelancer) emit PaymentReleased(jobId, recipient, amount);
        else emit PaymentRefunded(jobId, recipient, amount);
    }
    // No receive/fallback: use depositPayment; there is no arbitrary admin withdrawal.
}

