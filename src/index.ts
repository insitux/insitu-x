import express, { Application, Request, Response } from "express";
import cors from "cors";
import { json, urlencoded } from "body-parser";
import session from "express-session";
import { handleInvocation, Invocation, readDirectory } from "./app-engine";
import { readFileSync } from "fs";

const app: Application = express();

app.use(json());
app.use(cors());
app.use(
  session({
    secret: "it's not even important",
    resave: true,
    saveUninitialized: true,
  }),
);
app.use(urlencoded({ extended: false }));
app.get("/", (req: Request, res: Response) => {
  const { apps } = readDirectory();
  const lis = apps.map(
    app =>
      `<li><a href="${app.sourceUrl}">!${app.prefix} &ndash; ${app.name}</a></li>`,
  );
  res.send(
    readFileSync("index.html")
      .toString()
      .replace("<!--list-->", lis.join("\n    ")),
  );
});

app.post("/", async (req: Request, res: Response) => {
  const invocation: Invocation = req.body;
  const { app, source, where, channel, who, input } = invocation;
  if (
    !app ||
    !source ||
    !where ||
    !channel ||
    !who ||
    !("input" in invocation) ||
    !["Discord", "web"].includes(source)
  ) {
    res.status(400)
      .send(`needs to be { app, source, where, channel, who, input }
source must be ["Discord" "web"]`);
    return;
  }
  const invocationResult = await handleInvocation(invocation);
  if (!invocationResult) {
    res.status(418).send(`No application '${invocation.app}'`);
    return;
  }
  const { output, errorOutput } = invocationResult;
  res.send(JSON.stringify({ output, errorOutput }));
});

//initBasicEndpoint(app);

const port = 3000;
app.listen(port, () => {
  console.log(`server started on port ${port}`);
});
