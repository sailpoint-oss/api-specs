// Read the file and print its contents.
var fs = require("fs"),
  filename = process.argv[2];
  const map = new Map();
fs.readFile(filename, "utf8", function (err, data) {
  if (err) throw err;
  console.log("OK: " + filename);

  let file = JSON.parse(data);
  file.collection.item.forEach((tag) => {
    map.set(tag.name, tag.id);
    console.log(`${tag.name}->${tag.id}`);
    tag.item.forEach((collectionItem) => {
        map.set(`${tag.name}|${collectionItem.name}`, collectionItem.id);
      //console.log(`${tag.name}|${collectionItem.name}->${collectionItem.id}`);
      collectionItem.response.forEach((response) => {
        map.set(`${tag.name}|${collectionItem.name}|${response.name}`, response.id);
        //console.log(`${tag.name}|${collectionItem.name}|${response.name}->${response.id}`);
      });
    });
  });
  //console.log(map);
});


fileToReplace = process.argv[3];

fs.readFile(fileToReplace, "utf8", function (err, data) {
    if (err) throw err;
    console.log("OK: " + fileToReplace);

    let replaceFile = JSON.parse(data);
    let count = 0;
    replaceFile.collection.item.forEach((tag) => {
        if(map.has(tag.name)) {
            console.log(`Previous value: ${tag.id}, oldValue: ${map.get(tag.name)}`)
            tag.id = map.get(tag.name);
        }
        //console.log(`${tag.name}->${tag.id}`);
        tag.item.forEach((collectionItem) => {
            if(map.has(`${tag.name}|${collectionItem.name}`)) {
                collectionItem.id = map.get(`${tag.name}|${collectionItem.name}`);
            }
            //map.set(`${tag.name}|${collectionItem.name}`, collectionItem.id);
          //console.log(`${tag.name}|${collectionItem.name}->${collectionItem.id}`);
          collectionItem.response.forEach((response) => {
            if(map.has(`${tag.name}|${collectionItem.name}|${response.name}`)){ 
                response.id = map.get(`${tag.name}|${collectionItem.name}|${response.name}`);
            }
            //map.set(`${tag.name}|${collectionItem.name}|${response.name}`, response.id);
            //console.log(`${tag.name}|${collectionItem.name}|${response.name}->${response.id}`);
          });
        });
      });

      fs.writeFile(filename, JSON.stringify(replaceFile, null, 4), function(err) {
        if(err) {
          console.log(err);
        } else {
          console.log("JSON saved");
        }
    });
});

