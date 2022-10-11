const fs = require("fs")
const path = require("path")

const originalCollection = JSON.parse(fs.readFileSync('./postman/final.json'));
const newCollection = JSON.parse(fs.readFileSync('./final.json'));
const allKeys = {}
let keyFoundCount = 0
let keyReplacedCount = 0

const getAllKeys = function(fullKey, hierarchy, replaceKey) {

    //search the object for a name and key and add/replace if it does
    const pair = getNameAndKeyAndMethod(hierarchy)
    if (pair.key) {
        let newKey = fullKey + '|' + pair.name
        if (pair.method) {
            newKey += '|' + pair.method
        }
        if (replaceKey) {
            if (allKeys.hasOwnProperty(newKey)) {
                hierarchy.id = allKeys[newKey]
                // set the pair key to the original so a match can be found in deeper sets
                pair.key = allKeys[newKey]
                keyReplacedCount++
            }
        } else {
            if (!allKeys.hasOwnProperty(newKey)) {
                allKeys[newKey] = pair.key
                keyFoundCount++
            } else {
                console.log('duplicate key found! name=' + newKey)
            }
        }

    }

    //continue to search deeper in the object
    for (let key of Object.keys(hierarchy)) {
        if (typeof hierarchy[key] === 'object' && hierarchy[key] !== null) {
            getAllKeys(fullKey + '|' + pair.key , hierarchy[key], replaceKey)
        }
    }
}

const getNameAndKeyAndMethod = function(hierarchy) {
    let pair = {key: '', name: '', method: ''}
    for (let key of Object.keys(hierarchy)) {
        if (key === 'id') {
            pair.key = hierarchy[key]
        }
        if (key === 'name') {
            pair.name = hierarchy[key]
        }
        if (key === 'request') {
            pair.method = hierarchy[key].method
        }
    }
    return pair
}

getAllKeys('', originalCollection, false)
getAllKeys('', newCollection, true)

fs.writeFile('./postman/final2.json', JSON.stringify(newCollection, null, 4), function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("JSON saved, found " + keyFoundCount + ", replaced " + keyReplacedCount + " keys");
    }
});