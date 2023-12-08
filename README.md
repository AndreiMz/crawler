# Summary
## Requirements
* Node installed
* An elastic search server

## Loading everything
Need an improvement here, but the steps are:
* npm i 
* npx playwright install --with-deps
* have an ElasticSearch container running
* .... run the insertData function from /src/dataFunctions.ts (this step might need some improvements)
* npm run dev 
* call /api/search with a body like this (all properties are optional)
```
{
  "name": "aaa",
  "phone": "123",
  "website": "https://domain.com",
  "facebook": "https://facebook.com/ok"
}
```

## Time constraints and scaling 
Some websites do not load the whole content on the first request, they make additional requests via js and such they can be considered "fully loaded" usually on the emitting of the "load" event. Due to this limitation we have the following 2 situations:
* Load the website via GET request only (using CheerioCrawler in the context of the project)
  * PROS:
    * Much faster than waiting for the JS to load 
    * Less resource intensive
  * CONS:
    * Data will likely not be complete
* Wait for the website to finish loading in headless browser (using Playwright in the context of the project) 
  * PROS:
    * Data will likely be complete and the problem becomes one of parsing efficiently
  * CONS:
    * Much slower
    * Resource Intensive

From a scaling perspective, I would choose the second option with paralellisation on multiple machines that share a common data point to feed into.
Due to real life time constraints, I didn't manage to actually get the optimal speed.

Runtimes:
Playwright 1921514ms ~ 30m
