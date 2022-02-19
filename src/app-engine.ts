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
  offerHttp?: boolean;
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
  const { app: prefix, input } = invocation;
  console.log(invocation);

  if (prefix == "repl") {
    return getInvoker(prefix, input).result;
  }

  //Find apps to invoke
  const app = readDirectory().apps.find(a => a.prefix == prefix);
  if (!app) {
    return null;
  }
  return await handleAppInvocation(app, invocation);
}

type CacheEntry<T> = { when: number; data: T };
const cache = new Map<string, CacheEntry<string>>();
const cacheGet = (key: string) => {
  if (cache.has(key)) {
    const entry = cache.get(key)!;
    if (entry.when + 10_000 < Date.now()) {
      cache.delete(key);
    } else {
      return entry.data;
    }
  }
};
const cacheSet = (key: string, data: string) => {
  cache.set(key, { when: Date.now(), data });
};

const err = (text: string) =>
  <DoneInvocation>{
    output: "",
    errorOutput: [{ type: "message", text }],
  };

export async function handleAppInvocation(
  app: AppEntry,
  invocation: Invocation,
): Promise<DoneInvocation> {
  const { source, where, channel, who, input } = invocation;

  try {
    let code = cacheGet(app.sourceUrl);

    //If not already cached, download again
    if (!code) {
      console.log(`Downloading ${app.prefix}`);
      const sourceResponse = await fetch(app.sourceUrl);
      if (!sourceResponse.ok) {
        return err(
          `Status code ${sourceResponse.status} when fetching "${app.name}" source`,
        );
      }
      code = await sourceResponse.text();
      cacheSet(app.sourceUrl, code);
    }

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
    return err(`Error when fetching source for app \"${app.name}\"`);
  }
}
