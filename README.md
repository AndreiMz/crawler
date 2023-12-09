# Summary
## Requirements
* Node installed
* An elastic search server

## Results
1. Total Websites - 997
2. Websites where phone numbers were found - 80 
3. Websites where emails were found - 403 
4. Websites where social media was found - 390

### Extra info per website (data is mean for websites where data is available)
* Mean number of social media found (outliers removed in calculation) - 2.743
* Mean number of emails found - 1.513
* Mean number of phone numbers found - 1.1392


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
TBD improvements in data acquisition:
* improve data quality, remove garbage data
* speed it up
* get address data set and train a NLP model to extract from html text addresses
* normalize and sanitize data

Runtimes:
Playwright 1921514ms ~ 30m


## Search Algorithm 
The search "algorithm" is just a composite query for the ElasticSearch endpoint.
Definitely needs improvements, like:
* data should be cleaned up, normalized (ex: phone numbers should be normalized without any non-numeric characters)
* take into account when multiple matches occur, to have a best match option 
