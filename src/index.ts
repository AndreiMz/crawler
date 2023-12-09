import fs from 'fs';
import { Client } from '@elastic/elasticsearch'
import express from 'express'
import dotenv from 'dotenv'
import { QueryDslQueryContainer, SearchRequest } from "@elastic/elasticsearch/lib/api/types";
import { FullWebsiteData } from "./dataFunctions";

dotenv.config()
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            ELASTIC_SEARCH_USERNAME: string,
            ELASTIC_SEARCH_PASSWORD: string,
            ELASTIC_SEARCH_CERTIFICATE_LOCATION: string
            ELASTIC_SEARCH_NODE: string
            PORT: string
        }
    }
}

interface QueryMessage {
    name: string,
    website: string,
    facebook: string,
    phone: string
}


const client = new Client({
    node: process.env.ELASTIC_SEARCH_NODE,
    auth: {
        username: process.env.ELASTIC_SEARCH_USERNAME ,
        password: process.env.ELASTIC_SEARCH_PASSWORD ,
    },
    tls: {
        ca: fs.readFileSync(process.env.ELASTIC_SEARCH_CERTIFICATE_LOCATION),
        rejectUnauthorized: false
    }
})


const app = express();
app.use(express.json())
const port = process.env.PORT;


app.post('/api/search', async (req, res) => {
    const queryData: QueryMessage = req.body;
    const queryTerms: QueryDslQueryContainer[] = []

    if(queryData.name !== undefined) {
        queryTerms.push({
            match: {
                company_all_available_names: queryData.name
            }
        })
    }

    if(queryData.facebook !== undefined) {
        queryTerms.push({
            match: {
                social_media: queryData.facebook
            }
        })
    }

    if( queryData.phone !== undefined) {
        queryTerms.push({
            fuzzy: {
                phone_numbers: {
                    value: queryData.phone
                }   
            }
        })
    }

    if(queryData.website !== undefined) {
        let normalizedDomain =  (new URL(queryData.website)).hostname

        queryTerms.push({
            match: {
                domain: normalizedDomain
            }
        })
    }

    // no data given 
    if(queryTerms.length === 0){
        res.status(400).json({
            error: "Must provide query"
        })

        return;
    }

    const elsQuery: SearchRequest = {
        index: "company-data", 
        query: {
            bool: {
                should: queryTerms,
                minimum_should_match: 1
            }
        } 
    }

    var data =  await client.search<FullWebsiteData>(elsQuery)

    if(data.hits.hits.length !== 0){
        res.json(data.hits.hits[0]._source)
        return;
    }

    res.json({ message: "Could not find any matching record for your query"});

})

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
})