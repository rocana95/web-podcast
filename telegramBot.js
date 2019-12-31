const TELEGRAM_BOT_TOKEN = '915485564:AAEtQIcGy8neOcbRVfR9pQYYVl8bpCdeKiY'

const TeleBot = require('telebot');
const bot = new TeleBot(TELEGRAM_BOT_TOKEN);
const Path = require('path')
const fs = require('fs')
const Axios = require('axios')
const parsePodcast = require('node-podcast-parser');
const Lame = require("node-lame").Lame;


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
                    if (episode.title.split(':')[0] == `Episodio ${chapter}`) {
                        url = episode.enclosure.url
                    }
                }
                if (!url) {
                    reject('Episodio no encontrado')
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


const findchapter = async (msg, props) => {
    try {
        const chapter = props.match[1];
        if(!isNaN(chapter)){
        // bot.sendMessage(msg.from.id, text, { replyToMessage: msg.message_id });
        const file = await downloadAudio(chapter)
        const compressed = await compressAudio(chapter)
        console.log(file, 'DOWNLOADED')
        bot.sendAudio(msg.from.id, compressed, { replyToMessage: msg.message_id, title: `Episodio ${chapter} - El enjambre` })
    } else {
        bot.sendMessage(msg.from.id, 'Debe escribir solo el número del episodio.', { replyToMessage: msg.message_id });   
    }

    } catch (err) {
        bot.sendMessage(msg.from.id, 'Ha ocurrido un error procesando el episodio.', { replyToMessage: msg.message_id });
    }

}
bot.on(['/start'], (msg) => msg.reply.text('Para obetener una versión comprimida de un capítulo, escriba /cap [NUMERO].\nPor ejemplo: /cap 3'));
bot.on(/^\/episodio (.+)$/, findchapter);

bot.start();