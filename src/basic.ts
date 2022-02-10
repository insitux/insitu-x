/*
import { Application, Request, Response } from "express";
import { invokeFor } from "./ix";

function basic(input = "", output = "") {
  return `<form action="basic" method="POST">
    <input name="input" autofocus>
  </form>
  <pre>${input}</pre>
  <pre>${output}</pre>`;
}

export function initBasicEndpoint(app: Application) {
  app.get("/basic", (req: Request, res: Response) => {
    res.send(basic());
  });
  app.post("/basic", async (req: Request, res: Response) => {
    if (!req.body.input) {
      res.send(basic());
      return;
    }
    const { output, errorOutput } = invokeFor({
      code: req.body.input,
      source: "basic",
      who: "anon",
      where: "web",
    });
    const eOut = errorOutput.map(e => e.text).join("");
    res.send(basic(req.body.input, output + eOut));
  });
}
*/