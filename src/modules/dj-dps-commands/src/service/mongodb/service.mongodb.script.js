let Promise = require("bluebird")

const mongo = require('mongodb').MongoClient //Promise.promisifyAll(require('mongodb').MongoClient)
const {extend, isArray, isString, keys, uniq, flatten, last, first, find} = require("lodash")
const buildQuery = require("./utils/parse-query")
const uuid = require("uuid").v4

let connectionUrl = process.env.MONGOLAB_URI || process.env.MONGODB_URL || process.env.ATLAS_URL || "mongodb://localhost:27017"


class MongoDBImplError extends Error {
    constructor(message) {
        super(message);
        this.name = "mongodb service error";
    }
}


module.exports = {
    name: "service.mongodb.script",

    synonims: {
    },

    "internal aliases": {
        "script": "script",
        "pipeline": "script",
        "options":"options",
        "db": "db",
        "on": "on",
        "at": "on",
        "pagination": "pagination"
          
    },

    defaultProperty: {
        "service.mongodb.script": "script"
    },

    execute: async function(command, state, config) {

        let client
        let context

        try {   
            let pagination = command.settings.pagination || {
                skip:0,
                limit:10
            }

            let script = command.settings.script || ((command.settings.data) ? command.settings.data : state.head.data) || []
            if (!script) throw new MongoDBImplError(`No script available`)
            let database = command.settings.db
            
            let url = (command.settings.on) ? command.settings.on : connectionUrl
            
            client = await mongo.connect(url, {
                        useNewUrlParser: true,
                        useUnifiedTopology: true
                     })
            let db = client.db(database)

            let collections = await db.listCollections().toArray()
            collections = collections.map( c => c.name)
            
            context = {
                id: uuid(),
                collections,
                temp: []
            }

            let res
            let resultTempCollectionName

            for(let index = 0; index < script.length; index++){
                let query = buildQuery(context, script[index])
                context = query.context

                if(index == script.length-1){
                    resultTempCollectionName = find( query.pipeline, s => s.$out)
                    if(!resultTempCollectionName){
                        resultTempCollectionName = context.id
                        query.pipeline.push({
                            $out: resultTempCollectionName
                        })
                    }                        
                }

                console.log("resultTempCollectionName", resultTempCollectionName)


                let collection = db.collection(query.collection)
                await collection.aggregate(query.pipeline).toArray()
            }

            // TODO drop all temp collections

            // for(let index = 0; index< context.temp.length; index++){
            //     console.log("DROP TEMP", context.temp[index])
            //     await db.collection(context.temp[index]).drop()
            // }


            //  POST PROCESS RESULT TEMP COLLECTION


        
            collection = db.collection(resultTempCollectionName)
            let count = await collection.aggregate([
                { $count: 'count'},
                { $project: {_id: 0} }
            ]).toArray()

            count = (count[0]) ? count[0].count || 0 : 0
            
            res = await collection.aggregate([
                { $skip: pagination.skip},
                { $limit: pagination.limit},
                { $project: {_id: 0} }
            ]).toArray()
            
            
            for(let index = 0; index< context.temp.length; index++){
                console.log("DROP TEMP", context.temp[index])
                await db.collection(context.temp[index]).drop()
            }


            await db.collection(resultTempCollectionName).drop()


            // RETURN RESULT

            state.head = {
                type: "json",
                data: {
                    pagination:{
                        total: count,
                        skip: pagination.skip,
                        limit: pagination.limit,
                        pagePosition: `${pagination.skip+1} - ${Math.min(pagination.skip + pagination.limit, count)} from ${count}`
                    },
                    header: uniq(flatten(res.map(r => keys(r)))),
                    collection: res
                }    
            }
            
            return state
        } catch(e) {
            throw new MongoDBImplError(`${JSON.stringify(context, null, " ")}\n${e.toString()}`)
        } finally {
            if(client) client.close()
        }   

    },


    help: {
        synopsis: "Tokenize document",

        name: {
            "default": "rank",
            synonims: []
        },
        input: ["table"],
        output: "table",
        "default param": "indexes",
        params: [{
            name: "direction",
            synopsis: "Direction of iteration (optional)",
            type: ["Rows", "row", "Columns", "col"],
            synonims: ["direction", "dir", "for"],
            "default value": "Columns"
        }, {
            name: "indexes",
            synopsis: "Array of 0-based indexes of items that will be ranked (optional)",
            type: ["array of numbers"],
            synonims: ["indexes", "items"],
            "default value": []
        }, {
            name: "asc",
            synopsis: "Define order (optional)",
            type: ["A-Z", "az", "direct", "Z-A", "za", "inverse"],
            synonims: ["order", "as"],
            "default value": "A-Z"
        }],
        example: {
            description: "Rank first column values",
            code: "load(\r\n    ds:'47611d63-b230-11e6-8a1a-0f91ca29d77e_2016_02',\r\n    as:\"dataset\"\r\n)\r\nproj([\r\n  { dim:'time', role:'row', items:[] },\r\n  { dim:'indicator', role:'col', items:[] }\r\n])\r\n\r\nrank(for:\"col\",items:[0],as:\"az\")\r\n\r\norder(by:0, as:\"az\")\r\n\r\n"
        }
    }
}