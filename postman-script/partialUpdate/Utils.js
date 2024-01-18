const uuid = require('uuid')
const NAMESPACE = '33c4e6fc-44cb-4190-b19f-4a02821bc8c3'

const genID = (objectJSON = null) => {
  if (objectJSON) {
    return uuid.v5(objectJSON, NAMESPACE)
  } else {
    return uuid.v4()
  }
}

// Sort 2 objects by name
const byName = (a, b) => {
  if (a.name < b.name) {
    return -1
  } else if (a.name > b.name) {
    return 1
  }
  return 0
}

// Sort two object by priority
const byPriority = (a, b) => {
  if (a['x-box-priority']) {
    return -1
  } else if (b['x-box-priority']) {
    return 1
  }
  return 0
}

module.exports = {
  GenID: genID,
  ByName: byName,
  ByPriority: byPriority
  // logAxiosError
}