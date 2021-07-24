const {
  assert
} = require("chai");

const StakingRewardsFactory = artifacts.require('StakingRewardsFactory');
const TestERC20 = artifacts.require('TestERC20');

module.exports = async function (deployer, network) {
  const deployed = false
  // if(!deployed){
  //   const GENESIS = parseInt(Date.now() / 1000) + 5 * 60
  //   const MATPAD = "0x3bfce6d6f0d3d3f1326d86abdbe2845b4740dc2e"
  //   // const DFYN_TOKEN = await TestERC20.at(DFYN)
  //   // const DFYN_SYMBOL = await DFYN_TOKEN.symbol()
  //   // assert(DFYN_SYMBOL === "DFYN", "Invalid Token")
  //   await deployer.deploy(StakingRewardsFactory, MATPAD, GENESIS);
  //   await StakingRewardsFactory.deployed();
  //   const maticpad_f = "0x86A052A43978C6999aC594bfCfA663b347680e22"
  // } else {
  //   const rewardDuration = "2592000"
  //   const vestingPeriod = "15552000"
  //   const claimable = "25"
  //   const splits = '3'
  //   const factory = await StakingRewardsFactory.at("0x86A052A43978C6999aC594bfCfA663b347680e22")
  //   const pools = [
  //     {
  //       amount: '700000000000000000000000',
  //       poolName: "matpad/eth",
  //       poolAddress: "0x3341f49ac6ff588ca9b92c7812e254138e42b977"
  //     }
  //   ]


  //   for (let i of pools) {
  //     console.log(i)

  //     let result = await factory.deploy(i.poolAddress, i.amount, rewardDuration, vestingPeriod, splits, claimable)
  //     console.log(result)
  //     result = await factory.stakingRewardsInfoByStakingToken(i.poolAddress)
  //     console.log(i.poolName, result.stakingRewards)

  //   }
  // }
  if (!deployed) {
    const GENESIS = parseInt(Date.now() / 1000) + 5 * 60
    const DFYN = "0xC168E40227E4ebD8C1caE80F7a55a4F0e6D66C97"
    const DFYN_TOKEN = await TestERC20.at(DFYN)
    const DFYN_SYMBOL = await DFYN_TOKEN.symbol()
    assert(DFYN_SYMBOL === "DFYN", "Invalid Token")
    await deployer.deploy(StakingRewardsFactory, DFYN, GENESIS);
    await StakingRewardsFactory.deployed();
  } else {
    const rewardDuration = "2592000"
    const vestingPeriod = "15552000"
    const claimable = "25"
    const splits = '3'
    const burnRate = '35'
    const factory = await StakingRewardsFactory.at("0x77D28e9124f7e4EA1470370E121710eCb958465C")
    const pools = [
      // {
      //   poolName: "LUNA-DFYN",
      //   poolAddress: "0x7e2ce68e76e94cb4c35b3ab66d03e66efd7641a7",
      //   rewardAmount: "240000000000000000000000"
      // },
      // {
      //   poolName: "UST-USDT",
      //   poolAddress: "0x39bed7f1c412ab64443196a6fecb2ac20c707224",
      //   rewardAmount: "240000000000000000000000"
      // }
      // {
      //   amount: '450000000000000000000000',
      //   poolName: "DFyn/Usdc",
      //   poolAddress: "0x4c38938e21cb9796932b0b0cc3f8a088f07b49b0"
      // },
      // {
      //   amount: '450000000000000000000000',
      //   poolName: "DFyn/Eth",
      //   poolAddress: "0x6fa867bbfdd025780a8cfe988475220aff51fb8b"
      // },
      // {
      //   amount: '675000000000000000000000',
      //   poolName: "Wbtc/Eth",
      //   poolAddress: "0x39eaa90a70e8fdc04e1f63db04e1c62c9ace0641"
      // },
      // {
      //   amount: '675000000000000000000000',
      //   poolName: "Usdt/Usdc",
      //   poolAddress: "0xbe40f7fff5a2235af9a8cb79a17373162efefa9c"
      // },
      // {
      //   amount: '600000000000000000000000',
      //   poolName: "Dai/Usdt",
      //   poolAddress: "0xdd228fdc8a41a02bdea72060f53c1f88a2fd48b6"
      // },
      // {
      //   amount: '600000000000000000000000',
      //   poolName: "Dai/usdc",
      //   poolAddress: "0xb7bd6d48c9b1af7e126d0389c6970f157d974f33"
      // },
      // {
      //   amount: '450000000000000000000000',
      //   poolName: "Eth/USDC",
      //   poolAddress: "0x7d51bad48d253dae37cc82cad07f73849286deec"
      // },
      // {
      //   amount: '225000000000000000000000',
      //   poolName: "Route/usdc",
      //   poolAddress: "0x40f0a05c8c7a86ad1491a3911c293e093fe92436"
      // },
      // {
      //   amount: '225000000000000000000000',
      //   poolName: "Route/eth",
      //   poolAddress: "0xebc4f9b1ce66258ac3a48578ffeeba1330ddb68b"
      // },
      // {
      //   amount: '450000000000000000000000',
      //   poolName: "Matic/eth",
      //   poolAddress: "0xc3379226aeef21464d05676305dad1261d6f3fac"
      // },
      // {
      //   amount: '150000000000000000000000',
      //   poolName: "curve/eth",
      //   poolAddress: "0x3a8a6831a1e866c64bc07c3df0f7b79ac9ef2fa2"
      // },
      // {
      //   amount: '112500000000000000000000',
      //   poolName: "uni/eth",
      //   poolAddress: "0xb5e1a07c9b6ab3bee8d9bf4066d324c5da89c07f"
      // },
      // {
      //   amount: '112500000000000000000000',
      //   poolName: "uni/usdc",
      //   poolAddress: "0x57a3a18b898bfeddaf88c60c09a081d9fd78f340"
      // },
      // {
      //   amount: '150000000000000000000000',
      //   poolName: "Quick/matic",
      //   poolAddress: "0x80b3902afc046e6c41dba93bedb1872f78e541a1"
      // },
      // {
      //   amount: '112500000000000000000000',
      //   poolName: "aave/eth",
      //   poolAddress: "0x7162c0acf32820920a741d8fa466b8e6d60d530d"
      // },
      // {
      //   amount: '112500000000000000000000',
      //   poolName: "aave/usdc",
      //   poolAddress: "0x75b2F458e33922bEa5572eE0AD9A9e24ddFf5888"
      // },
      // {
      //   amount: '150000000000000000000000',
      //   poolName: "link/usdc",
      //   poolAddress: "0x86cc48edcedff70adacba59dea9b61670f90eac3"
      // }
      // {
      //   amount: '150000000000000000000000',
      //   poolName: "DFYN/MIMATIC",
      //   poolAddress: "0xc6d245565d5c3934e23b120902903dbf6bc27fce"
      // }
      {
        amount: '80000000000000000000000',
        poolName: "DFYN-MATIC",
        poolAddress: "0x740d668883b0faef5eef7e84be28c7152d6f609d"
      },    
      {
        amount: "128000000000000000000000",
        poolName: "LUNA-DFYN",
        poolAddress: "0x7e2ce68e76e94cb4c35b3ab66d03e66efd7641a7",
      },
      {
        amount: "192000000000000000000000",
        poolName: "UST-USDT",
        poolAddress: "0x39bed7f1c412ab64443196a6fecb2ac20c707224",
      }
    ]




    for (let i of pools) {
      // console.log(i)

      // let result = await factory.deploy(i.poolAddress, i.amount, rewardDuration, vestingPeriod, splits, claimable)
      // console.log(result)
      let result = await factory.stakingRewardsInfoByStakingToken(i.poolAddress)
      console.log(i.poolName, result.stakingRewards)

    }
  }

};