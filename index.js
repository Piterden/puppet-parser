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

const collectionsSelector = "//div/a[@id][text()='View Course'] | //div[@class='category-listing']/a[@id] | //div[@class='post-listings listings']/a[@id]"

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
  }
}

/**
 * The mapper method for the items of a course
 *
 * @param {ElementHandle} itemEl
 */
const courseMapper = async (itemEl) => {
  const linkEl = await itemEl.$('a')
  const link = await linkEl.getProperty('href')
  const href = await link.jsonValue()

  const [innerWrapper] = await Promise.all([
    coursePage.waitForSelector($courseWrapperSelector),
    coursePage.goto(href),
  ])

  console.log()
}

const isPostPage = (link) => link.match(/\/posts\//)

const parseMedia = async (page, link) => {
  await page.goto(link)
}

const parseCollection = async (page, link) => {
  await page.goto(link)
  const collections = await page.$x(collectionsSelector)

  console.log(collections)
}

// Object.assign(course, {
//   items: await Promise.all(courseItems.map()),
// })

const courseWorker = async (browser, { link }) => {
  const page = await browser.newPage()

  if (isPostPage(link)) {
    await parseMedia(page, link)
    return
  }

  await parseCollection(page, link)
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
  const courses = await Promise.all(coursesEls.map(coursesMapper))

  for (const course of courses) {
    courseWorker(browser, course)
  }
})
