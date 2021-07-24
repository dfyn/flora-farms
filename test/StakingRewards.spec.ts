import chai, { expect } from 'chai'
import { Contract, BigNumber, constants } from 'ethers'
import { solidity, MockProvider, createFixtureLoader, deployContract } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { stakingRewardsFixture } from './fixtures'
import { REWARDS_DURATION, VESTING, expandTo18Decimals, mineBlock, getApprovalDigest, CLAIM, SPLITS, BURNRATE } from './utils'

import StakingRewards from '../build/StakingRewards.json'

chai.use(solidity)

describe('StakingRewards', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 99999999,
    },
  })
  const [wallet, staker, secondStaker] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  let stakingRewards: Contract
  let rewardsToken: Contract
  let stakingToken: Contract
  beforeEach(async () => {
    const fixture = await loadFixture(stakingRewardsFixture)
    stakingRewards = fixture.stakingRewards
    rewardsToken = fixture.rewardsToken
    stakingToken = fixture.stakingToken
  })

  it('deploy cost', async () => {
    const stakingRewards = await deployContract(wallet, StakingRewards, [
      wallet.address,
      rewardsToken.address,
      stakingToken.address,
      REWARDS_DURATION, BURNRATE, VESTING, SPLITS, CLAIM
    ])
    const receipt = await provider.getTransactionReceipt(stakingRewards.deployTransaction.hash)
    expect(receipt.gasUsed).to.eq('2537912')
  })

  it('rewardsDuration', async () => {
    const rewardsDuration = await stakingRewards.rewardsDuration()
    expect(rewardsDuration).to.be.eq(REWARDS_DURATION)
  })

  const reward = expandTo18Decimals(100)
  async function start(reward: BigNumber): Promise<{ startTime: BigNumber; vestingEndTime: BigNumber; rewardEndTime: BigNumber; totalSplits: BigNumber }> {
    // send reward to the contract
    await rewardsToken.transfer(stakingRewards.address, reward)
    // must be called by rewardsDistribution
    await stakingRewards.notifyRewardAmount(reward)

    const startTime: BigNumber = await stakingRewards.lastUpdateTime()
    const rewardEndTime: BigNumber = await stakingRewards.periodFinish() //here
    const vestingEndTime: BigNumber = await stakingRewards.vestingPeriod() //
    const totalSplits: BigNumber = await stakingRewards.splits()
    // expect(vestingEndTime).to.be.eq(startTime.add(REWARDS_DURATION))
    return { startTime, vestingEndTime, rewardEndTime, totalSplits }
  }

  // it('notifyRewardAmount: failed', async () => {
  //   // stake with staker
  //   const stake = expandTo18Decimals(2)
  //   await stakingToken.transfer(staker.address, stake)
  //   await stakingToken.connect(staker).approve(stakingRewards.address, stake)
  //   await stakingRewards.connect(staker).stake(stake)

  //   const { vestingEndTime, rewardEndTime } = await start(reward)

  //   // fast-forward past the reward window
  //   await mineBlock(provider, vestingEndTime.add(rewardEndTime).add(1).toNumber())

  //   // unstake
  //   await expect(stakingRewards.connect(staker).getReward()).to.revertedWith('Set the config first')
  // })

  it('notifyRewardAmount: take half, burn rest', async () => {
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    const { vestingEndTime, rewardEndTime } = await start(reward)
    await stakingRewards.connect(staker).setVestingConfig(false);

    // fast-forward past the reward window
    await mineBlock(provider, vestingEndTime.add(rewardEndTime).add(1).toNumber())

    // unstake
    await stakingRewards.connect(staker).exit()
    const stakeEndTime: BigNumber = await stakingRewards.lastUpdateTime()
    // expect(stakeEndTime.add(VESTING)).to.be.eq(vestingEndTime)

    const rewardAmount = await rewardsToken.balanceOf(staker.address)
    //console.log(rewardAmount, reward, reward.div(REWARDS_DURATION).mul(REWARDS_DURATION))
    //expect(reward.sub(rewardAmount).lte(reward.div(10000))).to.be.true // ensure result is within .01%
    expect(rewardAmount).to.be.eq(reward.div(REWARDS_DURATION).mul(REWARDS_DURATION).mul(BURNRATE).div(100))
  })

  it('notifyRewardAmount: cannot change config after claim', async () => {
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    const { vestingEndTime, rewardEndTime } = await start(reward)
    await stakingRewards.connect(staker).setVestingConfig(false);

    // fast-forward past the reward window
    await mineBlock(provider, vestingEndTime.add(rewardEndTime).add(1).toNumber())

    // unstake
    await stakingRewards.connect(staker).exit()
    const rewardAmount = await rewardsToken.balanceOf(staker.address)

    expect(rewardAmount).to.be.eq(reward.div(REWARDS_DURATION).mul(REWARDS_DURATION).mul(BURNRATE).div(100))

    await expect(stakingRewards.connect(staker).setVestingConfig(true)).to.revertedWith('Cannot update vesting schedule now')


  })

  it('notifyRewardAmount: No reward after burn', async () => {
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    const { vestingEndTime, rewardEndTime } = await start(reward)
    await stakingRewards.connect(staker).setVestingConfig(false);

    // fast-forward past the reward window
    await mineBlock(provider, vestingEndTime.add(rewardEndTime).add(1).toNumber())

    // unstake
    await stakingRewards.connect(staker).exit()
    // expect(stakeEndTime.add(VESTING)).to.be.eq(vestingEndTime)

    const rewardAmount = await rewardsToken.balanceOf(staker.address)
    expect(rewardAmount).to.be.eq(reward.div(REWARDS_DURATION).mul(REWARDS_DURATION).mul(BURNRATE).div(100))

    //Again Calling get Reward
    await stakingRewards.connect(staker).getReward()
    const newRewardAmount = await rewardsToken.balanceOf(staker.address)
    expect(newRewardAmount).to.be.eq(rewardAmount);
  })

  it('notifyRewardAmount: full', async () => {
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)
    // await stakingRewards.connect(staker).setVestingConfig(true);

    const { vestingEndTime, rewardEndTime } = await start(reward)

    // fast-forward past the reward window
    await mineBlock(provider, vestingEndTime.add(rewardEndTime).add(1).toNumber())

    // unstake
    await stakingRewards.connect(staker).exit()
    const stakeEndTime: BigNumber = await stakingRewards.lastUpdateTime()
    // expect(stakeEndTime.add(VESTING)).to.be.eq(vestingEndTime)

    const rewardAmount = await rewardsToken.balanceOf(staker.address)
    //console.log(rewardAmount, reward, reward.div(REWARDS_DURATION).mul(REWARDS_DURATION))
    //expect(reward.sub(rewardAmount).lte(reward.div(10000))).to.be.true // ensure result is within .01%
    expect(rewardAmount).to.be.eq(reward.div(REWARDS_DURATION).mul(REWARDS_DURATION))
  })

  it('notifyRewardAmount: full without set config', async () => {
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)
    const { vestingEndTime, rewardEndTime } = await start(reward)

    // fast-forward past the reward window
    await mineBlock(provider, vestingEndTime.add(rewardEndTime).add(1).toNumber())

    // unstake
    await stakingRewards.connect(staker).exit()
    const stakeEndTime: BigNumber = await stakingRewards.lastUpdateTime()
    // expect(stakeEndTime.add(VESTING)).to.be.eq(vestingEndTime)

    const rewardAmount = await rewardsToken.balanceOf(staker.address)
    //console.log(rewardAmount, reward, reward.div(REWARDS_DURATION).mul(REWARDS_DURATION))
    //expect(reward.sub(rewardAmount).lte(reward.div(10000))).to.be.true // ensure result is within .01%
    expect(rewardAmount).to.be.eq(reward.div(REWARDS_DURATION).mul(REWARDS_DURATION))
  })

  it('stakeWithPermit', async () => {
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)

    // get permit
    const nonce = await stakingToken.nonces(staker.address)
    const deadline = constants.MaxUint256
    const digest = await getApprovalDigest(
      stakingToken,
      { owner: staker.address, spender: stakingRewards.address, value: stake },
      nonce,
      deadline
    )
    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(staker.privateKey.slice(2), 'hex'))

    await stakingRewards.connect(staker).stakeWithPermit(stake, deadline, v, r, s)

    const { vestingEndTime, rewardEndTime } = await start(reward)

    // fast-forward past the reward window
    await mineBlock(provider, vestingEndTime.add(rewardEndTime).add(1).toNumber())
    // unstake
    await stakingRewards.connect(staker).exit()
    const stakeEndTime: BigNumber = await stakingRewards.lastUpdateTime()
    // expect(stakeEndTime).to.be.eq(vestingEndTime)

    const rewardAmount = await rewardsToken.balanceOf(staker.address)
    // console.log(rewardAmount, reward.div(10000))
    // expect(reward.sub(rewardAmount).lte(reward.div(10000))).to.be.true // ensure result is within .01%
    expect(rewardAmount).to.be.eq(reward.div(REWARDS_DURATION).mul(REWARDS_DURATION))
  })

  it('notifyRewardAmount: ~half', async () => {
    const { startTime, rewardEndTime } = await start(reward)

    // fast-forward ~halfway through the reward window
    await mineBlock(provider, startTime.add(rewardEndTime.sub(startTime).div(2)).toNumber())
    // await stakingRewards.connect(staker).setVestingConfig(true);

    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)
    const stakeStartTime: BigNumber = await stakingRewards.lastUpdateTime()

    // fast-forward past the reward window
    await mineBlock(provider, rewardEndTime.add(1).toNumber())

    // unstake
    await stakingRewards.connect(staker).exit()
    const stakeEndTime: BigNumber = await stakingRewards.lastUpdateTime()
    // expect(stakeEndTime).to.be.eq(vestingEndTime)

    const rewardAmount = await rewardsToken.balanceOf(staker.address)
    //   expect(reward.div(2).sub(rewardAmount).lte(reward.div(2).div(10000))).to.be.true // ensure result is within .01%
    //console.log(rewardAmount, reward.div(REWARDS_DURATION).mul(rewardEndTime.sub(stakeStartTime)))
    expect(rewardAmount).to.be.eq(reward.div(REWARDS_DURATION).mul(rewardEndTime.sub(stakeStartTime)).mul(CLAIM).div(100))
  }) // TODO investigate flakiness

  it('notifyRewardAmount: two stakers', async () => {
    // stake with first staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    const { startTime, vestingEndTime, rewardEndTime } = await start(reward)
    await stakingRewards.connect(staker).setVestingConfig(true);

    // fast-forward ~halfway through the reward window
    await mineBlock(provider, startTime.add(rewardEndTime.sub(startTime).div(2)).toNumber())

    // stake with second staker
    await stakingToken.transfer(secondStaker.address, stake)
    await stakingToken.connect(secondStaker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(secondStaker).stake(stake)
    await stakingRewards.connect(secondStaker).setVestingConfig(true);
    // fast-forward past the reward window
    await mineBlock(provider, vestingEndTime.add(rewardEndTime).add(1).toNumber())

    // unstake
    await stakingRewards.connect(staker).exit()
    const stakeEndTime: BigNumber = await stakingRewards.lastUpdateTime()
    // expect(stakeEndTime).to.be.eq(vestingEndTime)
    await stakingRewards.connect(secondStaker).exit()

    const rewardAmount = await rewardsToken.balanceOf(staker.address)
    const secondRewardAmount = await rewardsToken.balanceOf(secondStaker.address)
    const totalReward = rewardAmount.add(secondRewardAmount)

    // ensure results are within .01%
    expect(reward.sub(totalReward).lte(reward.div(10000))).to.be.true
    expect(totalReward.mul(3).div(4).sub(rewardAmount).lte(totalReward.mul(3).div(4).div(10000)))
    expect(totalReward.div(4).sub(secondRewardAmount).lte(totalReward.div(4).div(10000)))
  })

  it('Should not reset split after claim', async () => {
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    await stakingRewards.connect(staker).exit()
    let stakerInfo = await stakingRewards.claimedSplits(staker.address)
    console.log(stakerInfo)
    expect(stakerInfo).to.be.eq(0)
  })

  it('Claimed split should be 0 in Reward cycle', async () => {
    const { startTime, rewardEndTime } = await start(reward)
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    // fast-forward ~halfway through the reward window
    await mineBlock(provider, rewardEndTime.sub(1).toNumber())
    await stakingRewards.connect(staker).exit()
    let stakerInfo = await stakingRewards.claimedSplits(staker.address)
    let hasClaimed = await stakingRewards.hasClaimed(staker.address)
    expect(hasClaimed).to.be.false;
    expect(stakerInfo).to.be.eq(expandTo18Decimals(0))
  })

  it('Claimed split:: After reward ends', async () => {
    const { startTime, rewardEndTime } = await start(reward)
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    // fast-forward ~halfway through the reward window
    await mineBlock(provider, rewardEndTime.add(1).toNumber())
    await stakingRewards.connect(staker).exit()
    let stakerInfo = await stakingRewards.claimedSplits(staker.address)
    let hasClaimed = await stakingRewards.hasClaimed(staker.address)
    expect(hasClaimed).to.be.true;
    expect(stakerInfo).to.be.eq(0)
  })
  it('Claimed split:: First', async () => {
    const { startTime, rewardEndTime, vestingEndTime } = await start(reward)
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    // fast-forward ~halfway through the reward window
    await mineBlock(provider, rewardEndTime.add(vestingEndTime.mul(1).div(SPLITS)).add(1).toNumber())
    await stakingRewards.connect(staker).exit()
    let stakerInfo = await stakingRewards.claimedSplits(staker.address)
    let hasClaimed = await stakingRewards.hasClaimed(staker.address)
    expect(hasClaimed).to.be.true;
    expect(stakerInfo).to.be.eq(1)
  })

  it('Claimed split:: Second', async () => {
    const { startTime, rewardEndTime, vestingEndTime } = await start(reward)
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    // fast-forward ~halfway through the reward window
    await mineBlock(provider, rewardEndTime.add(vestingEndTime.mul(2).div(SPLITS)).add(1).toNumber())
    await stakingRewards.connect(staker).exit()
    let stakerInfo = await stakingRewards.claimedSplits(staker.address)
    let hasClaimed = await stakingRewards.hasClaimed(staker.address)
    expect(hasClaimed).to.be.true;
    expect(stakerInfo).to.be.eq(2)
  })
  it('Claimed split:: Third', async () => {
    const { startTime, rewardEndTime, vestingEndTime } = await start(reward)
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    // fast-forward ~halfway through the reward window
    await mineBlock(provider, rewardEndTime.add(vestingEndTime.mul(3).div(SPLITS)).add(1).toNumber())
    await stakingRewards.connect(staker).exit()
    let stakerInfo = await stakingRewards.claimedSplits(staker.address)
    let hasClaimed = await stakingRewards.hasClaimed(staker.address)
    expect(hasClaimed).to.be.true;
    expect(stakerInfo).to.be.eq(3)
  })


  it('Claimed split:: After vesting period end', async () => {
    const { vestingEndTime, rewardEndTime } = await start(reward)
    // stake with staker
    const stake = expandTo18Decimals(2)
    await stakingToken.transfer(staker.address, stake)
    await stakingToken.connect(staker).approve(stakingRewards.address, stake)
    await stakingRewards.connect(staker).stake(stake)

    console.log("vestingTime ", vestingEndTime.add(rewardEndTime).add(1).toNumber())
    await mineBlock(provider, vestingEndTime.add(rewardEndTime).add(1).toNumber())
    await stakingRewards.connect(staker).exit()
    let stakerInfo = await stakingRewards.claimedSplits(staker.address)
    let hasClaimed = await stakingRewards.hasClaimed(staker.address)
    expect(hasClaimed).to.be.true;
    expect(stakerInfo).to.be.eq(SPLITS)

  })
})
