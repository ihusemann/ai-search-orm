# Ivy ORM

A TypeScript-based "ORM" for Azure AI Search (formerly Cognitive Search). Define a schema for your AI Search indexes, indexers, and data sources, and get a strongly-typed SearchClient.

## Documentation

### Installation

```bash
npm install ivy-orm
```

### Schemas

Define a schema for your indexes, indexers, and data sources:

```ts
import { index, indexer, dataSource, string, int32 } from "orm/schema";

export const realEstate = index("realestate-us-sample-index", {
  listingId: string("listingId").key(),
  beds: int32("beds").filterable().sortable().facetable(),
  baths: int32("baths").filterable().sortable().facetable(),
  description: string("description").searchable(),
  squareFeet: int32("sqft").filterable().sortable().facetable(),
});

export const realEstateDataSource = dataSource(
  "realestate-us-sample",
  "azuresql",
  {
    connectionString: process.env.CONNECTION_STRING,
    container: {
      name: "Listings_5K_KingCounty_WA",
    },
  }
);

export const realEstateIndexer = indexer("realestate-us-sample-indexer", {
  targetIndex: realEstate,
  dataSourceName: realEstateDataSource.name,
});
```

Ivy ORM infers the appropriate TypeScript types for all fields, and maps the schema onto the underlying SearchClient. You can use all the methods you'd usually use on a SearchClient, but strongly-typed and with excellent IDE autocomplete:

```ts
const searchIndexClient = new SearchIndexClient(endpoint, identity);

const srch = connect(searchIndexClient, schema);

const data = await srch.realEstate.search(undefined, {
  top: 20,
  select: ["listingId", "description"],
});
```

### Supported Field Types

Azure AI Search ORM supports most of the [AI Search EDM data types](https://learn.microsoft.com/en-us/rest/api/searchservice/supported-data-types).

#### Primitives

```ts
// Edm.String
myField: string("myField");

// Edm.Int32
myField: int32("myField");

// Edm.Int64
myField: int64("myField");

//Edm.Double
myField: double("myField");

//Edm.Boolean
myField: boolean("myField");
```

#### Collections

```ts
// Collection(Edm.String)
myCollection: stringCollection("myCollection");

// Collection(Edm.Int32)
myCollection: int32Collection("myCollection");

// Collection(Edm.Int64)
myCollection: int64Collection("myCollection");

// Collection(Edm.Double)
myCollection: doubleCollection("myCollection");

// Collection(Edm.DateTimeOffset)
myCollection: dateCollection("myCollection");

// Collection(Edm.Boolean)
myCollection: booleanCollection("myCollection");

// Collection(Edm.ComplexType)
myCollection: collection("myCollection", {
  // ComplexType object fields
  myField: string("myField"),
});
```

### Suggesters

Add a suggester to a field in the index schema:

```ts
import { index, string } from "azure-ai-search-orm";

const hotels = index("hotels-sample-index", {
  name: string("name").suggester(),
});
```

and use AI Search's [`suggest()`](https://learn.microsoft.com/en-us/javascript/api/@azure/search-documents/searchclient?view=azure-node-latest#@azure-search-documents-searchclient-suggest) method with Typescript:

```ts
const { results } = await srch.hotels.suggest("my query", "sg", {
  select: ["name"],
  searchFields: ["name"],
});
```

`"sg"` is the default suggester name.

### Data Sources

Define the name, [type](https://learn.microsoft.com/en-us/rest/api/searchservice/data-sources/create?view=rest-searchservice-2024-07-01&tabs=HTTP#searchindexerdatasourcetype), and configuration options for the data source. See the [Azure Documentation](https://learn.microsoft.com/en-us/rest/api/searchservice/data-sources/create?view=rest-searchservice-2024-07-01&tabs=HTTP#datasourcecredentials) for more detail on the configuration options.

```ts
export const realEstateDataSource = dataSource(
  "realestate-us-sample",
  "azuresql",
  {
    connectionString: process.env.CONNECTION_STRING,
    container: {
      name: "Listings_5K_KingCounty_WA",
    },
  }
);
```

See the [Azure Documentation](https://learn.microsoft.com/en-us/azure/search/search-howto-managed-identities-sql) on defining connection strings that use a managed identity.

### Extras

Field names in the ORM don't need to match the names in the datasource. This automatically creates a field mapping in the indexer.

```ts
export const realEstate = index("realestate-us-sample-index", {
  squareFeet: int32("sqft").filterable().sortable().facetable(),
  // ^ORM field name  ^datasource column name
});
```

**Note:** This only works on top-level primitives. [Complex fields aren't supported in a field mapping](<https://learn.microsoft.com/en-us/azure/search/search-indexer-field-mappings?tabs=rest#:~:text=Complex%20fields%20aren%27t%20supported%20in%20a%20field%20mapping.%20Your%20source%20structure%20(nested%20or%20hierarchical%20structures)%20must%20exactly%20match%20the%20complex%20type%20in%20the%20index%20so%20that%20the%20default%20mappings%20work.>).
