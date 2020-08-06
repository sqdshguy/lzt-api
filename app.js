/*

  Lolzteam Unofficial API
  by Mrsasha45op
  MIT License

*/


const express = require("express");
const helmet = require("helmet");
const puppeteer = require("puppeteer");
const rateLimit = require("express-rate-limit");
const middlewares = require("./middlewares");
const { parse } = require("node-html-parser");


const app = express();

// Security fixes
app.use(helmet());
app.use(cors())

// Rate limit API
const limiter = rateLimit({
  windowMs: 30 * 1000,
  max: 15,
});


app.get("/", (req, res) => {
  res.send("Coming soon...");
});

let cachedData;
let cacheTime;


app.get("/api/latest", limiter, async (req, res) => {
  // Cache header for browsers
  res.set('Cache-Control', 'public, max-age=300, s-maxage=600') 

  // Manual cache
  if (cacheTime && cacheTime > Date.now() - 30 * 1000) {
    return res.json(cachedData);
  }

  const postJson = [];
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setJavaScriptEnabled(true);

    await page.goto("https://lolz.guru");
    await page.waitForNavigation();

    const content = await page.content();
    await browser.close();


    const parsed = parse(content);
    const posts = parsed.querySelectorAll(".PreviewTooltip");

    for (const post of posts) {
      const title = post.querySelector(".title").querySelector("span").rawText;
      const category = post.querySelector(".threadNode").rawText;
      const authorUsername = post.querySelector(".username").firstChild.rawText;
      const time = post.querySelector(".DateTime").rawText;
      const commentCount = post.querySelector(".discussionListItem--replyCount").rawText;
      const styleElem = post.querySelector(".secondRow").querySelector(".posterDate").querySelector(".username").firstChild;
      const style = styleElem.getAttribute('class');
      const userRole = getRole(style);

      postJson.push({
        title,
        authorUsername,
        category,
        time,
        commentCount,
        userRole
      });
    }
    // Manual cache
    cachedData = postJson;
    cacheTime = Date.now();

    return res.json(postJson);
  } catch (error) {
    return next(error);
  }
});


// First version of getting user roles
function getRole(style) {
  const roleNum = style.replace("style", "");
  if (roleNum >= 25 && roleNum < 1000) {
    return "unik"
  }
  switch (roleNum) {
    case "22":
      return "market_seller";
    case "8":
      return "supreme";
    case "2":
      return "user";
    case "11":
      return "forum_seller";
    case "26":
      return "legend";
    case "21":
      return "user";
    default:
      return "user";
  }
}

// Middlewares
app.use(middlewares.notFound);
app.use(middlewares.errorHandler);


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening for requests on port ${port}`));


