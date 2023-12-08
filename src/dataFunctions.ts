import fs from 'fs'
import csv from 'csv-parser'
import ScrapeWebsites from './scraper'
import { Client } from "@elastic/elasticsearch"

export interface FullWebsiteData {
  domain: string,
  social_media: String[],
  emails: String[],
  phone_numbers: String[],
  company_comercial_name: String,
  company_legal_name: String,
  company_all_available_names: String
}

export interface PartialWebsiteData {
  domain: string,
  company_comercial_name: String,
  company_legal_name: String,
  company_all_available_names: String
}

const insertData = async (client: Client) => {
    let fullData: FullWebsiteData[] = JSON.parse(fs.readFileSync("./merged-data.json", "utf-8"))

    // probably should wrap this to something better
    fullData.forEach(async data => {
        await client.index({
            index: 'company-data',
            document: data
        })
    })
}

const generateNewData = async (resultingDataPath: string) => {
    let start = Date.now()
    let res = await ScrapeWebsites();
    let jsonFriendlyData : any = {}


    // for some reason, Set<T> is outputted as empty object 
    // when calling JSON.stringify on it
    Object.entries(res).map(([k,v]) => {
        jsonFriendlyData[k] = {
            "social_media": Array.from(v.social_media),
            "emails": Array.from(v.emails),
            "numbers": Array.from(v.numbers)
        }
    })

    // measure time like this oor use the stats prop from crawler
    console.log(Date.now() - start)

    fs.writeFileSync(resultingDataPath, JSON.stringify(jsonFriendlyData, null, 2))
}

const mergeAndWriteData = async (providedDataPath: string, newDataPath: string, resultingDataPath: string) => {
  const mergedData : FullWebsiteData[] = [];

  var websiteData = await new Promise<Array<PartialWebsiteData>>((resolve, reject) => {
      let result: Array<PartialWebsiteData> = [];

      fs.createReadStream(providedDataPath)
          .pipe(csv())
          .on('data', (d) => { result.push(d)})
          .on('error', (err) => reject(err))
          .on('end', () => resolve(result))
  
  })

  var ownData = JSON.parse(fs.readFileSync(newDataPath, 'utf-8'))

  websiteData.forEach(e => {
      mergedData.push({
          domain: e.domain,
          social_media: ownData[e.domain]?.social_media || [],
          emails: ownData[e.domain]?.emails || [],
          phone_numbers: ownData[e.domain]?.numbers || [],
          company_comercial_name: e.company_comercial_name,
          company_legal_name: e.company_legal_name,
          company_all_available_names: e.company_all_available_names
      })
  })

  fs.writeFileSync(resultingDataPath, JSON.stringify(mergedData, null, 2))

}
