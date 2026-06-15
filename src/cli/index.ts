#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
    .name("hive")
    .description("🐝 Hive CLI - Development Manager")
    .version("1.0.0");

if (process.argv.length === 2) {
    program.outputHelp();
    process.exit(0);
}

program.parse(process.argv);