
# Data

Scripts for loading data into the ODN.

## Adding Data

### Format

First, the dataset must be transformed into a format the the ODN can use.
Each row in the dataset contains an entity, variable, value, and a set of constraints.

Every dataset must have the following columns:
 - `id`: Entity ID (`0400000US53`)
 - `type`: Entity type. (`region.state`)
 - `variable`: Variable ID. (`population`)
 - `value`: Value of the variable for the entity. (`6919450`)

A `name` column can also be included, however since this is already available
in the ODN Entities dataset it is not necessary.

Other columns may be added to specify dataset constraints..
For example, if we had a dataset containing population by year,
we would use `population` as the variable and add a constraint
column called `year`. The dataset would look like this:

```csv
id,name,type,year,variable,value
0400000US53,Washington,region.state,2014,population,6919450
0400000US53,Washington,region.state,2015,population,6970450
0400000US53,Washington,region.state,2016,population,7023970
```

You can include any number of constraint columns,
For example, the occupation dataset has `occupation` and `year` constraints:

```csv
id,name,type,year,occupation,variable,value
0400000US53,Washington,region.state,Farming,2014,count,6346
0400000US53,Washington,region.state,Farming,2015,count,6330
0400000US53,Washington,region.state,Farming,2016,count,6290
```

This schema is preferable to having a separate variable for each occupation or year.

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

First, create a local CSV file containing a list of the new entities.
For example, if we wanted to add Canada to the ODN:

```csv
id,name,type,rank
CA,Canada,region.nation,35100000
CABC,British Columbia,region.province,4631000
...
```

#### Update [Entities](https://dev.socrata.com/foundry/odn.data.socrata.com/kksg-4m3m)

Append your entity CSV file to the [ODN Entities](https://dev.socrata.com/foundry/odn.data.socrata.com/kksg-4m3m) dataset.

#### Update [Relations](https://dev.socrata.com/foundry/odn.data.socrata.com/dc4t-zwj5)

If the new entities are hierarchically related to each other,
update the [ODN Relations](https://dev.socrata.com/foundry/odn.data.socrata.com/dc4t-zwj5) dataset.
This dataset contains parent-child relations between entities
from which sibling relationships can be inferred.
It is used for the `/related` endpoint.

To add Canada as a parent of B.C., we would add the following line to the relations dataset:

```
parent_id,parent_name,parent_type,parent_rank,child_id,child_name,child_type,child_rank
CA,Canada,region.nation,35100000,CABC,British Columbia,region.province,4631000
```

#### Update [Suggest]()

TODO: Write a script that takes entities dataset and generates autosuggest dataset.

#### Update Geographies

If you added any geographical entities that you want to be able to map,
you must find and upload geography files.

First, try to find the highest resolution shapefiles that you can.
Currently all data from the [Census](https://www.census.gov/geo/maps-data/data/tiger-cart-boundary.html)
is that the 1:500,000 scale.

Next, transform the source files into GeoJSON.
[`ogr2ogr`](http://www.gdal.org/ogr2ogr.html) can help with this.

Then, map each GeoJSON feature to an ODN Entity by adding `id`, `name`, `type`.
If there are too many features to map at once (>1000),
you should include a `rank` property that will be used to 
prioritize which entities are displayed.
A higher rank denotes higher priority.

Now, upload the geographical dataset to Socrata.

Once the upload is done, get a link to the new dataset and update
[`Constants.GEO_URLS`](https://github.com/socrata/odn-backend/blob/cf930cba33528b2a56a9a0937606205e8a425857/app/constants.js#L13).

If you added a `rank` property, add the entity type to 
[`Constants.GEO_RANKED`](https://github.com/socrata/odn-backend/blob/cf930cba33528b2a56a9a0937606205e8a425857/app/constants.js#L23).

Now, you should be able to render maps of the new entity type.

### Update [Variables](https://dev.socrata.com/foundry/odn.data.socrata.com/sutp-685r)

The [ODN Variables](https://dev.socrata.com/foundry/odn.data.socrata.com/sutp-685r)
lets us quickly figure out which variables are available for a given entity.

For example,

```csv
id,variable
0400000US53,demographics.population.count
```

From this, we know that the `demographics.population.count` variable
is available for the entity `04000000US53` (Washington State).
To update this dataset, you must first create a source declaration.

#### Add Source Declaration

Source declarations tell the ODN how to categorize, name, and locate each dataset.
They also tell the ODN which variables are in the dataset.

All source declarations are stored in [`/data/sources.json`](https://github.com/socrata/odn-backend/blob/0f4689f1cb5592f74aeca7539e33bb2e4d8e9a6c/data/sources.json).

The first level of declarations are topics.
These are broad groupings of datasets like `demographics`, `education`, and `crime`.
Each topic contains many datasets.

Each dataset represents a Socrata dataset.
Datasets must contain the following properties:
 - `fxf`: NBE ID of the dataset.
 - `domain`: Defaults to `odn.data.socrata.com`.
 - `sources`: List of source of the data. Must be one of the sources listed [`/data/attributions.json`](https://github.com/socrata/odn-backend/blob/0f4689f1cb5592f74aeca7539e33bb2e4d8e9a6c/data/attributions.json)
 - `searchTerms`: List of terms to use when searching for datasets related to this one.

Each dataset must also contain a list of variables.
You can use a SOQL `$group` query to get all of the variables in a dataset.
For example, to get all of the variables in the [ODN Population dataset](https://odn.data.socrata.com/resource/9jg8-ki9x.json?$group=variable&$select=variable).
Each variable may also specify a format type.
The current format types are `number` (default), `percent`, `dollar`, and `rank`.

For example, this is the source declaration for the `demographics.population` dataset:

```json
{
    "demographics": {
        "datasets": {
            "population": {
                "fxf": "9jg8-ki9x",
                "constraints": ["year"],
                "variables": {
                    "count": {"name": "population"},
                    "change": {
                        "name": "annual population change",
                        "description": "Percent change from the previous year",
                        "type": "percent"
                    }
                },
                "searchTerms": ["population", "household", "demographics", "ethnicity", "minority"],
                "sources": ["acs"]
            }
        }
    }
}
```

#### Generate Variables

After adding the source declaration, use the use the
[`variables.sh`](https://github.com/socrata/odn-backend/blob/424ee5c4ef8af6a63ec5ee93663a1749546dc191/data/process/variables.sh)
script to extract all of the variables from the dataset.

```sh
% ./variables.sh
Usage: variables.js {datasetID} {outputFile}
```

For example, if we want to get the variables for the `demographics.population`
dataset dataset and output them to `population-variables.csv`:

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
