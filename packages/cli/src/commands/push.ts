import { boolean, command } from "@drizzle-team/brocli";
import { baseOptions, baseTransform } from "./base";
import prompts from "prompts";
import { getExistingIndexes } from "src/util/ai-search";
import { AnyIndex, AnyIndexer } from "ivy-orm";
import chalk from "chalk";

const options = {
  ...baseOptions,
  force: boolean()
    .alias("-f")
    .default(false)
    .desc("don't prompt to overwrite existing indexes/indexers/data sources."),
};

export const push = command({
  name: "push",
  options,
  transform: baseTransform<typeof options>,
  handler: async ({
    schemaExports: { indexes, indexers },
    force,
    endpoint,
    credential,
    searchIndexClient,
    searchIndexerClient,
  }) => {
    // ---------------------
    // ----   INDEXES   ----
    // ---------------------

    const indexesResponsePromise = prompts({
      type: "multiselect",
      name: "indexes",
      message: "Which indexes would you like to create/update?",
      hint: "Space to select. A to toggle all. Enter to submit.",
      instructions: false,
      choices: Object.entries(indexes).map(([name, index]) => ({
        title: name,
        description: index.name,
        value: index,
      })),
    });

    const getExistingIndexesPromise = getExistingIndexes(searchIndexClient);

    const [indexesResponse, existingIndexes] = await Promise.all([
      indexesResponsePromise,
      getExistingIndexesPromise,
    ]);

    const ora = (await import("ora")).default;

    // confirm overwrite
    if (!force) {
      const indexesToOverwrite = (indexesResponse.indexes as AnyIndex[]).filter(
        ({ name }) => existingIndexes.includes(name)
      );

      if (indexesToOverwrite.length > 0) {
        const confirm = await prompts({
          type: "confirm",
          name: "overwrite",
          message: `This operation will overwrite ${indexesToOverwrite.length > 1 ? "indexes" : "index"} ${indexesToOverwrite.map(({ name }) => chalk.green(name)).join(", ")}.  Continue?`,
        });

        if (!confirm.overwrite) process.exit(0);
      }
    }

    const createIndexesSpinner = ora("Creating indexes...").start();

    const indexesToCreate = indexesResponse.indexes as AnyIndex[];

    for await (const index of indexesToCreate) {
      if (existingIndexes.includes(index.name)) {
        createIndexesSpinner.text = `Deleting ${index.name}...`;
        await searchIndexClient.deleteIndex(index.name);
      }

      createIndexesSpinner.text = `Creating ${index.name}...`;
      await searchIndexClient.createIndex(index["build"]());
    }

    createIndexesSpinner.text = "Created indexes";
    createIndexesSpinner.succeed();

    // ----------------------
    // ----   INDEXERS   ----
    // ----------------------

    const idxrResponsePromise = prompts({
      type: "multiselect",
      name: "indexers",
      message: "Which indexers would you like to create/update?",
      hint: "Space to select. A to toggle all. Enter to submit.",
      instructions: false,
      choices: Object.entries(indexers).map(([name, indexer]) => ({
        title: name,
        description: indexer.name,
        value: indexer,
        disabled: ![
          ...existingIndexes,
          ...indexesToCreate.map(({ name }) => name),
        ].includes(indexer.targetIndexName),
      })),
    });

    const existingIndexersPromise = searchIndexerClient.listIndexersNames();

    const [indexersResponse, existingIndexers] = await Promise.all([
      idxrResponsePromise,
      existingIndexersPromise,
    ]);

    const indexersToCreate = indexersResponse.indexers as AnyIndexer[];

    // confirm overwrite
    if (!force) {
      const indexersToOverwrite = indexersToCreate.filter(({ name }) =>
        existingIndexers.includes(name)
      );

      if (indexersToOverwrite.length > 0) {
        const confirm = await prompts({
          type: "confirm",
          name: "overwrite",
          message: `This operation will overwrite ${indexersToOverwrite.length > 1 ? "indexers" : "indexer"} ${indexersToOverwrite.map(({ name }) => chalk.green(name)).join(", ")}.  Continue?`,
        });

        if (!confirm.overwrite) process.exit(0);
      }
    }

    const createIndexersSpinner = ora("Creating indexers...").start();
    for await (const indexer of indexersToCreate) {
      if (existingIndexers.includes(indexer.name)) {
        createIndexersSpinner.text = `Deleting indexer ${indexer.name}`;
        await searchIndexerClient.deleteIndexer(indexer.name);
      }

      createIndexersSpinner.text = `Creating indexer ${indexer.name}`;
      await searchIndexerClient.createIndexer(indexer);
    }

    createIndexersSpinner.text = "Created indexers";
    createIndexersSpinner.succeed();

    ora("Done!").succeed();
  },
});