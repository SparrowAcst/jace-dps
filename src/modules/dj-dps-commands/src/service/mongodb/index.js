module.exports = [
    require("./service.mongodb"),
    require("./service.mongodb.listCollections"),
    require("./service.mongodb.replace"),
    require("./service.mongodb.remove"),
    require("./service.mongodb.insertMany"),
    require("./service.mongodb.updateMany"),
 	require("./service.mongodb.bulk"),
 	require("./service.mongodb.script")
       
]