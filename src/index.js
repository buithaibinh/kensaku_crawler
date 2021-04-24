const puppeteer = require('puppeteer');
const fs = require('fs');

const run = (pagesToScrape) => {
  const base = './results';
  if (fs.existsSync(base)) {
    fs.rmdirSync(base, { recursive: true });
  }
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base);
  }

  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({
        headless: false,
        userDataDir: './data',
        // defaultViewport: { width: width, height: height },
      });

      const page = await browser.newPage();
      // await page.setViewport({ width: 1280, height: 800 });
      // starting page, the site require POST method, So we need to start from this.
      await page.goto(
        'http://www.iryo-kensaku.jp/kanagawa/kensaku/SimpleSearch.aspx?sy=p',
        { waitUntil: 'networkidle0' }
      );

      // submit search condition with default all
      await page.waitForSelector('.SearchTitleLine');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
        page.click('input[type="submit"]'),
        page.waitForSelector(
          '#ctl00_ContentPlaceHolderContents_grvShisetsuIchiran'
        ),
      ]);

      /**
       * page every drugstore.
       * @param {*} index
       * @returns
       */
      const visitLink = async (index = 0) => {
        const links = await page.$$(
          'a[id^="ctl00_ContentPlaceHolderContents_grvShisetsuIchiran_"]'
        );

        if (links[index]) {
          console.log('Clicking ', index);

          await Promise.all([
            // so, start with the first link
            await page.evaluate((element) => {
              element.click();
            }, links[index]),

            // or wait for the post data as well
            await page.waitForNavigation(),
            await page.waitForSelector('#Contents'),
          ]);

          // go to tab3
          await Promise.all([
            // so, start with the first link
            page.click('#ctl00_ContentPlaceHolderContents_btnDetail03'),
            // or wait for the post data as well
            await page.waitForNavigation(),
            await page.waitForSelector('#Contents'),
          ]);

          // store data for parsing (maybe use cheerio)
          const html = await page.$eval('#Contents', (e) => e.outerHTML);
          const url = page.url();
          const urlParams = new URLSearchParams(url);
          const id = urlParams.get('id');
          fs.writeFileSync(`${base}/${id}.html`, html, {
            encoding: 'utf-8',
          });

          // go back and visit next link, back to tab1
          await page.goBack({ waitUntil: 'networkidle0' });

          // back to index
          await page.goBack({ waitUntil: 'networkidle0' });
          return visitLink(index + 1);
        }

        console.log('No links left to click');
      };

      var currentPage = 1;

      const visitPage = async (index = 0) => {
        if (currentPage >= pagesToScrape) {
          console.log('do parsing data');
          await visitLink();
        } else {
          console.log('The page:', currentPage, ' has been parsed. SKIPP');
        }

        const links = await page.$$(
          '#ctl00_ContentPlaceHolderContents_grvShisetsuIchiran > tbody > tr:nth-child(1) > td > table > tbody > tr > td  > a'
        );

        if (links[index]) {
          const nextPage = await links[index].evaluate((el) => el.textContent);
          console.log(
            'parsing current page: ',
            currentPage,
            '| nextPage: ',
            nextPage
          );

          currentPage++;

          await Promise.all([
            // so, start with the first link
            await page.evaluate((element) => {
              element.click();
            }, links[index]),

            // or wait for the post data as well
            await page.waitForNavigation(),
          ]);

          // await page.goBack({ waitUntil: 'networkidle0' });
          // next batch

          if (nextPage === '...') {
            console.log('end 10 page, start new batch');
            return visitPage(2);
          }

          return visitPage(index + 1);
        }
      };

      await visitPage();

      // browser.close();
      return resolve({});
    } catch (e) {
      return reject(e);
    }
  });
};

run(316);
// .then(console.log).catch(console.error);
