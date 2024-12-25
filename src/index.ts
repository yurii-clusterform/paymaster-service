import cors from "@fastify/cors";
import Fastify from "fastify";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createPimlicoBundlerClient } from "permissionless/clients/pimlico";
import { http } from "viem";
import { getWalletClient, getChain } from "./helpers/utils";
import {
  deploySbcPaymasterV07,
  fundSbcPaymasterV07,
} from "./helpers/verifyingPaymasters";
import { createRpcHandler, createSbcRpcHandler } from "./relay";

const main = async () => {
  const walletClient = getWalletClient();

  // Deploy and fund paymaster
  const paymasterV07 = await deploySbcPaymasterV07(walletClient);
  await fundSbcPaymasterV07(walletClient);

  const altoBundlerV07 = createPimlicoBundlerClient({
    chain: getChain(),
    transport: http(process.env.BUNDLER_URL),
    entryPoint: ENTRYPOINT_ADDRESS_V07,
  });

  const app = Fastify({});

  app.register(cors, {
    origin: "*",
    methods: ["POST", "GET", "OPTIONS"],
  });

  const rpcHandler = createSbcRpcHandler(
    altoBundlerV07,
    paymasterV07,
    walletClient
  );

  app.get("/", async (_request, reply) => {
    return reply.code(200).send("custom paymaster from SBC");
  });

  app.post("/", {}, rpcHandler);

  app.get("/ping", async (_request, reply) => {
    return reply.code(200).send({ message: "pong" });
  });

  // await app.listen({ host: "0.0.0.0", port: 3000 });
  return app;
};

export const routes = main();

async function start() {
  (await routes).listen({ host: "0.0.0.0", port: 3000 });
}

start()
  .then(() => {
    console.log("Running on http://0.0.0.0:3000");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
