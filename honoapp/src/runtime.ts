import type { NetworkInterfaceInfo } from "node:os";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";

export type EnvOptions = Pick<Runtime, "CWD_PATH" | "HONO_PATH">

class Runtime {
  CWD_PATH: string;
  CODEX_PATH: string;
  ZUSTAND_PATH: string;
  HOSTNAME = "";
  PORT = 3000;
  ORIGIN = "";
  HONO_PATH: string;
  TSX_CLI_PATH: string;
  HOOK_USER_COMMAND = "";
  HOOK_ASSISTANT_COMMAND = "";

  constructor() {
    const { CWD_PATH, HONO_PATH } = process.env as EnvOptions
    if (!CWD_PATH||!HONO_PATH) throw new Error("CWD_PATH ||HONO_PATH  is required");
    this.CWD_PATH = this.pathNormalize(CWD_PATH);
    this.HONO_PATH = this.pathNormalize(HONO_PATH);
    this.CODEX_PATH = join(this.CWD_PATH, ".codex");
    this.ZUSTAND_PATH = join(this.CWD_PATH, ".zustand");
    this.TSX_CLI_PATH = join(this.HONO_PATH, "node_modules", "tsx", "dist", "cli.mjs");
  }

  devInit() {
    this.HOSTNAME = this.privateHostnameGet();
    this.portSync();
  }

  portNext() {
    this.PORT += 1;
    this.portSync();
  }

  private portSync() {
    const hookCommand = [
      "node",
      JSON.stringify(this.toCommandPath(this.TSX_CLI_PATH)),
      JSON.stringify(this.toCommandPath(join(this.HONO_PATH, "src","sse", "hookReceive.ts"))),
      "hook",
      JSON.stringify(this.toCommandPath(this.CODEX_PATH)),
      JSON.stringify(this.toCommandPath(this.HONO_PATH)),
      JSON.stringify(this.HOSTNAME),
      this.PORT,
    ].join(" ");
    this.ORIGIN = `http://${this.HOSTNAME}:${this.PORT}`;
    this.HOOK_USER_COMMAND = `${hookCommand} user`;
    this.HOOK_ASSISTANT_COMMAND = `${hookCommand} assistant`;
  }

  private privateHostnameGet() {
    const addresses = Object.values(networkInterfaces())
      .flat()
      .filter((address): address is NetworkInterfaceInfo => (
        address !== undefined && address.family === "IPv4" && !address.internal
      ))
      .map((address) => address.address);
    const hostname = addresses.find((address) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address));
    if (!hostname) {
      throw new Error(`Cannot find a private LAN IPv4 address. Available external IPv4 addresses: ${addresses.join(", ")}`);
    }
    return hostname;
  }

  private toCommandPath(value: string) {
    return value.replaceAll("\\", "/");
  }

  private pathNormalize(value: string) {
    return resolve(value).replace(/^([a-z]):/, (_, drive: string) => `${drive.toUpperCase()}:`);
  }
}

const runtime = new Runtime();

export default runtime;
