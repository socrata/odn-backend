
# Data

Scripts for loading data into the ODN.

## Adding Data

### Format

Take the dataset and get it in ODN format.

### Upload

Upload the dataset to Socrata. Preferably `odn.data.socrata.com`.
Make public.

### Write Data Source Declaration

Write declaration in `sources.json`.

### Update Entities

Update entities dataset with any new entities.

#### Update Geographies

If you added any geographical entities, update geographies dataset.

### Update Relations

Optionally update relations dataset for `/related` endpoint.

### Update Variables

Update the ODN Variables dataset.
After updating the source declaration in `sources.json`,
use the `process/variables.js` script to extract all of the variables from
the dataset.

```sh
% node process/variables.js demographics.population population-variables.csv
Usage: variables.js {declarationFile} {datasetID} {outputFile}
```

For example, if we have have source declarations in `sources.json`
and we want to get the variables for the `demographics.population` dataset:

```sh
% node process/variables.js sources.json demographics.population population-variables.csv
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
Remember to use the OBE FXF of the dataset.

