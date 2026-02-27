const https = require('https');

const prompt = "give example code of java packages";
const encodedPrompt = encodeURIComponent(prompt.substring(0, 100));
const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

console.log("Fetching URL:", url);

https.get(url, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    let data = '';
    res.on('data', chunk => {
        data += chunk.toString('utf8');
    });
    res.on('end', () => {
        if (res.statusCode !== 200) {
            console.log('Error Body:', data);
        } else {
            console.log('Success! Received bytes:', data.length);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
