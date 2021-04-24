const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const readFile = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const parser = (html) => {
  const $ = cheerio.load(html);
  const name = $('#ctl00_ContentPlaceHolderContents_ctl45_lblShisetsuName')
    .text()
    .trim()
    .replace('\n', '');
  const nameKana = $(
    '#ctl00_ContentPlaceHolderContents_ctl45_lblShisetsuNameKana'
  )
    .text()
    .trim()
    .replace('\n', '');
  const address = $('#ctl00_ContentPlaceHolderContents_ctl45_lblAddressKana')
    .text()
    .trim()
    .replace('\n', '');
  const tel = $('#ctl00_ContentPlaceHolderContents_ctl45_lblAnnaiTelephoneNo0')
    .text()
    .trim()
    .replace('\n', '');
  const fax = $('#ctl00_ContentPlaceHolderContents_ctl45_lblAnnaiFaxNo')
    .text()
    .trim()
    .replace('\n', '');

  const rows = $('#ctl00_ContentPlaceHolderContents_tblData3 > tbody > tr');

  const data = {
    '名 称':name,
    '名称カナ':nameKana,
    '所在地':address,
    '電話' :tel,
  };

  for (let i = 0; i < rows.length; i++) {
    const current = rows[i];
    const title = $(current)
      .children('td:nth-child(1)')
      .text()
      .trim()
      .replace('\n', '');
    const text = $(current)
      .children('td:nth-child(2)')
      .text()
      .trim()
      .replace('\n', '');

    if (title === '薬局の薬剤師数') {
      // data 5
      const data5 = text
        .replace('常勤薬剤師の人数', '')
        .replace('非常勤薬剤師の人数 ', '')
        .replace(
          '常勤薬剤師数及び非常勤薬剤師数を常勤換算した数との合計数 ',
          ''
        )
        .replace(/人/g, '')
        .replace(/件/g, '')
        .replace(/回/g, '')
        .trim()
        .split(' ');
      const [x1, x2, x3] = data5;
      data['常勤薬剤師の人数'] = x1;
      data['非常勤薬剤師の人数'] = x2;
      data['常勤薬剤師数及び非常勤薬剤師数を常勤換算した数との合計数'] = x3;
    }

    if (title === '処方せんを応需した患者数') {
      // data 6
      data['前年（前年度）の患者数（延べ数）'] = text
        .replace('前年（前年度）の患者数（延べ数）', '')
        .replace(/人/g, '')
        .replace(/件/g, '')
        .replace(/回/g, '')
        .trim()
        .split(' ')[0];
    }

    if (title === '医療を受ける者の居宅等において行う調剤業務') {
      // data 7
      data['前年の延件数'] = text
        .replace('前年の延件数', '')
        .replace(/人/g, '')
        .replace(/件/g, '')
        .replace(/回/g, '')
        .trim();
    }

    if (title === '患者の服薬状況等を医療機関に提供') {
      // data 8
      data['前年の実数'] = text
        .replace('前年の実数', '')
        .replace(/人/g, '')
        .replace(/件/g, '')
        .replace(/回/g, '')
        .trim();
    }

    if (title === '医療安全対策の実施') {
      // data 9
      data['前年の実施件数'] = text
        .replace('副作用等に係る報告の実施件数 前年の実施件数 ', '')
        .replace(/人/g, '')
        .replace(/件/g, '')
        .replace(/回/g, '')
        .trim()
        .split(' ')[0];
    }
  }

  return data;
};

const main = async () => {
  const directoryPath = path.join('./results');
  const files = await new Promise((resolve, reject) => {
    fs.readdir(directoryPath, function (err, files) {
      //handling error
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });

  // console.log(files);
  const tasks = files.map(async (file) => {
    const html = await readFile(`./results/${file}`);
    const data = parser(html);
    // console.log(data);
    return {id: file.replace('.html', ''), ...data};
  });

  const content = await Promise.all(tasks);

  fs.writeFileSync('./outputs/data.json', JSON.stringify(content, null, 2), {
    encoding: 'utf-8',
  });
};

main();
