const fetch = require('node-fetch')

async function httpGetJSON(url) {
    return await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
        }
    }).then(response => {
        return response.json();
    })
}

async function httpGetHTML(url) {
    return await fetch(url).then(response => {
        return response.text();
    })
}

module.exports = {
    httpGetJSON, httpGetHTML
};