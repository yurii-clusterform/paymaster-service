import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless/utils";
import { createPimlicoBundlerClient } from "permissionless/clients/pimlico";
import { http } from "viem";
import { getWalletClient, getChain, getTrustedSignerWalletClient } from "../helpers/utils";
import {
  deploySbcPaymasterV07,
  fundSbcPaymasterV07,
} from "../helpers/verifyingPaymasters";
import { createSbcRpcHandler } from "../relay";

interface IQueryString {
  name: string;
}

interface CustomRouteGenericQuery {
  Querystring: IQueryString;
}

interface IParams {
  name: string;
}

interface CustomRouteGenericParam {
  Params: IParams;
}

const setupHandler = async () => {  
  // Get deployer wallet client
  const walletClient = getWalletClient();
  const owner = walletClient.account.address;

  // Deploy and fund paymaster
  const trustedSignerWalletClient = getTrustedSignerWalletClient();
  const trustedSigner = trustedSignerWalletClient.account.address;
  const paymasterV07 = await deploySbcPaymasterV07(walletClient, trustedSigner, owner);
  await fundSbcPaymasterV07(walletClient, paymasterV07);

  // Create bundler client
  const altoBundlerV07 = createPimlicoBundlerClient({
    chain: getChain(),
    transport: http(process.env.BUNDLER_URL),
    entryPoint: ENTRYPOINT_ADDRESS_V07,
  });

  // Create RPC handler
  const rpcHandler = createSbcRpcHandler(
    altoBundlerV07,
    paymasterV07,
    trustedSignerWalletClient
  );
  return rpcHandler;
};

const routes: FastifyPluginAsync = async (server) => {
  server.register(cors, {
    origin: "*",
    methods: ["POST", "GET", "OPTIONS"],
  });

  server.register(
    async (instance: FastifyInstance, opts: FastifyServerOptions) => {
      instance.get(
        "/",
        async (
          req: FastifyRequest<CustomRouteGenericQuery>,
          res: FastifyReply
        ) => {
          res.status(200).send(`custom paymaster from SBC`);
        }
      );

      instance.get(
        "/ping",
        async (
          req: FastifyRequest<CustomRouteGenericQuery>,
          res: FastifyReply
        ) => {
          res.status(200).send({ message: "pong" });
        }
      );

      instance.post("/rpc", await setupHandler());
    },
    {
      prefix: "/v1",
    }
  );
};

export default routes;
