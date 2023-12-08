
import fs from 'fs';
import csv from 'csv-parser';
import { RequestQueue, CheerioCrawler, enqueueLinks, Dictionary, PlaywrightBrowser, PlaywrightCrawler } from "crawlee";
import {isPossiblePhoneNumber, isValidPhoneNumber, validatePhoneNumberLength} from 'libphonenumber-js';
import * as EmailValidator from 'email-validator';

interface DomainData {
    domain: string
}
const EMAIL_PATTERN = /[\w-\.]+@([\w-]+\.)+[\w-]{2,4}/g;
const EMAIL_VALIDATE_PATTERN = /^[a-z0-9]+[\._]?[a-z0-9]+[@]\w+[.]\w+$/

// very lenient number pattern to cross validate with libphonenumber
// minimum is 5 characters for solomon islands
// maximum is 15 but we need to account for whitespace, separator chars etc
const PHONE_PATTERN = /([\+\-\(\)\d\w]{5,25})/g

// Improvement: add shortened url domains as well
// maaaybe add tiktok also
const SOCIAL_MEDIA = [
    'facebook.com',
    'linkedin.com',
    'instagram.com',
    'youtube.com',
    'twitter.com',
    'pinterest.com',
    'plus.google.com',
    'blogspot.com'
];

const ReadData : () => Promise<Array<DomainData>> = async () => {
    return new Promise<Array<DomainData>>((resolve, reject) => {
        let result: Array<DomainData> = [];

        fs.createReadStream("./data/sample-websites.csv")
            .pipe(csv())
            .on('data', (d) => { result.push(d)})
            .on('error', (err) => reject(err))
            .on('end', () => resolve(result))
    
    })
}

interface ScrapedWebsite {
    [domain: string]: {
        social_media: Set<string>
        emails: Set<string>
        numbers: Set<string>
    }
}

const ScrapeWebsites = async () => {
    let data = await ReadData();
    let result : ScrapedWebsite = {};
    const requestQueue = await RequestQueue.open();

    data.forEach(async e => 
        await requestQueue.addRequest({ url: `https://${e.domain}` })
    );

    const crawler =  new PlaywrightCrawler({
        requestQueue,
        maxRequestRetries: 1,
        async errorHandler({ request }, error) {
            // skipping if domain is invalid
            if(error?.message?.includes("getaddrinfo ENOTFOUND")){
                request.noRetry = true;
            }
        },
        async requestHandler({ page, parseWithCheerio, request, enqueueLinks }) {
            let domain = (new URL(request.url)).hostname;
            const $ = await parseWithCheerio();

            if(result[domain] === undefined){
                result[domain] = {
                    social_media: new Set<string>(),
                    emails: new Set<string>(),
                    numbers: new Set<string>()
                }
            }
            
            // Looking for social media references 
            $('a').each((i, elem) => {
                let ref: string = $(elem).prop("href")

                if(ref === null || ref === undefined){
                    return;
                }

                SOCIAL_MEDIA.forEach(e => {
                    if(ref.includes(e)){
                        result[domain].social_media.add(ref);
                    }
                })
            })
       
            $("*").html()?.match(EMAIL_PATTERN)?.forEach(e => {
                if(EmailValidator.validate(e) && e.match(EMAIL_VALIDATE_PATTERN)){
                    result[domain]["emails"].add(e)
                }
            })

            $("*").html()?.match(PHONE_PATTERN)?.forEach(e => {
                if(validatePhoneNumberLength(e) !== undefined){
                    return
                }
    
                if(isPossiblePhoneNumber(e) && isValidPhoneNumber(e)){
                    result[domain]["numbers"].add(e)
                }
            })

            await enqueueLinks({
                requestQueue: requestQueue,
                transformRequestFunction(req) {
                    let requestDomain = (new URL(req.url)).hostname
                    if(requestDomain !== domain){
                        return false;
                    }

                    if(req.url.includes("contact") || req.url.includes("about")){
                        return req;
                    }

                    return false;
                }
            })
        }
    })

    await crawler.run();
    return result;
}


export default ScrapeWebsites;