const express = require('express');
const WebTorrent = require('webtorrent');

const TEST_MODE = false;
const TEST_TORRENT = 'https://webtorrent.io/torrents/big-buck-bunny.torrent';

const TORRENT_OBJ_CACHE = {};
const TORRENT_FILE_CACHE = {};
const client = new WebTorrent();
const hostname = '0.0.0.0';
const port = 3000;

const app = express();
app.use(express.static('public'));

function requestHandlerFactory(request, response, requiredParameters, callback) {
    requiredParameters = requiredParameters || [];
    const paramKeys = new Set(Object.keys(request.query));
    if (!requiredParameters.every(param => paramKeys.has(param))) {
        response.statusCode = 400;
        response.end(`Required parameters "${requiredParameters}" missing`);
        return;
    }
    console.log(request.url);
    const params = requiredParameters.map(param => decodeURIComponent(request.query[param]));
    return callback(...params);
}

function resolveTorrent(torrentUri) {
    return new Promise(resolve => {
        if (!TORRENT_OBJ_CACHE[torrentUri]) {
            client.add(torrentUri, torrent => {
                TORRENT_OBJ_CACHE[torrentUri] = torrent;
                resolve(TORRENT_OBJ_CACHE[torrentUri]);
            });
        } else {
            resolve(TORRENT_OBJ_CACHE[torrentUri]);
        }
    });
}

function removeTorrent(torrentUri) {
    return new Promise(async resolve => {
        const torrent = await resolveTorrent(torrentUri);
        torrent.destroy(null, () => {
            delete TORRENT_OBJ_CACHE[torrentUri];
            resolve();
        });
    });
}

app.get('/list', (request, response) => {
    return requestHandlerFactory(request, response, ['uri'], async torrentUri => {
        if (TEST_MODE) torrentUri = TEST_TORRENT;
        const torrent = await resolveTorrent(torrentUri);
        const fnames = torrent.files.map(file => file.name);
        await removeTorrent(torrentUri);
        response.end(JSON.stringify(fnames));
    });
});

app.get('/init', (request, response) => {
    return requestHandlerFactory(request, response, ['uri', 'file'], async (torrentUri, fname) => {
        if (TEST_MODE) [torrentUri, fname] = [TEST_TORRENT, 'Big Buck Bunny.mp4'];
        response.setHeader('Content-Type', 'application/json');
        const torrent = await resolveTorrent(torrentUri);
        const torrentFile = torrent.files.find(file => file.name === fname);
        torrentFile.select();
        const token = Math.random().toString(36).substr(2);
        TORRENT_FILE_CACHE[token] = {
            'uri': torrentUri,
            'torrent': torrent,
            'file': torrentFile,
            'status': 'initialized',
        };
        return response.end(JSON.stringify({ 'token': token }));
    });
});

app.get('/progress', (request, response) => {
    return requestHandlerFactory(request, response, ['token'], token => {
        response.setHeader('Content-Type', 'application/json');
        const item = TORRENT_FILE_CACHE[token];
        return response.end(JSON.stringify({
            'file': item.file.name,
            'status': item.status,
            'progress': item.file.progress,
            'size': item.file.length,
            'downloadSpeed': item.torrent.downloadSpeed,
            'uploadSpeed': item.torrent.uploadSpeed,
        }));
    });
});

app.get('/play', (request, response) => {
    return requestHandlerFactory(request, response, ['token'], token => {
        const item = TORRENT_FILE_CACHE[token];
        const torrentFile = item.file;
        const fileSize = torrentFile.length;
        const streamOptions = { start: 0, end: fileSize - 1 };
        const torrentStream = torrentFile.createReadStream(streamOptions);

        // Remove torrent once the response is done
        response.on('close', () => removeTorrent(item.uri));
        response.on('unpipe', () => removeTorrent(item.uri));

        response.setHeader('Content-Type', 'video/' + item.file.name.split('.').slice(-1)[0]);
        response.setHeader('Content-Length', streamOptions.end - streamOptions.start);
        return torrentStream.pipe(response, { end: true });
    });
});

app.get('/stop', (request, response) => {
    return requestHandlerFactory(request, response, ['token'], token => {
        const item = TORRENT_FILE_CACHE[token];
        item?.uri && removeTorrent(item.uri);
    });
});

app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
