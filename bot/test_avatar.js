// Final test of updated getFacebookAvatar
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const config = require('./src/config');
const { getFacebookAvatar } = require('./src/services/checker');

async function test() {
    console.log('Testing UID 100032282476359...');
    const buf = await getFacebookAvatar('100032282476359');
    if (buf) {
        console.log('SUCCESS! Buffer size:', buf.length, 'bytes');
        require('fs').writeFileSync('/tmp/final_avatar.jpg', buf);
        const { execSync } = require('child_process');
        const info = execSync('sips -g pixelWidth -g pixelHeight /tmp/final_avatar.jpg 2>/dev/null').toString();
        const m = info.match(/pixelWidth: (\d+)[\s\S]*pixelHeight: (\d+)/);
        console.log('Dimensions:', m ? `${m[1]}x${m[2]}` : 'unknown');
        console.log('Saved to /tmp/final_avatar.jpg');
    } else {
        console.log('FAILED - no avatar returned');
    }
}

test().catch(console.error);
