require('dotenv').load()
const puppeteer = require('puppeteer')

/**
 * The .env vars
 */
const { USERNAME, PASSWORD, DOMAIN, WINDOW_HEIGHT, WINDOW_WIDTH } = process.env

/**
 * Selectors
 */
const $username = '#member_email'
const $password = '#member_password'
const $loginButton = '.new_member_session input[type="submit"]'
const $coursesWrapper = '[data-section-id="products"]'
const $courseWrapper = '.col-md-12'
const $thumbEl = '.panel--inline .panel__cell:first-of-type img'
const $titleEl = '.panel--inline .panel__cell:nth-child(2) h4 a'
const $descriptionEl = '.panel--inline .panel__cell:nth-child(2) p'
const $courseWrapperSelector = '.panel.syllabus, .col-md-8.main-col, .category-listings.listings-2'
const $courseItemsSelector = '.syllabus__item, .panel-body.post-listing, .category-listing'
const $mediaSelector = ''

const videos = []
let collections = []

/**
 * Launch config
 */
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0 Win64 x64)',
  'AppleWebKit/537.36 (KHTML, like Gecko)',
  'Chrome/63.0.3239.132',
  'Safari/537.36',
]
const windowSize = [WINDOW_WIDTH, WINDOW_HEIGHT]
const fullURL = `http://www.${DOMAIN}`
const launchParams = {
  devtools: true,
  headless: false,
  args: [`--user-agent=${userAgents.join(' ')}`, `--window-size=${windowSize.join(',')}`],
  // slowMo: 10, // slow down by 250ms
}

/**
 * The mapper method for the collection of a courses
 *
 * @param {ElementHandle} courseEl
 * @return {{ thumb:string, title:string, link:string, description:string }}
 */
const coursesMapper = async (courseEl) => {
  const thumbEl = await courseEl.$($thumbEl)
  const titleEl = await courseEl.$($titleEl)
  const descriptionEl = await courseEl.$($descriptionEl)

  const thumb = await thumbEl.getProperty('src')
  const title = await titleEl.getProperty('innerHTML')
  const link = await titleEl.getProperty('href')
  const description = await descriptionEl.getProperty('innerHTML')

  return {
    thumb: await thumb.jsonValue(),
    title: await title.jsonValue(),
    link: await link.jsonValue(),
    description: await description.jsonValue(),
    children: [],
  }
}

/**
 * The mapper method for the items of a course
 *
 * @param {ElementHandle} itemEl
 */
const collectionsMapper = async (itemEl) => {
  const linkEl = await itemEl.$('a')
  const link = await linkEl.getProperty('href')

  return { link: await link.jsonValue() }
}

const isPostPage = (link) => link.match(/\/posts\//)

const parseMedia = async (page, link) => {
  const parentLink = await page.url()

  await page.goto(link)

  try {
    const titleEl = await page.$('h1,h2')
    const title = await titleEl.getProperty('innerHTML')

    videos.push({
      title: await title.jsonValue(),
    })
  }
  catch (error) {
    console.log(error)
  }
}

const parseCollection = async (page, link, { courseIdx, level = 0, childIdx = 0 }) => {
  await page.goto(link)
  const items = await page.$$($courseItemsSelector)
  const urls = await Promise.all(items.map(collectionsMapper))

  collections.push(urls)

  for (const url of urls) {
    if (isPostPage(url.link)) {
      await parseMedia(page, url.link)
    }
    else {
      await parseCollection(page, url.link, { courseIdx, level: level + 1 })
    }
  }
}

const courseWorker = async (browser, { link }, idx) => {
  const page = await browser.newPage()

  await parseCollection(page, link, { courseIdx: idx })

  console.log(videos)
}

/**
 * Browser start
 *
 * @param {Browser}
 */
puppeteer.launch(launchParams).then(async (browser) => {
  const pages = await browser.pages()
  const initPage = pages[0]

  await initPage.goto(`${fullURL}/login`)
  await initPage.type($username, USERNAME, { delay: 2 })
  await initPage.type($password, PASSWORD, { delay: 2 })

  const [el] = await Promise.all([
    initPage.waitForSelector($coursesWrapper),
    initPage.click($loginButton),
  ])

  const coursesEls = await el.$$($courseWrapper)

  collections = await Promise.all(coursesEls.map(coursesMapper))

  let idx = 0

  for (const course of collections) {
    courseWorker(browser, course, idx)
    idx++
  }
})
