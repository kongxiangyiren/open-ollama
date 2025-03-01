import axios from 'axios';
import { load } from 'cheerio';
import OpenAI from 'openai';
import fs from 'fs';

let list = {};
fs.mkdirSync('./dist', {
  recursive: true,
  mode: 0o777
});
async function ip1() {
  const { data } = await axios
    .get('http://23.95.20.225:8000/', {
      timeout: 5 * 1000
    })
    .catch(err => {
      console.log(err);
      return {
        data: ''
      };
    });
  if (data === '') {
    console.log('ip1 error');
    return;
  }

  //   console.log(data);
  const $ = load(data);
  $('tr').map((i, el) => {
    const $td = $(el).find('td');
    // console.log($td.eq(0).text());
    // console.log($td.eq(1).text());

    if ($td.eq(0).text() === '') return;

    if (list[$td.eq(0).text()] === undefined) {
      list[$td.eq(0).text()] = [$td.eq(1).text()];
    } else {
      list[$td.eq(0).text()].push($td.eq(1).text());
    }
  });
  //   console.log(list);
}

async function ip2() {
  const { data } = await axios
    .get('https://freeollama.oneplus1.top/', {
      timeout: 5 * 1000
    })
    .catch(err => {
      console.log(err);
      return {
        data: ''
      };
    });

  if (data === '') {
    console.log('ip2 error');
    return;
  }

  //   console.log(data);

  const $ = load(data);
  $('body > div > div:nth-child(3) > div').map((i, el) => {
    const $ip = $(el).find('.card-text');
    // console.log($ip.eq(0).text());

    const $mode = $(el).find('.mb-3 > span');
    // console.log($mode.eq(0).text());

    $mode.map((i, el) => {
      if (list[$ip.eq(0).text()] === undefined) {
        list[$ip.eq(0).text()] = [$(el).text()];
      } else {
        list[$ip.eq(0).text()].push($(el).text());
      }
    });
  });
  //   console.log(list);
}

async function aiTest() {
  const ipList = Object.keys(list);

  for await (const ip of ipList) {
    const baseUrl = (ip.startsWith('http') ? ip : 'http://' + ip) + '/v1';
    const openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: '',
      timeout: 5 * 1000
    });

    // const completion = await openai.chat.completions
    //   .create({
    //     model: list[ip][0],
    //     prompt: '你好',
    //     stream: true
    //   })

    //   .catch(err => {
    //     // console.log(err);
    //     delete list[ip];
    //     console.log(ip, 'error');
    //   });

    // console.log(completion);

    await openai.models
      .list()
      .then(res => {
        const modelNameList = res.data.map(item => item.id);

        if (modelNameList.length === 0) {
          delete list[ip];
          return console.log(ip, null);
        }

        console.log(ip, 'ok', modelNameList);

        if (fs.existsSync('./dist/ip.json')) {
          fs.writeFileSync(
            './dist/ip.json',
            JSON.stringify(
              {
                ...JSON.parse(fs.readFileSync('./dist/ip.json', 'utf-8')),
                [ip]: modelNameList
              },
              null,
              2
            )
          );
        } else {
          fs.writeFileSync(
            './dist/ip.json',
            JSON.stringify(
              {
                [ip]: list[ip]
              },
              null,
              2
            )
          );
        }
      })
      .catch(err => {
        // console.log(err);
        delete list[ip];
        console.log(ip, 'error');
      });
  }

  //   fs.writeFileSync('./dist/ip.json', JSON.stringify(list));
}

async function main() {
  if (!fs.existsSync('./dist/ips.json')) {
    await ip1();
    await ip2();
    fs.writeFileSync('./dist/ips.json', JSON.stringify(list));
  } else {
    list = JSON.parse(fs.readFileSync('./dist/ips.json', 'utf-8'));
  }

  //   console.log(list);
  fs.rmSync('./dist/ip.json', {
    recursive: true,
    force: true
  });
  await aiTest();

  fs.mkdirSync('./build', {
    recursive: true,
    mode: 0o777
  });

  fs.renameSync('./dist/ip.json', './build/ip.json', {
    recursive: true
  });
}

main();
