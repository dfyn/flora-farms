// const { assert } = require("chai");
// const StakingRewardsFactory = artifacts.require('StakingRewardsFactory');
const StakingRewards = artifacts.require('StakingRewards');
// const TestERC20 = artifacts.require('TestERC20');

module.exports = async function (deployer, network) {

  if (network === "matic") {
    // const GENESIS = parseInt(Date.now()/1000)+5*60
    // const DFYN = "0xC168E40227E4ebD8C1caE80F7a55a4F0e6D66C97"
    // const DFYN_TOKEN =  await TestERC20.at(DFYN)
    // const DFYN_SYMBOL = await DFYN_TOKEN.symbol()
    // assert(DFYN_SYMBOL === "DFYN", "Invalid Token")
    // await deployer.deploy(StakingRewardsFactory, DFYN, GENESIS);
    // await StakingRewardsFactory.deployed();
    let farms = [
    '0x24a5256589126a0eb73a1a011e22C1c838890Ced',
    '0xE4F8C4722Aa44bFf5c99ba64c0bC39C6d883CcB6',
    '0x370737D328cf8DfD830fFFf51Dd9c972345e6Fee',
    '0xf786Ba582AbbE846B35E6e7089a25B761eA54113',
    '0x32B73E973057d309d22EC98B50a8311C0F583Ad3',
    '0x694351F6dAfe5F2e92857e6a3C0578b68A8C1435',
    '0xf162a26aCc064B88a0150a36d7B38996723E94D7',
    '0x376920095Ae17e12BC114D4E33D30DFda83f8EfB',
    '0x0BADA377367f4937bdf6A17FdaeeB0b798051c91',
    '0x3cA3f35b081CD7c47990e0Ef5Eed763b54F22874',
    '0x80dF5A040E045817AB75A4214e29Dc95D83f1118']
    let totalBurnable = 0;
    for(let i = 0; i < farms.length ; i++){
      const contract = await StakingRewards.at(farms[i]);
      const burnable = await contract.totalBurnableTokens();
      console.log(web3.utils.fromWei(burnable, 'ether'),farms[i]);
      totalBurnable += parseFloat(web3.utils.fromWei(burnable, 'ether'))
    }
    console.log("TotalBurnable: ",totalBurnable);
  }
};