import express, { Application, Request, Response } from "express";
import cors from "cors";
import { json, urlencoded, text } from "body-parser";
import session from "express-session";
import {
  handleAppInvocation,
  handleInvocation,
  Invocation,
  readDirectory,
} from "./app-engine";
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
app.use(text({ type: "*/*" }));
app.use(urlencoded({ extended: false }));

const tokenReplacedHtml = (file: string, token: string, replacement: string) =>
  readFileSync(`www/${file}.html`)
    .toString()
    .replace(`<!--${token}-->`, replacement);

app.use(async (req, res, next) => {
  const prefix = req.url.match(/\/(.+?)(?:\/|$)/)?.[1];
  const app = readDirectory().apps.find(a => a.prefix == prefix);
  if (app) {
    if (!app.offerHttp) {
      res
        .status(418)
        .send(
          `Application '${prefix}' responds only to Discord bot invocation.`,
        );
      return;
    }
    const invocation: Invocation = {
      app: prefix!,
      where: req.method,
      channel: req.url,
      source: "web",
      input: typeof req.body == "string" ? req.body : "",
      who: req.ip.toString(),
    };
    console.log(JSON.stringify(invocation));
    const invocationResult = await handleAppInvocation(app, invocation);
    if (!invocationResult) {
      res.status(418).send(`No application '${invocation.app}'`);
      return;
    }
    const { output, errorOutput } = invocationResult;
    if (errorOutput.length) {
      const errors = errorOutput
        .map(({ type, text }) =>
          type == "message" ? `<m>${text}</m>` : `<e>${text}</e>`,
        )
        .join("");
      res.send(tokenReplacedHtml("error", "errors", errors));
    } else {
      res.send(output);
    }
  } else {
    next();
  }
});

app.get("/", (req: Request, res: Response) => {
  const { apps } = readDirectory();
  const lis = apps.map(app => {
    const webUrl = app.offerHttp
      ? ` | <a href="/${app.prefix}">webpage</a>`
      : "";
    return `<li>!${app.prefix} &ndash; ${app.name}<br><a href="${app.sourceUrl}">source</a>${webUrl}</li>`;
  });
  res.send(tokenReplacedHtml("index", "list", lis.join("")));
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
