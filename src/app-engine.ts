import { readFileSync } from "fs";
import fetch from "cross-fetch";
import { InvokeOutput } from "insitux";
import { getInvoker } from "./ix";

/**
 * app e.g. repl
 * source e.g. Discord
 * where e.g. Insitux scripting language
 * channel e.g. insitux-bot
 */
export type Invocation = {
  app: string;
  source: string;
  where: string;
  channel: string;
  who: string;
  input: string;
};

type AppEntry = {
  name: string;
  prefix: string;
  sourceUrl: string;
};

type Directory = { apps: AppEntry[] };

export const readDirectory = () => {
  const directoryJson = readFileSync("directory.json").toString();
  const directory: Directory = JSON.parse(directoryJson);
  return directory;
};

type DoneInvocation = {
  output: string;
  errorOutput: InvokeOutput;
};

export async function handleInvocation(
  invocation: Invocation,
): Promise<DoneInvocation | null> {
  const { app: prefix, source, where, channel, who, input } = invocation;
  console.log(invocation);

  if (prefix == "repl") {
    return getInvoker(prefix, input).result;
  }

  //Find apps to invoke
  const app = readDirectory().apps.find(a => a.prefix == prefix);
  if (!app) {
    return null;
  }
  try {
    const sourceResponse = await fetch(app.sourceUrl);
    if (!sourceResponse.ok) {
      return {
        output: "",
        errorOutput: [
          {
            type: "message",
            text: `Status code ${sourceResponse.status} when fetching "${app.name}" source`,
          },
        ],
      };
    }
    const code = await sourceResponse.text();
    const { result: initResult, closure } = getInvoker(app.prefix, code);
    if (initResult.errorOutput.length) {
      return initResult;
    }
    const callResult = closure({
      kind: "call",
      call: {
        name: "handler",
        params: [
          { t: "str", v: input },
          { t: "str", v: who },
          { t: "str", v: where },
          { t: "str", v: channel },
          { t: "str", v: source },
        ],
      },
    });
    return callResult;
  } catch (e) {
    console.log(e);
    return {
      output: "",
      errorOutput: [
        {
          type: "message",
          text: `Error when fetching source for app \"${app.name}\"`,
        },
      ],
    };
  }
}
