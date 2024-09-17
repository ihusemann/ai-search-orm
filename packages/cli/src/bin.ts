#!/usr/bin/env node
require("esbuild-register");
import { run } from "@drizzle-team/brocli";
import { push } from "./commands/push";
import { generate } from "./commands/generate";
import { migrate } from "./commands/migrate";
import { pull } from "./commands/pull";

run([push, generate, migrate, pull]);
