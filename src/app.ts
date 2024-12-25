import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from "fastify";
import routes from "./routes";

async function app(
  instance: FastifyInstance,
  opts: FastifyServerOptions,
  done
) {
  instance.get("/", async (req: FastifyRequest, res: FastifyReply) => {
    res.status(200).send("custom paymaster from SBC");
  });
  instance.register(routes, { prefix: "/rpc/v1" });
  done();
}

export default app;
