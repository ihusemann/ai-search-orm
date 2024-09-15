import {
  SearchIndexClient,
  SearchIndexerClient,
} from "@azure/search-documents";
import { boolean, string, TypeOf } from "@drizzle-team/brocli";
import chalk from "chalk";
import { cosmiconfig } from "cosmiconfig";
import path from "path";
import { configSchema } from "src/util/config";
import { ensureCredential } from "src/util/credential";
import { readSchema } from "src/util/schema";
import { ZodError } from "zod";

export const baseOptions = {
  schema: string().desc(
    "path to the schema file. overrides schema defined in ivy-kit.config.ts."
  ),
  cwd: string().desc("the working directory.").default(process.cwd()),
};

export async function baseTransform<T extends object = {}>(
  opts: TypeOf<typeof baseOptions & T>
) {
  // read & parse config
  const explorer = cosmiconfig("ivy-kit");
  const result = await explorer.search(opts.cwd);

  if (!result)
    throw new Error(
      `Configuration is missing.  Please add ${chalk.green("ivy-kit.config.ts")} to your project root.`
    );

  const configSchemaResult = configSchema.safeParse(result.config);

  if (!configSchemaResult.success) {
    const message = `Invalid configuration at '${result.filepath}'.\nField(s) ${Object.keys(
      configSchemaResult.error.flatten().fieldErrors
    ).join(", ")} are invalid.`;
    throw new Error(chalk.red(message));
  }

  const config = configSchemaResult.data;

  await ensureCredential(config.credential);

  const schema = opts.schema || config.schema;

  // read & parse schema
  const schemaExports = readSchema(path.join(opts.cwd, schema));

  const searchIndexClient = new SearchIndexClient(
    config.endpoint,
    config.credential
  );
  const searchIndexerClient = new SearchIndexerClient(
    config.endpoint,
    config.credential
  );

  return {
    ...opts,
    ...config,
    schema,
    schemaExports,
    searchIndexClient,
    searchIndexerClient,
  };
}