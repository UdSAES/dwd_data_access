# REST
Restful APIs shall stick to the following rules:
  - Non-optional parameters must be encoded in the URL path
  - Optional parameters must be encoded as query parameters
  - Requests that only query information that is
    - either already available or
    - can be generated "in realtime" "on the fly"
    shall be queried using the HTTP verb GET

Example for weather service:

GET /forecast24/{voi}/{lon}/{lat}?{starttime=<starttime}}

with:
  - {voi}: non-optional parameter that encodes the "value of interes" (e.g. "wind speed")
  - {lon}: non-optional parameter that encodes the "longitude" of the location for which to retrieve the forecast (e.g. "7.014" which means 7.014 °E)
  - {lat}: non-optional parameter that encodes the "latitude" of the location for which to retrieve the forecast (e.g. "49.239" which means 49.239 °N)
  - {starttime=<starttime}}: optional parameter that encodes the point of time when the prognosis has been generated (e.g. "1516244400" which means unix timestamp for 18.01.2018 03:00:00 in UTC)

