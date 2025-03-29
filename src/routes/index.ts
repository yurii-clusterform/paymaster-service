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
import { Address, getContract, http } from "viem";
import { getDeployerWalletClient, getChain, getTrustedSignerWalletClient } from "../helpers/utils";
import { abi as SBC_PAYMASTER_V07_ABI } from "../../contracts/abi/SignatureVerifyingPaymasterV07.json";
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
  // Verify required environment variables are set
  if (!process.env.RPC_URL) {
    throw new Error("RPC_URL environment variable is not set");
  }
  
  if (!process.env.BUNDLER_URL) {
    throw new Error("BUNDLER_URL environment variable is not set");
  }
  
  try {
    // Get deployer wallet client
    const walletClient = getDeployerWalletClient();
    
    if (!walletClient) {
      throw new Error("Failed to initialize deployer wallet client");
    }
    
    const owner = walletClient.account.address;
    console.log(`Deployer/Owner address: ${owner}`);

    // Get trusted signer wallet client
    const trustedSignerWalletClient = getTrustedSignerWalletClient();
    
    if (!trustedSignerWalletClient) {
      throw new Error("Failed to initialize trusted signer wallet client");
    }
    
    const trustedSigner = trustedSignerWalletClient.account.address;
    console.log(`Trusted signer address: ${trustedSigner}`);

    const paymasterAddress = process.env.PROXY_ADDRESS as Address; 
    console.log(`Using paymaster at address: ${paymasterAddress}`);
    
    if (!paymasterAddress) {
      throw new Error("PROXY_ADDRESS environment variable is not set");
    }
    

    // Create bundler client
    const altoBundlerV07 = createPimlicoBundlerClient({
      chain: getChain(),
      transport: http(process.env.BUNDLER_URL),
      entryPoint: ENTRYPOINT_ADDRESS_V07,
    });

    const paymasterContract = getContract({
      address: paymasterAddress,
      abi: SBC_PAYMASTER_V07_ABI,
      client: walletClient,
    });

    // Create RPC handler
    const rpcHandler = createSbcRpcHandler(
      altoBundlerV07,
      paymasterContract,
      trustedSignerWalletClient
    );
    
    console.log("Paymaster system setup complete!");
    return rpcHandler;
  } catch (error) {
    console.error("Error setting up paymaster system:", error);
    throw error;
  }
};

const routes: FastifyPluginAsync = async (server) => {
  server.register(cors, {
    origin: "*",
    methods: ["POST", "GET", "OPTIONS"],
  });

  try {
    const rpcHandler = await setupHandler();
    
    server.register(
      async (instance: FastifyInstance, opts: FastifyServerOptions) => {
        instance.get(
          "/",
          async (
            req: FastifyRequest<CustomRouteGenericQuery>,
            res: FastifyReply
          ) => {
            res.status(200).send(`SBC Paymaster service ready`);
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
  
        instance.post("/rpc", rpcHandler);
      },
      {
        prefix: "/v1",
      }
    );
  } catch (error) {
    console.error("Failed to initialize routes:", error);
    // Still register the basic routes even if setup failed
    server.register(
      async (instance: FastifyInstance, opts: FastifyServerOptions) => {
        instance.get(
          "/",
          async (
            req: FastifyRequest<CustomRouteGenericQuery>,
            res: FastifyReply
          ) => {
            res.status(500).send(`SBC Paymaster service failed to initialize. Check logs for details.`);
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
      },
      {
        prefix: "/v1",
      }
    );
  }
};

export default routes;
