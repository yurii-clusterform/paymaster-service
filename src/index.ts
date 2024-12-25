import Fastify from "fastify";
import routes from "./routes";

async function start(port = 3000) {
  const app = Fastify({});

  app.register(routes, {
    prefix: "/",
  });

  await app.listen({ host: "0.0.0.0", port });
}

const PORT = Number(process.env.PORT) || 3000;

start(PORT)
  .then(() => {
    console.log(`Running on http://0.0.0.0:${PORT}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
