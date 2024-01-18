const fs = require('fs')
const { deployIncremental } = require('./DeployIncremental')

const release = async () => {
    let privateRemoteCollectionId = '23836355-c5640083-7523-4ad7-9f92-b23e079cbb7b'
    let publicRemoteCollectionId = '23836355-6224d51a-d924-4c39-a58f-6970735aac8e'
    let localCollection = JSON.parse(fs.readFileSync(`C:\\git\\api-specs\\postman\\collections\\sailpoint-api-v3.json`).toString())
    await deployIncremental(privateRemoteCollectionId, localCollection, publicRemoteCollectionId)
}

release()