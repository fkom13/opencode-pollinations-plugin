const os = require('os');
const path = require('path');
const fs = require('fs');

function getConfigDir() {
    switch (process.platform) {
        case 'win32':
            return path.join(process.env.APPDATA || os.homedir(), 'pollinations');
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', 'pollinations');
        default:
            return path.join(
                process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
                'pollinations'
            );
    }
}

const dir = getConfigDir();
console.log('Config Dir:', dir);
const configFile = path.join(dir, 'config.json');
console.log('Config File:', configFile);

if (fs.existsSync(configFile)) {
    console.log('File found. Content:');
    console.log(fs.readFileSync(configFile, 'utf-8'));
} else {
    console.log('File not found at:', configFile);
}
