// const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

const TeleBot = require('telebot');
const Path = require('path')
const fs = require('fs')
const Axios = require('axios')
const parsePodcast = require('node-podcast-parser');
const Lame = require("node-lame").Lame;
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('dbbot.json')
const db = low(adapter)

function getToken() {
    let token = (process.env.TELEGRAM_BOT_TOKEN) ?
        fs.readFileSync(process.env.TELEGRAM_BOT_TOKEN, 'utf8') :
        fs.readFileSync('token_bot_secret_test.ini', 'utf8');
    return token.trim();
}

const TOKEN = getToken()
const bot = new TeleBot(TOKEN);

// Set some defaults (required if your JSON file is empty)
db.defaults({ podcasts: [] })
    .write()


const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));


async function asyncPodcastParser(url) {
    return new Promise((resolve, reject) => {
        parsePodcast(url, (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

async function downloadAudio(chapter) {
    const path = Path.resolve(__dirname, 'audios', `${chapter}.mp3`)
    const exist = await fileExists(path)
    return new Promise(async (resolve, reject) => {
        if (exist) {
            resolve(path)
        } else {
            try {
                let url = null
                // console.log(xml.data)
                // return;
                const xml = await Axios.get('http://www.ivoox.com/enjambre_fg_f1781784_filtro_1.xml')
                const datafeed = await asyncPodcastParser(xml.data)
                for (let episode of datafeed.episodes) {
                    if (episode.title.split(':')[0].indexOf(`Episodio ${chapter}`) > -1) {
                        url = episode.enclosure.url
                    }
                }
                if (!url) {
                    return reject('Episodio no encontrado')
                }
                const writer = fs.createWriteStream(path);
                const response = await Axios({
                    url,
                    method: 'GET',
                    responseType: 'stream'
                })

                response.data.pipe(writer)

                writer.on('finish', () => resolve(path))
                writer.on('error', reject)
            } catch (err) {
                reject(err)
                console.error(err)
            }
        }
    })


}


async function compressAudio(chapter) {
    const path = Path.resolve(__dirname, 'audios', `${chapter}-compressed.mp3`)
    const pathUncompressed = Path.resolve(__dirname, 'audios', `${chapter}.mp3`)
    const exist = await fileExists(path)
    return new Promise(async (resolve, reject) => {
        if (exist) {
            resolve(path)
        } else {
            try {

                const encoder = new Lame({
                    output: path,
                    bitrate: 16,
                    scale: 2,
                    'to-mono': true
                }).setFile(pathUncompressed);

                encoder
                    .encode()
                    .then(() => {
                        resolve(path)
                    })
                    .catch(error => {
                        reject('Ocurrio un error al comprimir')
                    });
            } catch (err) {
                reject(err)
                console.error(err)
            }
        }
    })

}

const getAudio = async (msg, props, full) => {
    try {
        const chapter = props.match[1];
        //SAVE STATS
        const podcast = db.get('podcasts')
            .find({ name: `Episodio ${chapter}` })
            .value()
        if (!isNaN(chapter)) {
            // msg.reply.text(text, { replyToMessage: msg.message_id });
            const file = await downloadAudio(chapter)
            let compressed
            if (full) {
                compressed = file
            } else {
                compressed = await compressAudio(chapter)
            }
            let file_id = ""
            if (!podcast) {
                // const form = {chat_id: 388031459, title: "Episodio 33 - El enjambre", audio: {value: fs.createReadStream(file), options: {filename: "33.mp3"}}}
                //TODO: Upload file to TL
                // axios.post("https://api.telegram.org/bot850261048:AAGvIj0I93u9tGM_oocCQqqO7saVmfGzlxU/sendAudio"    , null, )
                try {
                    const pod = await bot.sendAudio(msg.chat.id, compressed, { title: `Episodio ${chapter} - El enjambre` })
                    file_id = pod.audio.file_id
                } catch (err) {
                    console.log(err)
                    if (err.error_code == 413) {
                        msg.reply.text('El episodio pesa más de 50MB.');
                    }
                }
                db
                    .get('podcasts')
                    .push({ file_id: file_id, name: `Episodio ${chapter}`, countfull: (full) ? 1 : 0, countcomp: (full) ? 0 : 1 })
                    .write()
            } else {
                const pod = db.get('podcasts')
                    .find({ name: `Episodio ${chapter}` })
                file_id = pod.value().file_id
                pod.update((full) ? 'countfull' : 'countcomp', n => n + 1)
                    .write()
            }
            console.log(file, 'DOWNLOADED')
            if (file_id) {
                await bot.sendAudio(msg.chat.id, file_id, { title: `Episodio ${chapter} - El enjambre` })
            } else {
                await bot.sendAudio(msg.chat.id, compressed, { title: `Episodio ${chapter} - El enjambre` })
            }
        } else {
            msg.reply.text('Debe escribir solo el número del episodio.');
        }

    } catch (err) {
        console.log(err)
        msg.reply.text('Ha ocurrido un error procesando el episodio.');
    }
}

const findchapter = async (msg, props) => {
    try {
        getAudio(msg, props, false)
    } catch (err) {
        console.log(err)
    }

}

const findchapterfull = async (msg, props) => {
    try {
        getAudio(msg, props, true)
    } catch (err) {
        console.log(err)
    }
}

const getstats = async (msg) => {
    const stats = db.get('podcasts')
    const salida = stats.map(el => `${el.name} - ${el.countcomp} comprimidas - ${el.countfull} calidad`).join('\n')
    msg.reply.text(`Estadísticas de descargas: \n${salida}`)
}

bot.on(['/start', '/ayuda'], (msg) => {
    msg.reply.text('Para obtener la versión comprimida de un episodio, escriba /comprimido [NÚMERO].\nPor ejemplo: /comprimido 3 \n');
    msg.reply.text('Si deseas escuchar el episodio en buena calidad, escriba /episodio [NÚMERO].\nPor ejemplo: /episodio 3 \n');
    msg.reply.text('Para ver las estadísticas de descargas, escriba /estadisticas');

})

bot.on('audio', (msg) => {
    console.log(msg)
    if (!isNaN(msg.caption) && (msg.from.id == 388031459 || msg.from.id == 494968529)) {
        db.get('podcasts')
            .find({ name: `Episodio ${msg.caption}` })
            .assign({ "file_id": msg.audio.file_id })
            .write()
        msg.reply.text('Nuevo Audio recibido')
    }

})
bot.on(/^\/comprimido (.+)$/, findchapter);
bot.on(/^\/episodio (.+)$/, findchapterfull);
bot.on(['/estadisticas'], getstats);
bot.start();
