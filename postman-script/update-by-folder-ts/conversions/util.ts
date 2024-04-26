
export function checkIfDifferent(source: any, dest: any) {
    syncKeys(source, dest)
    if (isDeepEqual(source, dest)) {
        return false
    }
    return true
}

function removeIdFields(obj) {
    if (typeof obj !== 'object') {
        return
    }
    if (obj === null) {
        return
    }
    // Check if the current object has the 'id' property
    if (obj.hasOwnProperty('id')) {
        delete obj.id;
    }

    // Recursively call removeIdFields on each property if it's an object
    for (let key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            removeIdFields(obj[key]);
        }
    }
}

function isNullorEmpty(obj) {
    if (obj === null || obj === '' || obj === undefined) {
        return true
    }
    return false

}


function syncKeys(obj1: any, obj2: any) {
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
        return;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    for (let key of keys1) {
        const val1 = obj1[key];
        const val2 = obj2[key];
        if (val2 === undefined) {
            continue;
        } else if (key === 'id') {
            obj1[key] = val2;
        }
        const areObjects = isObject(val1) && isObject(val2);
        if (areObjects) {
            syncKeys(val1, val2)
        }

    }

    return true;
}


function isDeepEqual(obj1, obj2) {

    if (areValuesEqual(obj1, obj2)) {
        return true
    }

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
        return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (let key of keys1) {
        let val1 = findJSONObjects(obj1[key]);
        let val2 = findJSONObjects(obj2[key]);
        if (shouldIgnore(key)) {
            continue;
        }
        const areObjects = isObject(val1) && isObject(val2);
        if (
            areObjects && !isDeepEqual(val1, val2) ||
            (!areObjects && !areValuesEqual(val1, val2))
        ) {
            console.log(`found difference in ${key} value1: ${val1} value2: ${val2}`)
            return false;
        }
    }

    return true;
}

function shouldIgnore(key) {
    return false
}

function findJSONObjects(obj) {
    const jsonObjects = {};

    if (typeof obj === 'string') {
        try {
            // Attempt to parse the string as JSON
            const parsed = JSON.parse(obj);

            // Check if the parsed result is an object (and not a number, string, etc.)
            if (parsed !== null && typeof parsed === 'object') {
                return parsed;
            }
        } catch (e) {
            return obj;
        }
    }

    return obj;
}

function areValuesEqual(val1, val2) {
    if (isNullorEmpty(val1) && isNullorEmpty(val2)) {
        return true;
    }
    if (val1 === val2) {
        return true
    }
    return false
}

function isObject(object) {
    return object != null && typeof object === 'object';
}