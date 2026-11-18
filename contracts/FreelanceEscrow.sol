// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/// @title Milestone-based freelance escrow for Sepolia classroom demonstrations.
/// @notice Public chain data must not contain passwords, private files, or other secrets.
contract FreelanceEscrow {
    uint256 public constant MAX_MILESTONES = 5;
    uint256 private constant MAX_TEXT_BYTES = 4000;
    uint256 private constant MAX_REFERENCE_BYTES = 2000;

    enum MilestoneStatus { Created, Funded, Submitted, Disputed, Completed, Refunded }
    enum Decision { PayFreelancer, RefundEmployer }

    struct MilestoneInput { string title; string description; uint256 amount; uint256 deadline; }
    struct Milestone {
        string title; string description; uint256 amount; uint256 deadline;
        MilestoneStatus status; uint256 escrowBalance; string workReference;
        uint256 submittedAt; string disputeReason; string disputeEvidence;
        address disputeOpenedBy; string resolutionReason;
    }
    struct Job {
        address employer; address freelancer; string title; string description;
        uint256 totalAmount; uint256 milestoneCount; uint256 completedCount;
        uint256 refundedCount; bool hasOpenDispute;
    }

    address public immutable admin;
    uint256 public jobCount;
    uint256 public totalEscrow;
    mapping(uint256 => Job) private jobs;
    mapping(uint256 => mapping(uint256 => Milestone)) private milestones;
    uint256 private unlocked = 1;

    event JobCreated(uint256 indexed jobId, address indexed employer, address indexed freelancer, uint256 totalAmount, uint256 milestoneCount);
    event MilestoneCreated(uint256 indexed jobId, uint256 indexed milestoneId, string title, uint256 amount, uint256 deadline);
    event PaymentDeposited(uint256 indexed jobId, uint256 indexed milestoneId, address indexed employer, uint256 amount);
    event WorkSubmitted(uint256 indexed jobId, uint256 indexed milestoneId, address indexed freelancer, string workReference);
    event DisputeRaised(uint256 indexed jobId, uint256 indexed milestoneId, address indexed openedBy, string reason, string evidence);
    event DisputeEvidenceAdded(uint256 indexed jobId, uint256 indexed milestoneId, address indexed submittedBy, string evidence);
    event DisputeResolved(uint256 indexed jobId, uint256 indexed milestoneId, Decision decision, string reason);
    event MilestonePaymentReleased(uint256 indexed jobId, uint256 indexed milestoneId, address indexed freelancer, uint256 amount);
    event MilestonePaymentRefunded(uint256 indexed jobId, uint256 indexed milestoneId, address indexed employer, uint256 amount);

    modifier nonReentrant() {
        require(unlocked == 1, "Reentrant call");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor() { admin = msg.sender; }

    /// @notice Creates an immutable job with 2-5 milestones. Amounts are in wei.
    function createJob(string calldata title, string calldata description, address freelancer, MilestoneInput[] calldata inputs)
        external returns (uint256 jobId)
    {
        require(msg.sender != admin && freelancer != admin, "Admin cannot be a party");
        require(freelancer != address(0) && freelancer != msg.sender && freelancer != address(this), "Invalid freelancer");
        _checkText(title, 200);
        _checkText(description, MAX_TEXT_BYTES);
        require(inputs.length >= 2 && inputs.length <= MAX_MILESTONES, "Milestones must be 2-5");

        uint256 totalAmount;
        for (uint256 i; i < inputs.length; ++i) {
            _checkText(inputs[i].title, 200);
            _checkText(inputs[i].description, MAX_TEXT_BYTES);
            require(inputs[i].amount > 0, "Zero milestone amount");
            require(inputs[i].deadline > block.timestamp, "Deadline must be future");
            totalAmount += inputs[i].amount;
        }

        jobId = ++jobCount;
        Job storage job = jobs[jobId];
        job.employer = msg.sender;
        job.freelancer = freelancer;
        job.title = title;
        job.description = description;
        job.totalAmount = totalAmount;
        job.milestoneCount = inputs.length;

        for (uint256 i; i < inputs.length; ++i) {
            MilestoneInput calldata input = inputs[i];
            Milestone storage milestone = milestones[jobId][i + 1];
            milestone.title = input.title;
            milestone.description = input.description;
            milestone.amount = input.amount;
            milestone.deadline = input.deadline;
            emit MilestoneCreated(jobId, i + 1, input.title, input.amount, input.deadline);
        }
        emit JobCreated(jobId, msg.sender, freelancer, totalAmount, inputs.length);
    }

    /// @notice Employer deposits exactly one milestone's amount at a time.
    function depositMilestonePayment(uint256 jobId, uint256 milestoneId) external payable nonReentrant {
        Job storage job = _job(jobId);
        Milestone storage milestone = _milestone(jobId, milestoneId);
        require(msg.sender == job.employer, "Only employer");
        require(milestone.status == MilestoneStatus.Created, "Invalid status");
        require(msg.value == milestone.amount, "Incorrect payment");
        milestone.status = MilestoneStatus.Funded;
        milestone.escrowBalance = msg.value;
        totalEscrow += msg.value;
        emit PaymentDeposited(jobId, milestoneId, msg.sender, msg.value);
    }

    /// @notice Late submissions are allowed until a dispute is opened.
    function submitMilestoneWork(uint256 jobId, uint256 milestoneId, string calldata workReference) external {
        Job storage job = _job(jobId);
        Milestone storage milestone = _milestone(jobId, milestoneId);
        require(msg.sender == job.freelancer, "Only freelancer");
        require(milestone.status == MilestoneStatus.Funded, "Invalid status");
        _checkText(workReference, MAX_REFERENCE_BYTES);
        milestone.workReference = workReference;
        milestone.submittedAt = block.timestamp;
        milestone.status = MilestoneStatus.Submitted;
        emit WorkSubmitted(jobId, milestoneId, msg.sender, workReference);
    }

    function approveMilestoneAndRelease(uint256 jobId, uint256 milestoneId) external nonReentrant {
        Job storage job = _job(jobId);
        Milestone storage milestone = _milestone(jobId, milestoneId);
        require(msg.sender == job.employer, "Only employer");
        require(milestone.status == MilestoneStatus.Submitted, "Invalid status");
        _settle(jobId, milestoneId, job, milestone, true);
    }

    function raiseMilestoneDispute(uint256 jobId, uint256 milestoneId, string calldata reason, string calldata evidence) external {
        Job storage job = _job(jobId);
        Milestone storage milestone = _milestone(jobId, milestoneId);
        _onlyParty(job);
        require(milestone.status == MilestoneStatus.Funded || milestone.status == MilestoneStatus.Submitted, "Invalid status");
        _checkText(reason, MAX_REFERENCE_BYTES);
        require(bytes(evidence).length <= MAX_REFERENCE_BYTES, "Evidence too long");
        milestone.disputeReason = reason;
        milestone.disputeEvidence = evidence;
        milestone.disputeOpenedBy = msg.sender;
        milestone.status = MilestoneStatus.Disputed;
        job.hasOpenDispute = true;
        emit DisputeRaised(jobId, milestoneId, msg.sender, reason, evidence);
    }

    /// @notice Evidence is emitted as a log; query events to read the full history.
    function addMilestoneDisputeEvidence(uint256 jobId, uint256 milestoneId, string calldata evidence) external {
        Job storage job = _job(jobId);
        Milestone storage milestone = _milestone(jobId, milestoneId);
        _onlyParty(job);
        require(milestone.status == MilestoneStatus.Disputed, "Invalid status");
        require(bytes(evidence).length <= MAX_REFERENCE_BYTES, "Evidence too long");
        emit DisputeEvidenceAdded(jobId, milestoneId, msg.sender, evidence);
    }

    function resolveMilestoneDispute(uint256 jobId, uint256 milestoneId, Decision decision, string calldata reason)
        external nonReentrant
    {
        require(msg.sender == admin, "Only admin");
        Job storage job = _job(jobId);
        Milestone storage milestone = _milestone(jobId, milestoneId);
        require(milestone.status == MilestoneStatus.Disputed, "Invalid status");
        _checkText(reason, MAX_REFERENCE_BYTES);
        milestone.resolutionReason = reason;
        emit DisputeResolved(jobId, milestoneId, decision, reason);
        _settle(jobId, milestoneId, job, milestone, decision == Decision.PayFreelancer);
    }

    function getJob(uint256 jobId) external view returns (Job memory) { return _job(jobId); }

    function getMilestone(uint256 jobId, uint256 milestoneId) external view returns (Milestone memory) {
        _job(jobId);
        return _milestone(jobId, milestoneId);
    }

    /// @return status 0=Unknown not returned, 1=InProgress, 2=Disputed, 3=Completed, 4=PartiallySettled/Refunded.
    function getJobStatus(uint256 jobId) external view returns (uint8) {
        Job storage job = _job(jobId);
        if (job.hasOpenDispute) return 2;
        if (job.completedCount + job.refundedCount == job.milestoneCount) {
            return job.refundedCount == 0 ? 3 : 4;
        }
        return 1;
    }

    function _job(uint256 jobId) private view returns (Job storage) {
        require(jobId > 0 && jobId <= jobCount, "Unknown job");
        return jobs[jobId];
    }

    function _milestone(uint256 jobId, uint256 milestoneId) private view returns (Milestone storage) {
        require(milestoneId > 0 && milestoneId <= jobs[jobId].milestoneCount, "Unknown milestone");
        return milestones[jobId][milestoneId];
    }

    function _onlyParty(Job storage job) private view {
        require(msg.sender == job.employer || msg.sender == job.freelancer, "Only job parties");
    }

    function _checkText(string calldata value, uint256 maxBytes) private pure {
        require(bytes(value).length > 0 && bytes(value).length <= maxBytes, "Invalid text length");
    }

    function _settle(uint256 jobId, uint256 milestoneId, Job storage job, Milestone storage milestone, bool payFreelancer)
        private
    {
        uint256 amount = milestone.escrowBalance;
        require(amount > 0 && amount == milestone.amount, "Invalid escrow");
        address recipient = payFreelancer ? job.freelancer : job.employer;
        bool wasDisputed = milestone.status == MilestoneStatus.Disputed;
        milestone.escrowBalance = 0;
        if (payFreelancer) {
            milestone.status = MilestoneStatus.Completed;
            job.completedCount += 1;
        } else {
            milestone.status = MilestoneStatus.Refunded;
            job.refundedCount += 1;
        }
        totalEscrow -= amount;
        if (wasDisputed) job.hasOpenDispute = _hasOpenDispute(jobId, job.milestoneCount);
        (bool success,) = payable(recipient).call{value: amount}("");
        require(success, "Transfer failed");
        if (payFreelancer) emit MilestonePaymentReleased(jobId, milestoneId, recipient, amount);
        else emit MilestonePaymentRefunded(jobId, milestoneId, recipient, amount);
    }

    function _hasOpenDispute(uint256 jobId, uint256 count) private view returns (bool) {
        for (uint256 i = 1; i <= count; ++i) {
            if (milestones[jobId][i].status == MilestoneStatus.Disputed) return true;
        }
        return false;
    }

    // No receive/fallback: use depositMilestonePayment; there is no arbitrary admin withdrawal.
}
