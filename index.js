const request = require('request');
const parsePodcast = require('node-podcast-parser');

const hasher = require('object-hash');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

// Set some defaults (required if your JSON file is empty)
db.defaults({ podcasts: [], lasthash: 0 })
  .write()


request('http://www.ivoox.com/enjambre_fg_f1781784_filtro_1.xml', (err, res, data) => {
  if (err) {
    console.error('Network error', err);
    return;
  }

  parsePodcast(data, (err, data) => {
    if (err) {
      console.error('Parsing error', err);
      return;
    }

    if (!db.has('generaldata').value()) {
      db.set('generaldata', {
        author: data.author,
        title: data.title,
        link: data.link,
        description: data.description,
        language: data.language,
        image: data.image
      })
        .write()
    }
    // TODO: Get HASH from RSS to check changes
    const hash = hasher(data.episodes)
    const lasthash = db.get('lasthash').value()

    if (hash != lasthash) {
      // TODO: Find if the podcast exist in the DB, add new ones 
      for (let episode of data.episodes) {
        const podcast = db.get('podcasts')
          .find({ guid: episode.guid })
          .value()
        if (!podcast) {
          db
            .get('podcasts')
            .push(episode)
            .write()
        }
      }
      db.set('lasthash', hash)
        .write()
    }
  });
});

var Koa = require('koa')
var router = require('@koa/router')
const serve = require('koa-static');
var app = new Koa()

var _ = router();              //Instantiate the router
_.get('/podcasts', (ctx, next) => {
  const podcasts = db
    .get('podcasts').value()
  ctx.body = podcasts
})


app.use(serve(__dirname + '/dist'));
app.use(_.routes());           //Use the routes defined using the router
app.listen(3000);



