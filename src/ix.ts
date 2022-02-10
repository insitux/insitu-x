import { InvokeOutput, invoker } from "insitux";
import { Ctx, ExternalFunction, Val, ValOrErr } from "insitux/dist/types";
import { functionInvoker } from "insitux/dist/invoker";
import { saveState, stateForName, UserState } from "./user-state";

type FuncCall = {
  name: string;
  params: Val[];
};
type InvokeCall =
  | { kind: "call"; call: FuncCall }
  | { kind: "code"; code: string };

const startTime = Date.now();

function get(state: UserState, key: string): ValOrErr {
  if (!state.vars.has(key)) {
    return { kind: "err", err: `"${key}" not found` };
  }
  return { kind: "val", value: state.vars.get(key)! };
}

function set(state: UserState, key: string, val: Val) {
  state.vars.set(key, val);
  return undefined;
}

const nullVal: Val = { t: "null", v: undefined };
const nullRet: ValOrErr = { kind: "val", value: nullVal };

function invoke(state: UserState, call: InvokeCall) {
  const functions: ExternalFunction[] = [
    {
      name: "uptime",
      definition: {},
      handler: params => ({
        kind: "val",
        value: { t: "num", v: Date.now() - startTime },
      }),
    },
  ];
  const ctx: Ctx = {
    get: key => get(state, key),
    set: (key, val) => set(state, key, val),
    exe: (name, args) => nullRet,
    env: state.env,
    print(str, withNewLine) {
      state.output += str + (withNewLine ? "\n" : "");
    },
    functions,
    loopBudget: 1e4,
    rangeBudget: 1e4,
    callBudget: 1e3,
    recurBudget: 1e4,
  };

  return call.kind == "code"
    ? invoker(ctx, call.code, undefined, true)
    : functionInvoker(ctx, call.call.name, call.call.params, true);
}

export function getInvoker(id: string, code: string) {
  const state = stateForName(id);
  const closure = (call: InvokeCall) => {
    let errorOutput: InvokeOutput = [];
    try {
      errorOutput = invoke(state, call);
    } catch (e) {
      errorOutput.push({
        type: "message",
        text: "Insitux API Error: uncaught exception.\n",
      });
      console.log(e);
    }
    const toReturn = {
      output: state.output,
      errorOutput,
    };
    state.output = "";
    saveState(id, state);
    return toReturn;
  };

  return {
    result: closure({ kind: "code", code }),
    closure,
  };
}
