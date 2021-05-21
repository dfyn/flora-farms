// SPDX-License-Identifier: MIT

pragma solidity >=0.6.11;

import '@openzeppelin/contracts/math/Math.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import './libraries/NativeMetaTransaction/NativeMetaTransaction.sol';

// Inheritance
import './interfaces/IStakingRewards.sol';
import './RewardsDistributionRecipient.sol';

contract StakingRewards is IStakingRewards, RewardsDistributionRecipient, ReentrancyGuard, NativeMetaTransaction {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    struct UserVestingInfo {
        bool hasOptForVesting;
        bool hasSetConfig;
    }

    IERC20 public rewardsToken;
    IERC20 public stakingToken;
    uint256 public periodFinish;
    uint256 public rewardRate;
    uint256 public rewardsDuration;
    uint256 public vestingPeriod;
    uint256 public splits;
    uint256 public claim;
    uint256 public splitWindow;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalBurnableTokens;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => UserVestingInfo) public userVestingInfoByUser;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public totalEarnedReward;
    mapping(address => uint256) public claimedSplits;
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public totalVestedRewardForUser;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken,
        uint256 _rewardsDuration,
        uint256 _vesting,
        uint256 _splits,
        uint256 _claim
    ) public {
        rewardsToken = IERC20(_rewardsToken);
        stakingToken = IERC20(_stakingToken);
        rewardsDistribution = _rewardsDistribution;
        rewardsDuration = _rewardsDuration;
        vestingPeriod = _vesting;
        splits = _splits;
        claim = _claim;
        splitWindow = _vesting.div(_splits);
        _initializeEIP712('StakingRewardsV1');
    }

    /* ========== VIEWS ========== */

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function lastTimeRewardApplicable() public view override returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view override returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored.add(
                lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate).mul(1e18).div(_totalSupply)
            );
    }

    function earned(address account) public view override returns (uint256) {
        return
            _balances[account].mul(rewardPerToken().sub(userRewardPerTokenPaid[account])).div(1e18).add(
                rewards[account]
            );
    }

    function getRewardForDuration() external view override returns (uint256) {
        return rewardRate.mul(rewardsDuration);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stakeWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant updateReward(_msgSender()) {
        require(amount > 0, 'Cannot stake 0');
        _totalSupply = _totalSupply.add(amount);
        _balances[_msgSender()] = _balances[_msgSender()].add(amount);

        // permit
        IUniswapV2ERC20(address(stakingToken)).permit(_msgSender(), address(this), amount, deadline, v, r, s);

        stakingToken.safeTransferFrom(_msgSender(), address(this), amount);
        emit Staked(_msgSender(), amount);
    }

    function stake(uint256 amount) external override nonReentrant updateReward(_msgSender()) {
        require(amount > 0, 'Cannot stake 0');
        _totalSupply = _totalSupply.add(amount);
        _balances[_msgSender()] = _balances[_msgSender()].add(amount);
        stakingToken.safeTransferFrom(_msgSender(), address(this), amount);
        emit Staked(_msgSender(), amount);
    }

    function withdraw(uint256 amount) public override nonReentrant updateReward(_msgSender()) {
        require(amount > 0, 'Cannot withdraw 0');
        _totalSupply = _totalSupply.sub(amount);
        _balances[_msgSender()] = _balances[_msgSender()].sub(amount);
        stakingToken.safeTransfer(_msgSender(), amount);
        emit Withdrawn(_msgSender(), amount);
    }

    function setVestingConfig(bool _setConfig) external {
        UserVestingInfo storage info = userVestingInfoByUser[msg.sender];
        info.hasSetConfig = true;
        require(!hasClaimed[msg.sender], 'Cannot change config after claimed');
        info.hasOptForVesting = _setConfig;
    }

    // Before calling this function caller must set the config for vesting
    // if caller set false for hasOptForVesting 50% of his reward will give right way
    // and remaining will account for burn
    // if set true, his reward will get vested for configured period.
    function getReward() public override nonReentrant updateReward(_msgSender()) {
        require(block.timestamp >= periodFinish, 'Cannot claims token now');
        UserVestingInfo storage info = userVestingInfoByUser[_msgSender()];
        require(info.hasSetConfig, 'Set the config first');

        uint256 reward;
        if (!info.hasOptForVesting) {
            reward = rewards[_msgSender()].div(2);
            totalBurnableTokens = totalBurnableTokens.add(reward);
            rewardsToken.safeTransfer(_msgSender(), reward);
            emit RewardPaid(_msgSender(), reward);
        } else {
            uint256 claimedSplitsForUser = claimedSplits[_msgSender()];
            uint256 currentDate = block.timestamp;

            if (claimedSplitsForUser == 0 && !hasClaimed[_msgSender()]) {
                totalEarnedReward[_msgSender()] = rewards[_msgSender()];
                reward = reward.add((rewards[_msgSender()].mul(claim).div(100)));
                totalVestedRewardForUser[_msgSender()] = rewards[_msgSender()].sub(reward);
            }
            if (claimedSplitsForUser < splits) {
                uint256 currentSplit = (currentDate.sub(periodFinish)).div(splitWindow);
                currentSplit = currentSplit > splits ? splits : currentSplit;
                reward = reward.add(
                    (totalVestedRewardForUser[_msgSender()].mul((currentSplit.sub(claimedSplitsForUser)))).div(splits)
                );

                if (claimedSplitsForUser != currentSplit) claimedSplits[_msgSender()] = currentSplit;
                if (reward > 0) {
                    hasClaimed[_msgSender()] = true;
                    rewards[_msgSender()] = rewards[_msgSender()].sub(reward);
                    rewardsToken.safeTransfer(_msgSender(), reward);
                    emit RewardPaid(_msgSender(), reward);
                }
            }
        }
    }

    function exit() external override {
        withdraw(_balances[_msgSender()]);
        if (block.timestamp >= periodFinish) getReward();
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function notifyRewardAmount(uint256 reward) external override onlyRewardsDistribution updateReward(address(0)) {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward.div(rewardsDuration);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(rewardsDuration);
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 balance = rewardsToken.balanceOf(address(this));
        require(rewardRate <= balance.div(rewardsDuration), 'Provided reward too high');

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
        emit RewardAdded(reward);
    }

    function rescueBurnableFunds(address receiver) external onlyRewardsDistribution {
        rewardsToken.transfer(receiver, totalBurnableTokens);
    }

    function rescueFunds(address tokenAddress, address receiver) external onlyRewardsDistribution {
        require(tokenAddress != address(stakingToken), 'StakingRewards: rescue of staking token not allowed');
        IERC20(tokenAddress).transfer(receiver, IERC20(tokenAddress).balanceOf(address(this)));
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
}

interface IUniswapV2ERC20 {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
