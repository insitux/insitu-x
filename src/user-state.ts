import { existsSync, readFileSync, writeFileSync } from "fs";
import { Val } from "insitux/node/types";

export type UserState = {
  vars: {[key: string]: Val};
  output: string;
  env: { funcs: {}; vars: {}; lets: [] };
  time: number;
};

const pathForName = (name: string): string => `apps/${name}.json`;

export function saveState(name: string, state: UserState) {
  const path = pathForName(name);
  writeFileSync(path, JSON.stringify(state, null, 2));
}

export function stateForName(name: string): UserState {
  const path = pathForName(name);
  if (!existsSync(path)) {
    const state = <UserState>{
      vars: {},
      output: "",
      env: { funcs: {}, vars: {}, lets: [] },
      time: new Date().getTime(),
    };
    saveState(name, state);
  }
  return JSON.parse(readFileSync(path).toString());
}
