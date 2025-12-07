import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("__dirname:", __dirname); 
const file = path.join(__dirname, './systempasswords/passwordss.txt');
console.log("Resolved File Path:", file);

try {
    const dirPath = path.dirname(file);
    fs.mkdirSync(dirPath, { recursive: true });
    fs.appendFileSync(file, 'yes this is workkjbjhing\n', 'utf-8');
    console.log("File written successfully!");

} catch (error) {
   
    console.error("Write Error:", error.code, error.message);
}


