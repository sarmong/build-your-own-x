const CRLF = "\r\n";
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

const matchRoute = (targetPath, currentPath) => {
  if (targetPath === currentPath) {
    return { isMatches: true, params: {} };
  }
  const targetPathParamsMatches = [...targetPath.matchAll(/\/\[:(\w+)\]/g)];
  const paramReplacements = targetPathParamsMatches.map((r) => r[0]);
  const paramNames = targetPathParamsMatches.map((r) => r[1]);

  const paramReplacementsRegex = new RegExp(
    paramReplacements.join("|").replaceAll(/[\[\]]/g, "\\$&"),
    "g",
  );

  const fullPathRegex = new RegExp(
    targetPath.replaceAll(paramReplacementsRegex, "\\/(\\w+)"),
  );

  const paramMatches = currentPath.match(fullPathRegex);

  if (!paramMatches) {
    return { isMatches: false, params: {} };
  }

  const params = paramMatches.slice(1).reduce((acc, val, idx) => {
    acc[paramNames[idx]] = val;
    return acc;
  }, {});

  return { isMatches: true, params };
};

const buildStatusLine = (status = 200) => `HTTP/1.1 ${statuses[status]} \r\n`;
const buildHeaders = (headersObj) => {
  const headers = Object.entries(headersObj);
  return headers.reduce((acc, [key, val]) => {
    acc += `${key}: ${val}` + CRLF;
    return acc;
  }, "");
};

const buildHttpResponse = ({ statusCode, headers = {}, body = "" }) => {
  if (body && !headers["Content-Type"]) {
    headers["Content-Type"] = "text/plain";
  }

  if (body) {
    headers["Content-Length"] = body.length;
  }

  return buildStatusLine(statusCode) + buildHeaders(headers) + CRLF + body;
};

module.exports = { parseRequest, matchRoute, buildHttpResponse };
