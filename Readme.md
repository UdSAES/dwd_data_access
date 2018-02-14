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

