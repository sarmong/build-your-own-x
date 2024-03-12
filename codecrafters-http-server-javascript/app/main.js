const net = require("net");
const fs = require("fs");
const path = require("path");

const CRLF = "\r\n";

const CWD = process.argv[2] === "--directory" ? process.argv[3] : null;

const statuses = {
  200: "200 OK",
  201: "201 Created",
  404: "404 Not Found",
};

const parseHeaders = (headers) => {
  return headers.reduce((acc, header) => {
    const [key, value] = header.split(": ");
    acc[key] = value;
    return acc;
  }, {});
};

const parseRequest = (req) => {
  const headerEndIndex = req.indexOf(CRLF + CRLF);
  const statusLineAndHeaders = req.substring(0, headerEndIndex);
  const body = req.substring(headerEndIndex + CRLF.length + CRLF.length);
  const [statusLine, ...headers] = statusLineAndHeaders.split(CRLF);
  const parsedHeaders = parseHeaders(headers);

  const [method, path] = statusLine.split(" ");

  return {
    method,
    path,
    headers: parsedHeaders,
    body,
  };
};

function getFileData(filepath) {
  const binaryData = fs.readFileSync(filepath);
  return binaryData.toString();
}

const getStatusLine = (status) => `HTTP/1.1 ${statuses[status]} \r\n`;
const getHeaders = (headersObj) => {
  const headers = Object.entries(headersObj);
  return headers.reduce((acc, [key, val]) => {
    acc += `${key}: ${val}` + CRLF;
    return acc;
  }, "");
};

const getDefaultHeaders = (len) =>
  getHeaders({ ["Content-Type"]: "text/plain", ["Content-Length"]: len });

const buildDefaultResponse = (body, status) => {
  if (status === 404) {
    return getStatusLine(status) + CRLF;
  }

  return getStatusLine(status) + getDefaultHeaders(body.length) + CRLF + body;
};

const buildFileResponse = (dir, filename) => {
  const filepath = `${dir}/${filename}`;
  const isFileExists = fs.existsSync(filepath);

  if (!isFileExists) {
    return getStatusLine(404) + CRLF;
  }

  const body = getFileData(filepath);

  return (
    getStatusLine(200) +
    getHeaders({
      ["Content-Type"]: "application/octet-stream",
      ["Content-Length"]: body.length,
    }) +
    CRLF +
    body
  );
};

const saveFile = (dir, filename, content) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content);

  return (
    getStatusLine(201) +
    getHeaders({
      ["Content-Type"]: "text/plain",
      ["Content-Length"]: content.length,
    }) +
    CRLF +
    content
  );
};

const server = net.createServer((socket) => {
  socket.on("close", () => {
    socket.end();
    // server.close();
  });

  socket.on("data", (data) => {
    const req = data.toString();
    const { method, path, headers, body } = parseRequest(req);

    const [_root, main, ...rest] = path.split("/");

    if (path === "/") {
      socket.write(getStatusLine(200) + CRLF);
    } else if (main === "user-agent") {
      socket.write(buildDefaultResponse(headers["User-Agent"], 200));
    } else if (main === "echo") {
      socket.write(buildDefaultResponse(rest.join("/"), 200));
    } else if (method === "GET" && main === "files" && CWD) {
      socket.write(buildFileResponse(CWD, rest.join("/")));
    } else if (method === "POST" && main === "files" && CWD) {
      socket.write(saveFile(CWD, rest.join("/"), body));
    } else {
      socket.write(buildDefaultResponse(undefined, 404));
    }

    socket.end();
  });
});

server.listen({
  port: 4221,
  host: "127.0.0.1",
});
