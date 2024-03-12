const server = require("./lib");

const app = server();

app.get("/", (req, res) => {
  res.headers({ ["Content-Type"]: "text/html" });
  res.write("<html><body><h1>Hello World</h1></body></html>");
});

app.get("/file", (req, res) => {
  res.status(200);
});

app.get("/[:id]/create", (req, res) => {
  res.status(201);

  res.write("Created " + req.params.id);
});

app.listen(4221, () => {
  console.log("Server running on port 4221");
});
