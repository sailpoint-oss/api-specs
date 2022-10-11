const fs = require("fs")
const path = require("path")

const originalCollection = JSON.parse(fs.readFileSync('./postman/final.json'));
const newCollection = JSON.parse(fs.readFileSync('./final.json'));
const allKeys = {}
let keyFoundCount = 0
let keyReplacedCount = 0

const getAllKeys = function(fullKey, hierarchy, replaceKey) {

    //search the object for a name and key and add/replace if it does
    const pair = getNameAndKey(hierarchy)
    if (pair.key) {
        if (replaceKey) {
            if (allKeys.hasOwnProperty(fullKey + pair.name)) {
                hierarchy.id = allKeys[fullKey + pair.name]
                // set the pair key to the original so a match can be found in deeper sets
                pair.key = allKeys[fullKey + pair.name]
                keyReplacedCount++
            }
        } else {
            if (!allKeys.hasOwnProperty(fullKey + pair.name)) {
                allKeys[fullKey + pair.name] = pair.key
                keyFoundCount++
            } else {
                console.log('duplicate key found! name=' + pair.name)
            }
        }

    }

    //continue to search deeper in the object
    for (let key of Object.keys(hierarchy)) {
        if (typeof hierarchy[key] === 'object' && hierarchy[key] !== null) {
            getAllKeys(fullKey + pair.key + (isNaN(key) ? key : ''), hierarchy[key], replaceKey)
        }
    }
}

const getNameAndKey = function(hierarchy) {
    let pair = {key: '', name: ''}
    for (let key of Object.keys(hierarchy)) {
        if (key === 'id') {
            pair.key = hierarchy[key]
        }
        if (key === 'name') {
            pair.name = hierarchy[key]
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