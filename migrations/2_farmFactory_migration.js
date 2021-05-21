  
const StakingRewardsFactory = artifacts.require('StakingRewardsFactory');
const TestERC20 = artifacts.require('TestERC20');

module.exports = async function (deployer, network) {
  
      if(network === "matic"){
        await deployer.deploy(StakingRewardsFactory,"0xD33dcD9673e1fA99F064CB4682c6299351AD771C",Math.floor(Date.now() /1000) + 60 * 5);
        await StakingRewardsFactory.deployed();
      } else {
        await deployer.deploy(TestERC20,"20000000000000000000000");
        const testERC20 = await TestERC20.deployed();
        await deployer.deploy(StakingRewardsFactory, testERC20.address,Math.floor(Date.now() /1000) + 60 * 2);
        await StakingRewardsFactory.deployed();
      }
  };