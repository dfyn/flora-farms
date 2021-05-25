const { assert } = require("chai");

const StakingRewardsFactory = artifacts.require('StakingRewardsFactory');
const TestERC20 = artifacts.require('TestERC20');

module.exports = async function (deployer, network) {

  if (network === "matic") {
    const GENESIS = parseInt(Date.now()/1000)+5*60
    const DFYN = "0xC168E40227E4ebD8C1caE80F7a55a4F0e6D66C97"
    const DFYN_TOKEN =  await TestERC20.at(DFYN)
    const DFYN_SYMBOL = await DFYN_TOKEN.symbol()
    assert(DFYN_SYMBOL === "DFYN", "Invalid Token")
    await deployer.deploy(StakingRewardsFactory, DFYN, GENESIS);
    await StakingRewardsFactory.deployed();
  }
};