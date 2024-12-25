import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createPimlicoBundlerClient } from "permissionless/clients/pimlico";
import { http } from "viem";
import { getWalletClient, getChain } from "../helpers/utils";
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
  const walletClient = getWalletClient();

  // Deploy and fund paymaster
  const paymasterV07 = await deploySbcPaymasterV07(walletClient);
  await fundSbcPaymasterV07(walletClient);

  const altoBundlerV07 = createPimlicoBundlerClient({
    chain: getChain(),
    transport: http(process.env.BUNDLER_URL),
    entryPoint: ENTRYPOINT_ADDRESS_V07,
  });

  const rpcHandler = createSbcRpcHandler(
    altoBundlerV07,
    paymasterV07,
    walletClient
  );
  return rpcHandler;
};

const routes: FastifyPluginAsync = async (server) => {
  server.register(cors, {
    origin: "*",
    methods: ["POST", "GET", "OPTIONS"],
  });

  server.register(
    async (instance: FastifyInstance, opts: FastifyServerOptions, done) => {
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

      instance.post("/", await setupHandler());

      done();
    },
    {
      prefix: "/rpc/v1",
    }
  );
};

export default routes;
