import { writeFileSync } from 'fs';
import axios from 'axios';
import semaphore from 'semaphore';
import createHttpProxyAgent from 'https-proxy-agent';

const API_URL = 'https://api.mymemory.translated.net/get';

interface Translation {
  responseStatus: number;
  responseData: {
    translatedText: string;
  };
}

const agents = [
  createHttpProxyAgent('proxy_ip:proxy_port'),
  createHttpProxyAgent('proxy_ip:proxy_port'),
];

const translate = async (text: string): Promise<string> => {
  const { data } = await axios.get<Translation>(API_URL, {
    params: {
      q: text, // El texto que se va a traducir
      langpair: 'en|es', // El par de idiomas de origen y destino
      fetchOptions: {
        agent: agents[Math.floor(Math.random() * agents.length)],
      },
    },
  });
  return data.responseData.translatedText;
};

const sem = semaphore(6);

const translateJSON = async (
  json: Record<string, string>
): Promise<Record<string, string>> => {
  const translated: Record<string, string> = {};
  const keys = Object.keys(json);
  for (const key of keys) {
    await new Promise((resolve) => {
      sem.take(() => {
        translate(json[key]).then((result) => {
          translated[key] = result;
          sem.leave();
          resolve(console.log('Traduciendo: ' + json[key] + ' a ' + result + ''));
        });
      });
    });
  }
  return translated;
};

const main = async (): Promise<void> => {
  const json = require('./en.films.json');
  const translated = await translateJSON(json);
  const outputFilename = 'es.films.json';
  writeFileSync(outputFilename, JSON.stringify(translated, null, 2));
  console.log('Traducciones guardadas en ' + outputFilename + '');
};

main();
