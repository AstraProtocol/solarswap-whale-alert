import { providers, Contract, utils } from "ethers";
import axios from "axios";
import SOLARSWAP_PAIR_ABI from "../abis/SolarswapPair.js";
import SOLARSWAP_ROUTER_ABI from "../abis/SolarswapRouter.js";
import ZAPIN_ABI from "../abis/ZapIn.js";
import "dotenv/config";

function getDestinationAddressIdx(funcName) {
  switch (funcName) {
    case "swapExactETHForTokens":
    case "swapETHForExactTokens":
    case "zapInEth":
      return 2;
    case "zapIn":
    case "zapOut":
      return 4;
    default:
      return 3;
  }
}

async function main() {
  // Create a TelegramBot instance with your bot token
  const botToken = process.env.TELE_BOT_TOKEN;
  const chatChanelId = process.env.TELE_CHANNEL_ID;
  const teleApiUrl = `${process.env.TELE_API_URL}/bot${botToken}/sendMessage?chat_id=${chatChanelId}&text=`;
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  const asaUsdtPairAddress = process.env.PAIR_ADDRESS; // WASA/USDT Pair Contract
  const asaUsdtPairContract = new Contract(
    asaUsdtPairAddress,
    SOLARSWAP_PAIR_ABI,
    provider
  );
  const solarswapRouterIface = new utils.Interface(SOLARSWAP_ROUTER_ABI);
  const zapInIface = new utils.Interface(ZAPIN_ABI);

  console.log("========== SOLARSWAP ALERT STARTED! ==========");

  /**
   * Index 0 for token with less address
   * Ex: USDT: 0x2039A56173fDac411975Bce6F756059Ac33d0d79
   * is less than 0xA625BF1c3565775B1859B579DF980Fef324E7315 (WASA)
   * so USDT is token0, WASA is token1
   */

  // --------------------------- SWAP ------------------------------------- //
  asaUsdtPairContract.on(
    "Swap",
    async (sender, amount0In, amount1In, amount0Out, amount1Out, to, event) => {
      const amount0InFmt = utils.formatUnits(amount0In, 18);
      const amount1InFmt = utils.formatUnits(amount1In, 18);
      const amount0OutFmt = utils.formatUnits(amount0Out, 18);
      const amount1OutFmt = utils.formatUnits(amount1Out, 18);
      const tx = await provider.getTransaction(event.transactionHash);
      let txParse;
      try {
        txParse = solarswapRouterIface.parseTransaction({ data: tx.data });
      } catch (error) {
        txParse = zapInIface.parseTransaction({ data: tx.data });
      }
      const message = `
========== [SWAP] ==========%0A
${amount1InFmt > 0 ? `ASA In: ${amount1InFmt}%0A` : ""}
${amount0OutFmt > 0 ? `USDT Out: ${amount0OutFmt}%0A----------------------------%0A` : ""}
${amount0InFmt > 0 ? `USDT In: ${amount0InFmt}%0A` : ""}
${amount1OutFmt > 0 ? `ASA Out: ${amount1OutFmt}%0A----------------------------%0A` : ""}
from: ${tx.from}%0A
to: ${txParse.args[getDestinationAddressIdx(txParse.name)]}%0A
txHash: ${process.env.EXPLORER_URL}/tx/${event.transactionHash}
    `;
      console.log(JSON.stringify(event, null, 4));
      if (
        parseFloat(amount0InFmt) >= process.env.THRESHOLD_USDT ||
        parseFloat(amount0OutFmt) >= process.env.THRESHOLD_USDT ||
        parseFloat(amount1InFmt) >= process.env.THRESHOLD_ASA ||
        parseFloat(amount1OutFmt) >= process.env.THRESHOLD_ASA
      ) {
        axios
          .get(`${teleApiUrl}${message}`)
          .then(function (response) {
            // handle success
            console.log("Send message successfully");
          })
          .catch(function (error) {
            // handle error
            console.log("Send message Error: ", error);
          });
      }
    }
  );
  // --------------------------- SWAP ------------------------------------- //

  // --------------------------- ADD LIQUIDITY ------------------------------------- //
  asaUsdtPairContract.on("Mint", (sender, amount0, amount1, event) => {
    let message = `
========== [ADD LIQUIDITY] ==========%0A
ASA: ${utils.formatUnits(amount1, 18)}%0A
USDT: ${utils.formatUnits(amount0, 18)}%0A
----------------------------%0A
txHash: ${process.env.EXPLORER_URL}/tx/${event.transactionHash}%0A
    `;
    console.log(JSON.stringify(event, null, 4));
    axios
      .get(`${teleApiUrl}${message}`)
      .then(function (response) {
        // handle success
        console.log("Send message successfully");
      })
      .catch(function (error) {
        // handle error
        console.log("Send message Error: ", error);
      });
  });
  // --------------------------- ADD LIQUIDITY ------------------------------------- //

  // --------------------------- REMOVE LIQUIDITY ------------------------------------- //
  asaUsdtPairContract.on("Burn", (sender, amount0, amount1, to, event) => {
    let message = `
========== [REMOVE LIQUIDITY] ==========%0A
ASA: ${utils.formatUnits(amount1, 18)}%0A
USDT: ${utils.formatUnits(amount0, 18)}%0A
----------------------------
to: ${to}%0A
txHash: ${process.env.EXPLORER_URL}/tx/${event.transactionHash}%0A
    `;
    console.log(JSON.stringify(event, null, 4));
    axios
      .get(`${teleApiUrl}${message}`)
      .then(function (response) {
        // handle success
        console.log("Send message successfully");
      })
      .catch(function (error) {
        // handle error
        console.log("Send message Error: ", error);
      });
  });
  // --------------------------- REMOVE LIQUIDITY ------------------------------------- //
}

main();
