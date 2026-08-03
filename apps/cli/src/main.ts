#!/usr/bin/env node
import { LocalDateSchema, type Outcome } from "@saltzer/domain";
import { SaltzerApiError, SaltzerClient } from "@saltzer/sdk";
import { Command } from "commander";
import { localDateNow } from "./date.js";

const program = new Command();
program
  .name("saltzer")
  .description("Decide and execute what matters today.")
  .version("0.1.0")
  .option(
    "--api-url <url>",
    "Saltzer API URL",
    process.env.SALTZER_API_URL ?? "http://localhost:4100",
  )
  .option("--token <token>", "Saltzer API token", process.env.SALTZER_TOKEN)
  .option("--json", "Print machine-readable JSON", false);

function client(): SaltzerClient {
  const options = program.opts<{ apiUrl: string; token?: string }>();
  if (!options.token) {
    throw new Error("SALTZER_TOKEN is required. Create a token in the Saltzer app first.");
  }
  return new SaltzerClient({ baseUrl: options.apiUrl, token: options.token });
}

function date(value?: string) {
  return value ? LocalDateSchema.parse(value) : localDateNow();
}

function print(value: unknown): void {
  if (program.opts<{ json: boolean }>().json) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }

  if (Array.isArray(value)) {
    for (const outcome of value as Outcome[]) {
      const marker =
        outcome.status === "completed" ? "✓" : outcome.status === "released" ? "−" : "○";
      process.stdout.write(`${marker} ${outcome.id.slice(0, 8)}  ${outcome.title}\n`);
    }
    if (value.length === 0) process.stdout.write("No outcomes. Choose what matters today.\n");
    return;
  }

  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

program
  .command("today")
  .description("Show today's Daily Contract")
  .option("--date <date>", "Local date in YYYY-MM-DD")
  .action(async (options: { date?: string }) => {
    const view = await client().today(date(options.date));
    print(view.contract?.outcomes ?? []);
    if (!program.opts<{ json: boolean }>().json && view.scheduledCandidates.length > 0) {
      process.stdout.write(
        `\n${view.scheduledCandidates.length} scheduled outcome(s) are ready for review.\n`,
      );
    }
  });

program
  .command("add")
  .description("Add one meaningful outcome to the Daily Contract")
  .argument("<title>")
  .option("--date <date>", "Local date in YYYY-MM-DD")
  .option("--outcome <text>", "Desired result", "")
  .option("--context <text>", "Relevant context", "")
  .option("--constraints <text>", "Constraints", "")
  .option("--minutes <number>", "Estimated minutes", Number.parseInt)
  .action(
    async (
      title: string,
      options: {
        date?: string;
        outcome: string;
        context: string;
        constraints: string;
        minutes?: number;
      },
    ) => {
      const created = await client().addOutcome(date(options.date), {
        title,
        desiredOutcome: options.outcome,
        context: options.context,
        constraints: options.constraints,
        estimateMinutes: options.minutes ?? null,
        aiPermissions: ["read_context", "suggest", "draft"],
      });
      print(created);
    },
  );

for (const decision of ["complete", "release", "tomorrow"] as const) {
  program
    .command(decision)
    .description(`${decision[0]?.toUpperCase()}${decision.slice(1)} an outcome`)
    .argument("<id>")
    .option("--date <date>", "Current local date in YYYY-MM-DD")
    .action(async (id: string, options: { date?: string }) => {
      print(await client().decideOutcome(id, date(options.date), { decision }));
    });
}

program
  .command("schedule")
  .description("Move an outcome to a deliberate future date")
  .argument("<id>")
  .argument("<target-date>")
  .option("--date <date>", "Current local date in YYYY-MM-DD")
  .action(async (id: string, targetDate: string, options: { date?: string }) => {
    print(
      await client().decideOutcome(id, date(options.date), {
        decision: "schedule",
        targetDate: LocalDateSchema.parse(targetDate),
      }),
    );
  });

program
  .command("context")
  .description("Print the permissioned AI context packet")
  .argument("<id>")
  .option("--date <date>", "Current local date in YYYY-MM-DD")
  .action(async (id: string, options: { date?: string }) => {
    print(await client().contextPacket(id, date(options.date)));
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Saltzer command failed.";
  if (error instanceof SaltzerApiError && error.code) {
    process.stderr.write(`${error.code}: ${message}\n`);
  } else {
    process.stderr.write(`${message}\n`);
  }
  process.exitCode = 1;
});
