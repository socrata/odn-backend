
# Data

Scripts for loading data into the ODN.

## Adding Data

### Format

First, the dataset must be transformed into a format the the ODN can use.
Each row in the dataset contains an entity and a single value.

#### ID

The `id` column is the unique ID of the entity.



 - id: ID of the entity. Required for all datasets.
 - type: Type of the entity. Some legacy datasets exclude the `region` prefix
    on types, but it should be included on all new datasets.
    Note that `type` is only used for generating summary statistics for
    maps. It is not necessary for 
  
Take the dataset and get it in ODN format.

### Upload

Upload the dataset to Socrata. Preferably `odn.data.socrata.com`.
Make public.

### Write Data Source Declaration

Write declaration in `sources.json`.

### Update Entities


### Entities

A listing of all entities is stored in the
[ODN Entities](https://dev.socrata.com/foundry/odn.data.socrata.com/kksg-4m3m)
dataset.
Each entity has an id, name, type, and rank associated with it.

#### ID

The id of an entity is a string that identifies it.
No two entities may have the same id.
Entity IDs may contain only numbers and letters with no
punctuation or whitespace.

#### Name

Each entity has a human-readable name associated with it.
This can be any string.

#### Type

The type of an entity is used to determine whether or not
two entities are comparable. There is a hierarchy of entity types
with levels in the hierarchy separated by `.`.
For example, all geographical types are grouped under `region`
so the type of a county is `region.county`.

#### Rank

The rank of an entity denotes its importance compared to all
other entities with the same type.
For example, regions are ranked by population.
A higher rank means that the entity is more important.
Providing a rank is optional but encouraged.

### Adding Entities

#### Update [Entities](https://dev.socrata.com/foundry/odn.data.socrata.com/kksg-4m3m)

Add 

#### Update [Relations](https://dev.socrata.com/foundry/odn.data.socrata.com/dc4t-zwj5)

The relations dataset contains parent-child relations between entities.
It is used for the `/related` endpoint.

#### Update [Suggest]()


#### Update Geographies

If you added any geographical entities.

Try to find the highest resolution shapefiles that you can.
Currently all data is that the 1:500,000 scale.
Geometries are simplified on demand so this will not strain the client.

For example, [this dataset](https://dev.socrata.com/foundry/odn.data.socrata.com/rmqq-dzu4)
contains GeoJSON for the `region.place` entity type.
Each GeoJSON object should contain the `id`, `name`, and `type`
of the entity that it is associated with.



For types like `region.place` and `region.zip_code` where there are too many entities
to display at once, you can include a `rank` property to control which entities
have priority. Both `region.place` and `region.zip_code` are ranked by land area.
Once you have uploaded the GeoJSON to Socrata, you can update
[`Constants.GEO_URLS`](https://github.com/socrata/odn-backend/blob/cf930cba33528b2a56a9a0937606205e8a425857/app/constants.js#L13)
with a link to the new dataset.
If the new entity is ranked, add it to
[`Constants.GEO_RANKED`](https://github.com/socrata/odn-backend/blob/cf930cba33528b2a56a9a0937606205e8a425857/app/constants.js#L23).

### Update [Variables](https://dev.socrata.com/foundry/odn.data.socrata.com/sutp-685r)

#### Add Source Declaration

After you have uploaded a dataset to Socrata,
you can write a declaration for it.
Source declarations are stored in
[`/data/sources.json`](https://github.com/socrata/odn-backend/blob/0f4689f1cb5592f74aeca7539e33bb2e4d8e9a6c/data/sources.json).

Topics are at the top level of the source tree.
Try to find a topic that fits your dataset or create your own.

Each node in the tree may optionally specify a `name`.

Next, add your dataset to the list of datasets in the topic.
Each dataset requires the following fields:
 - `fxf`: NBE ID of the dataset.
 - `domain`: Defaults to `odn.data.socrata.com`.
 - `sources`: List of source of the data. Must be one of the sources listed [`/data/attributions.json`](https://github.com/socrata/odn-backend/blob/0f4689f1cb5592f74aeca7539e33bb2e4d8e9a6c/data/attributions.json)
- `searchTerms`: List of terms to use when searching for datasets related to this one.

Next, list out all of the variables in your dataset.
You can use a SOQL `$group` query to get all of the variables in a dataset.
For example, to get all of the variables in the [ODN Population dataset](https://odn.data.socrata.com/resource/9jg8-ki9x.json?$group=variable&$select=variable).
Give each variable a `name` or one will be inferred automatically.
Each variable may also specify a format type.
The current format types are `number` (default), `percent`, `dollar`, and `rank`.


After adding the source declaration, use the use the
[`variables.sh`](https://github.com/socrata/odn-backend/blob/424ee5c4ef8af6a63ec5ee93663a1749546dc191/data/process/variables.sh)
script to extract all of the variables from the dataset.

```sh
% ./variables.sh
Usage: variables.js {declarationFile} {datasetID} {outputFile}
```

For example, if we want to get the variables for the `demographics.population`
dataset and output them to `population-variables.csv`:

```sh
% ./variables.sh demographics.population population-variables.csv
found dataset: odn.data.socrata.com:9jg8-ki9x
processed 50000 rows...
processed 100000 rows...
processed 150000 rows...
processed 200000 rows...
processed 250000 rows...
processed 300000 rows...
processed 350000 rows...
processed 400000 rows...
processed 450000 rows...
processed 500000 rows...
processed 527786 rows...
done
```

Then, we have to append `population-variables.csv` to the
[ODN Variables](https://dev.socrata.com/foundry/odn.data.socrata.com/sutp-685r)
dataset.

The simplest way to do this is using
[Datasync](https://socrata.github.io/datasync/).
Remember to use the OBE FXF of the ODN Variables dataset.
