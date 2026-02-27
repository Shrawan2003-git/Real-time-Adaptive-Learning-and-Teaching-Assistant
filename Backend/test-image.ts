import { generateLessonImage } from './services/geminiService';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    try {
        const url = await generateLessonImage("give example code of java packages");
        console.log("SUCCESS!");
        console.log("URL type:", typeof url);
        console.log("Starts with data:", url.startsWith('data:'));
        console.log("Starts with http:", url.startsWith('http'));
        console.log("First 100 chars:", url.substring(0, 100));
    } catch (err) {
        console.error("FAILED:", err);
    }
}

main();
