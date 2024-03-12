const net = require("node:net");
const { parseRequest, matchRoute, buildHttpResponse } = require("./util");

const getResponseObject = () => {
  const httpResponse = {
    status: 200,
    headers: {},
    body: undefined,
  };
  const responseObj = {
    status(code) {
      httpResponse.statusCode = code;
    },
    write(data) {
      httpResponse.body = data;
    },
    headers(headers) {
      httpResponse.headers = {
        ...httpResponse.headers,
        ...headers,
      };
    },
  };

  return { responseObj, httpResponse };
};

const server = () => {
  const handlers = { GET: [], POST: [] };

  return {
    listen(port = 4221, handler) {
      const server = net.createServer((socket) => {
        socket.on("close", () => {
          socket.end();
        });

        socket.on("data", (data) => {
          const rawRequest = data.toString();
          const req = parseRequest(rawRequest);

          for (const [path, handler] of handlers[req.method]) {
            const { isMatches, params } = matchRoute(path, req.path);
            const { responseObj, httpResponse } = getResponseObject();
            if (isMatches) {
              handler({ ...req, params }, responseObj);
              socket.write(buildHttpResponse(httpResponse));
              socket.end();
              break;
            }
          }
          // if there was no handler for the path, send 404 and close
          if (socket.readyState === "open") {
            socket.write(buildHttpResponse({ statusCode: 404 }));
            socket.end();
          }
        });
      });

      server.listen(
        {
          port: port,
          host: "127.0.0.1",
        },
        handler,
      );
    },

    get(path, handler) {
      handlers.GET.push([path, handler]);
    },
    post(path, handler) {
      handlers.POST.push([path, handler]);
    },
  };
};

module.exports = server;
