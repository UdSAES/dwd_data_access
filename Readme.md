# dwd_forecast_service
`dwd_forecast_service` is a micro service that offers a REST-API to query weather forecasts based on data that has been downloaded from [opendata.dwd.de](http://opendata.dwd.de) by micro service `dwd_data_crawler`.

## Usage
The micro service is configured via the following environment variables:
* `LISTEN_PORT`: The TCP port the micro service is listening for incoming requests.
* `DATA_ROOT_PATH`: The path to the storage directory where `dwd_data_crawler` is storing the files downloaded from opendata.dwd.de.
* `NEWEST_FORECAST_ROOT_PATH`: The path to the directory where the micro service shall store the newest forecasts for the predefined pois (Points of interest).

Sample call
```
$ LISTEN_PORT=12345 DATA_ROOT_PATH=/home/service/DWD_data_storage \
  NEWEST_FORECAST_ROOT_PATH=/home/service/forecast_storage \
  node index.js
```

## Basic idea
The basic idea of the micro service `dwd_forecast_service`is to provide weather forecast information based on data previously downloaded by the micro service `dwd_data_crawler` from opendata.dwd.de. Thus, `dwd_forecast_service` itself does not query from opendata.dwd.de directly. This approach has two significant advanteges:
1. Forecast information can be provided even if a connection to opendata.dwd.de is not available (e.g. due to a connection malfunction or if a connection is not possible due to security reasons).
2. As `dwd_data_crawler` is storing data from opendata.dwd.de in a file structure which prevents overriding of data (as it is done by opendata.dwd.de) it is possible to provide historical forecasts which might be interesting for research activities.

The interaction between `opendata.dwd.de`, `dwd_data_crawler` and `dwd_forecast_service` is shown in the following diagram.
<img src="./docs/interaction.svg" width="600">
